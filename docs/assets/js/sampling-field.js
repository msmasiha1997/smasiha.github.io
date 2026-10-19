/**
 * Presentation-only Gibbs target for the ULA demonstrations.
 *
 * This is the normalized analytic target evaluated on a Cartesian grid, not a
 * particle histogram or a simulation output. The global partition function is
 * pi * baseA * baseB * reference.normalization. Never renormalize the density
 * to the visible window: probability outside the frame remains outside it.
 * The sampler and the underlying loss are deliberately untouched.
 */

export const FIELD_SCALE = Object.freeze({
  bounds: Object.freeze({ xMin: -3.4, xMax: 3.4, yMin: -3.4, yMax: 3.4 }),
  color: Object.freeze([45, 109, 177]),
  offset: 0.02,
  maximum: 1.5,
  maximumOpacity: 0.65,
  ticks: Object.freeze([0, 0.1, 0.5, 1.5]),
  mapping: 'log1p',
});

/** Fixed across examples, theta, schedules, and displayed frames. */
export function densityOpacity(density) {
  if (!Number.isFinite(density) || density < 0) {
    throw new RangeError('A density must be finite and nonnegative.');
  }
  const value = Math.min(density, FIELD_SCALE.maximum);
  return FIELD_SCALE.maximumOpacity * Math.log1p(value / FIELD_SCALE.offset)
    / Math.log1p(FIELD_SCALE.maximum / FIELD_SCALE.offset);
}

/**
 * A transparent PNG on [-3.4, 3.4]^2. `peak` is the global density maximum,
 * attained wherever g=0. `visibleMass` is a midpoint-quadrature estimate of
 * the probability inside this fixed window, not a normalization factor.
 * Imports and scale metadata are usable without a DOM; rendering needs one.
 */
export function renderSamplingField(model, reference, size = 420) {
  if (!Number.isInteger(size) || size < 16 || size > 2048) {
    throw new RangeError('Use an integer raster size between 16 and 2048.');
  }
  if (!(reference.temperature > 0) || !Number.isFinite(reference.temperature)
      || !(reference.normalization > 0) || !Number.isFinite(reference.normalization)
      || !(model.baseA > 0) || !(model.baseB > 0)) {
    throw new RangeError('A positive-temperature Gibbs reference is required.');
  }
  const partition = Math.PI * model.baseA * model.baseB * reference.normalization;
  const peak = 1 / partition;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The browser could not create a density canvas.');
  const image = context.createImageData(size, size);
  const { xMin, xMax, yMin, yMax } = FIELD_SCALE.bounds;
  const dx = (xMax - xMin) / size;
  const dy = (yMax - yMin) / size;
  let densitySum = 0;
  for (let row = 0; row < size; row += 1) {
    const y = yMax - (row + 0.5) * dy;
    for (let column = 0; column < size; column += 1) {
      const x = xMin + (column + 0.5) * dx;
      const density = Math.exp(-model.potential(x, y) / reference.temperature) / partition;
      densitySum += density;
      const index = (row * size + column) * 4;
      image.data[index] = FIELD_SCALE.color[0];
      image.data[index + 1] = FIELD_SCALE.color[1];
      image.data[index + 2] = FIELD_SCALE.color[2];
      image.data[index + 3] = Math.round(255 * densityOpacity(density));
    }
  }
  context.putImageData(image, 0, 0);
  return {
    dataUrl: canvas.toDataURL('image/png'),
    visibleMass: densitySum * dx * dy,
    peak,
    scaleMaximum: FIELD_SCALE.maximum,
  };
}

/** Optional matching numeric key; its ramp is linear in displayed opacity. */
export function fieldLegendMarkup() {
  const color = FIELD_SCALE.color.join(',');
  const ticks = FIELD_SCALE.ticks.map(value => {
    const position = 100 * densityOpacity(value) / FIELD_SCALE.maximumOpacity;
    return `<span class="sampling-density-tick" style="--tick-position:${position.toFixed(3)}%">${value}</span>`;
  }).join('');
  return `<div class="sampling-density-key" aria-label="Gibbs target probability density per unit area; fixed nonlinear color scale from zero to ${FIELD_SCALE.maximum}"><span class="sampling-density-label">Target density</span><span class="sampling-density-ramp" style="--density-ramp:linear-gradient(to right,rgba(${color},0),rgba(${color},${FIELD_SCALE.maximumOpacity}))" aria-hidden="true"></span><span class="sampling-density-ticks" aria-hidden="true">${ticks}</span></div>`;
}
