/**
 * A linked geometric overview of the toy family used by the ULA experiment.
 * This is an oblique projection of (theta, x1, x2), not a sampler or a loss
 * surface. Every displayed slice is obtained from the numerical model.
 */
import { createModel } from './ula-model.js';

const TITLE_ID = 'sampling-family-geometry-title';
const DESCRIPTION_ID = 'sampling-family-geometry-description';
const SLICE_COUNT = 9;
const CURVE_POINTS = 160;

// Fixed linear projection: theta is the receding axis; x1 and x2 retain the
// same scale for every slice. Parameter changes never reframe the overview.
function project(point, theta) {
  return {
    x: 118 + 50 * point.x + 94 * theta,
    y: 191 - 48 * point.y - 50 * theta,
  };
}

function pathFor(model, theta) {
  return model.curve(CURVE_POINTS).map((point, index) => {
    const projected = project(point, theta);
    return `${index ? 'L' : 'M'}${projected.x.toFixed(2)},${projected.y.toFixed(2)}`;
  }).join(' ') + ' Z';
}

/** Return a complete, accessible SVG for the single family experiment. */
export function familyGeometryMarkup(model, theta = model?.theta) {
  if (!model || typeof model.curve !== 'function' || !Number.isFinite(theta)) {
    throw new TypeError('Pass the current sampling model and a finite theta.');
  }
  const parameter = Math.max(0, Math.min(1, theta));
  const geometry = model.example === 'circle' ? 'circular' : 'elliptical';
  const slices = Array.from({ length: SLICE_COUNT }, (_, index) => {
    const value = index / (SLICE_COUNT - 1);
    const boundary = index === 0 || index === SLICE_COUNT - 1;
    return `<path class="family-geometry-slice${boundary ? ' family-geometry-boundary' : ''}" data-family-slice="${value.toFixed(3)}" d="${pathFor(createModel(model.example, value), value)}"/>`;
  }).reverse().join('\n');
  return `<svg class="family-geometry-chart" viewBox="0 0 360 340" role="img" aria-labelledby="${TITLE_ID} ${DESCRIPTION_ID}" data-family-geometry-example="${model.example}" data-family-geometry-theta="${parameter.toFixed(2)}">
  <title id="${TITLE_ID}">The family of minimizer sets, with theta ${parameter.toFixed(2)} selected</title>
  <desc id="${DESCRIPTION_ID}">An oblique geometric view of nine ${geometry} minimizer sets for theta from zero to one. The emphasized curve is the current set at theta ${parameter.toFixed(2)}. The receding coordinate is the parameter theta, not time or loss. Each slice uses the same coordinate scale. Sampling takes place in the separate two-dimensional view at the selected, fixed theta.</desc>
  <g aria-hidden="true">
    <path class="family-geometry-key" d="M18 24H43"/>
    <text class="family-geometry-selected-label" x="52" y="29">Selected S(θ) · θ = ${parameter.toFixed(2)}</text>
    <g class="family-geometry-context">${slices}</g>
    <path class="family-geometry-active" data-family-active d="${pathFor(model, parameter)}"/>
    <g class="family-geometry-coordinate-system">
      <path class="family-geometry-axis" d="M25 308H92M25 308V250"/>
      <path class="family-geometry-parameter-axis" d="M25 308L119 258"/>
      <path class="family-geometry-axis-tip" d="M86 305L92 308L86 311M22 256L25 250L28 256"/>
      <path class="family-geometry-parameter-tip" d="M111 259L119 258L115 265"/>
      <text class="family-geometry-axis-label" x="101" y="313">x₁</text>
      <text class="family-geometry-axis-label" x="25" y="239" text-anchor="middle">x₂</text>
      <text class="family-geometry-axis-label" x="87" y="295">θ</text>
      <text class="family-geometry-endpoint" x="17" y="335">0</text>
      <text class="family-geometry-endpoint" x="130" y="261">1</text>
    </g>
    <text class="family-geometry-caption" x="176" y="283">One slice per parameter</text>
    <text class="family-geometry-caption" x="176" y="304">θ is not time</text>
  </g>
</svg>`;
}

/** Update the overview when the controller changes its selected model. */
export function initFamilyGeometry(container) {
  if (!container) return null;
  return {
    update(model, theta = model.theta) {
      container.innerHTML = familyGeometryMarkup(model, theta);
    },
  };
}
