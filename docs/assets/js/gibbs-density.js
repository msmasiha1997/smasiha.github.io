/**
 * A normalized Gibbs density field, evaluated directly from the toy potential.
 * This is quadrature and rasterization, not a sampling trajectory. At zero
 * temperature the limiting law has an arc-length density and no area density.
 */
import { createDensityModel, createDensityReference } from './gibbs-curves.js';

export const DENSITY_VIEW = Object.freeze({
  xMin: -2.8, xMax: 2.8, yMin: -2.8, yMax: 2.8,
  left: 58, top: 20, size: 480, rasterSize: 720,
  width: 600, height: 570,
});
export const DENSITY_SCALE = Object.freeze({
  color: Object.freeze([45, 109, 177]),
  areaOffset: .02, areaMaximum: 4, arcMaximum: .4, arcScale: 'sqrt',
  areaTicks: Object.freeze([0, .1, .5, 4]),
  arcTicks: Object.freeze([0, .2, .4]),
});
const TAU = Math.PI * 2;
const SVG_NS = 'http://www.w3.org/2000/svg';
const DURATION = 7500;
const MANUAL_TEMPERATURES = [.3, .15, .06, .02, .005, 0];
const areaDenominator = Math.log1p(DENSITY_SCALE.areaMaximum / DENSITY_SCALE.areaOffset);
const geometryCache = new Map();
const sceneCache = new Map();
const controllers = new WeakMap();

/** Fixed nonlinear display scale; it never changes the probability density. */
export function densityOpacity(density) {
  return Math.min(1, Math.max(0, Math.log1p(density / DENSITY_SCALE.areaOffset) / areaDenominator));
}

/** A separate square-root color scale keeps low line densities visible. */
export function limitingOpacity(density) {
  return Math.sqrt(Math.min(1, Math.max(0, density / DENSITY_SCALE.arcMaximum)));
}

export function densityMetadata() {
  return {
    formula: 'rho_lambda(x) = exp(-g(x)/lambda) / Z_lambda',
    partitionFunction: 'Z_lambda = pi * baseA * baseB * integral_0^infinity exp(-g(q)/lambda) dq',
    areaScale: 'min(1, log1p(rho / 0.02) / log1p(4 / 0.02))',
    limitScale: 'sqrt(min(1, arcLengthDensity / 0.4))',
    normalization: 'Over the entire plane; never renormalized to the viewing window',
    zeroTemperature: 'Singular law on the solution curve, displayed using density per unit arc length',
    w1UpperBound: 'Shear Lipschitz constant times the unsheared same-angle coupling cost; a bound on W1, not an exact coupling cost or W1',
    view: DENSITY_VIEW,
    scale: DENSITY_SCALE,
  };
}

const pixelPoint = point => ({
  x: DENSITY_VIEW.left + (point.x - DENSITY_VIEW.xMin) * DENSITY_VIEW.size / (DENSITY_VIEW.xMax - DENSITY_VIEW.xMin),
  y: DENSITY_VIEW.top + (DENSITY_VIEW.yMax - point.y) * DENSITY_VIEW.size / (DENSITY_VIEW.yMax - DENSITY_VIEW.yMin),
});
const pointText = point => {
  const p = pixelPoint(point);
  return `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
};

function geometryFor(example) {
  if (geometryCache.has(example)) return geometryCache.get(example);
  const model = createDensityModel(example);
  const pixels = DENSITY_VIEW.rasterSize;
  const dx = (DENSITY_VIEW.xMax - DENSITY_VIEW.xMin) / pixels;
  const dy = (DENSITY_VIEW.yMax - DENSITY_VIEW.yMin) / pixels;
  const potential = new Float64Array(pixels * pixels);
  for (let row = 0; row < pixels; row += 1) {
    const y = DENSITY_VIEW.yMax - (row + .5) * dy;
    for (let column = 0; column < pixels; column += 1) {
      const x = DENSITY_VIEW.xMin + (column + .5) * dx;
      potential[row * pixels + column] = model.potential(x, y);
    }
  }
  const curve = model.curve(480).map(pointText).join(' ');
  // Four edges per segment preserve the same 480-edge closed curve.
  const limitSegments = Array.from({ length: 120 }, (_, index) => {
    const angle = TAU * (index + .5) / 120;
    const density = model.limitingArcDensity(angle);
    const points = Array.from({ length: 5 }, (_, j) => model.point(TAU * (index * 4 + j) / 480));
    return { points: points.map(pointText).join(' '), density, opacity: limitingOpacity(density) };
  });
  const result = {
    model, potential, curve, limitSegments, pixelArea: dx * dy,
    linePeak: model.linePeak,
  };
  geometryCache.set(example, result);
  return result;
}

/**
 * Build a browser-renderable scene. Positive-temperature normalization comes
 * from the existing radial quadrature. visibleMass is a midpoint-pixel check
 * of the mass inside the fixed window; it is never a normalization factor.
 */
export function createDensityScene(example = 'wavy', temperature = .3) {
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > .3 || (temperature > 0 && temperature < .001)) {
    throw new RangeError('Use zero for the limiting law, or temperature between 0.001 and 0.3.');
  }
  const key = `${example}:${temperature}`;
  if (sceneCache.has(key)) return sceneCache.get(key);
  const geometry = geometryFor(example);
  const reference = createDensityReference(geometry.model, temperature);
  let image = null;
  let peak = null;
  let normalization = null;
  let visibleMass = 1;
  if (temperature) {
    normalization = Math.PI * geometry.model.baseA * geometry.model.baseB * reference.normalization;
    peak = 1 / normalization; // g is exactly zero on the minimizer curve.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = DENSITY_VIEW.rasterSize;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas rendering is unavailable.');
    const frame = context.createImageData(canvas.width, canvas.height);
    let sum = 0;
    for (let i = 0; i < geometry.potential.length; i += 1) {
      const density = Math.exp(-geometry.potential[i] / temperature) / normalization;
      sum += density;
      const offset = 4 * i;
      frame.data[offset] = DENSITY_SCALE.color[0];
      frame.data[offset + 1] = DENSITY_SCALE.color[1];
      frame.data[offset + 2] = DENSITY_SCALE.color[2];
      frame.data[offset + 3] = Math.round(255 * densityOpacity(density));
    }
    visibleMass = sum * geometry.pixelArea;
    context.putImageData(frame, 0, 0);
    image = canvas.toDataURL('image/png');
  }
  const scene = {
    image, curve: geometry.curve, limitSegments: geometry.limitSegments,
    peak, linePeak: geometry.linePeak, w1UpperBound: reference.couplingUpperBound,
    temperature, example, normalization,
    radialNormalization: reference.normalization,
    tailMassBound: reference.tailMassBound, visibleMass,
    mode: temperature ? 'area' : 'arc',
  };
  // A short cache helps slider revisits without accumulating hundreds of PNGs.
  if (sceneCache.size >= 12) sceneCache.delete(sceneCache.keys().next().value);
  sceneCache.set(key, scene);
  return scene;
}

/** Native controls and a separate, pauseable cooling clock for this figure. */
export function initGibbsDensity(root) {
  if (!root) return null;
  if (controllers.has(root)) return controllers.get(root);
  const $ = selector => root.querySelector(selector);
  const image = $('[data-density-image]');
  const limit = $('[data-density-limit]');
  const solution = $('[data-density-solution]');
  const exampleControl = $('[data-example]');
  const temperatureControl = $('[data-temperature]');
  const run = $('[data-run]');
  const reset = $('[data-reset]');
  const controls = [...root.querySelectorAll('[data-experiment-controls]')];
  if (!image || !limit || !solution || !exampleControl || !temperatureControl || !run || !reset || !controls.length) return null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const put = (selector, text) => { const element = $(selector); if (element) element.textContent = text; };
  const status = text => put('[data-experiment-status]', text);
  const visible = (element, show) => {
    if (!element) return;
    element.style.display = show ? '' : 'none';
    element.toggleAttribute('hidden', !show);
    element.setAttribute('visibility', show ? 'visible' : 'hidden');
    element.setAttribute('aria-hidden', String(!show));
  };
  let example = exampleControl.value || 'wavy';
  let temperature = Number(temperatureControl.value || .3);
  let scene, running = false, frame = 0, started = 0, elapsed = 0;
  let coolingStart = temperature, limitExample = null, printing = false;
  let failed = false;

  function labels() {
    root.dataset.ready = failed ? 'false' : 'true';
    root.dataset.state = failed ? 'unavailable' : running ? 'running' : temperature === 0 ? 'complete' : elapsed ? 'paused' : 'ready';
    root.dataset.temperature = String(temperature);
    root.dataset.example = example;
    root.dataset.densityMode = temperature ? 'area' : 'arc';
    temperatureControl.value = String(temperature);
    temperatureControl.setAttribute('aria-valuetext', temperature === 0 ? 'zero: limiting law on the curve' : `temperature ${temperature.toFixed(3)}`);
    put('[data-temperature-value]', temperature === 0 ? 'λ = 0 · limiting law' : `λ = ${temperature.toFixed(3)}`);
    run.textContent = reduced.matches
      ? temperature === 0 ? 'Reset cooling' : 'Cool one step'
      : running ? 'Pause' : temperature === 0 ? 'Replay cooling' : elapsed ? 'Resume cooling' : 'Cool toward the limit';
    put('[data-progress]', temperature === 0 ? 'Limiting law on S' : running ? 'Cooling · fixed color scale' : reduced.matches ? 'Reduced motion · manual steps' : 'Press play or adjust λ');
  }

  function draw() {
    const next = createDensityScene(example, temperature);
    if (limitExample !== example) {
      const fragment = document.createDocumentFragment();
      for (const segment of next.limitSegments) {
        const line = document.createElementNS(SVG_NS, 'polyline');
        line.setAttribute('points', segment.points);
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', `rgb(${DENSITY_SCALE.color.join(',')})`);
        line.setAttribute('stroke-width', '6');
        line.setAttribute('stroke-linecap', 'butt');
        line.setAttribute('stroke-linejoin', 'round');
        line.setAttribute('stroke-opacity', segment.opacity.toFixed(6));
        line.dataset.arcDensity = segment.density.toPrecision(9);
        fragment.append(line);
      }
      limit.replaceChildren(fragment);
      limitExample = example;
    }
    solution.setAttribute('points', next.curve);
    if (next.image) image.setAttribute('href', next.image);
    else image.removeAttribute('href');
    visible(image, Boolean(temperature));
    visible(solution, Boolean(temperature));
    visible(limit, !temperature);
    visible($('[data-density-legend-area]'), Boolean(temperature));
    visible($('[data-density-legend-line]'), !temperature);
    put('[data-w1-bound]', next.w1UpperBound.toFixed(3));
    put('[data-density-peak]', temperature ? next.peak.toFixed(3) : 'Not defined');
    const title = $('[data-density-title]') || root.querySelector('svg title');
    if (title) title.textContent = temperature
      ? `Two-dimensional Gibbs density at λ = ${temperature.toFixed(3)}`
      : 'Limiting probability law on the solution curve';
    put('[data-density-note]', temperature
      ? 'A density over the plane. More saturated blue means higher density; the dashed curve marks the solution set S.'
      : 'The limiting law lies on S. Color intensity now represents density per unit arc length, using the separate line-density scale.');
    put('[data-density-key]', temperature ? 'Dashed curve: exact minimizers S' : 'Colored curve: limiting law on S');
    put('[data-density-desc]', temperature
      ? `Gibbs probability density for a fixed ${example} loop at temperature ${temperature.toFixed(3)}. The density is normalized over the entire plane and shown with one fixed nonlinear color scale. Its maximum is ${next.peak.toFixed(3)} per unit area. The dashed curve is the set of exact minimizers. As temperature decreases, probability concentrates around that curve.`
      : `The zero-temperature limiting law for the fixed ${example} loop is supported on the solution curve S. It has no density per unit area. The colored curve instead shows density per unit arc length, with maximum approximately ${next.linePeak.toFixed(3)}. The line density varies along the loop; the parameter along the original reference circle is uniform.`);
    scene = next;
    labels();
  }

  function pause(message) {
    if (running) elapsed = Math.min(DURATION, performance.now() - started);
    running = false;
    cancelAnimationFrame(frame);
    labels();
    if (message) status(message);
  }

  function unavailable() {
    running = false;
    failed = true;
    cancelAnimationFrame(frame);
    controls.forEach(group => { group.hidden = true; });
    root.dataset.ready = 'false';
    root.dataset.state = 'unavailable';
    status('Interactive controls are unavailable. The current density figure remains visible.');
  }

  const guarded = action => (...args) => {
    if (failed) return;
    try { return action(...args); } catch { unavailable(); }
  };

  function setTemperature(value) {
    if (!Number.isFinite(value)) throw new RangeError('Temperature must be finite.');
    temperature = Math.max(0, Math.min(.3, Math.round(value * 1000) / 1000));
    elapsed = 0;
    coolingStart = temperature;
    draw();
  }

  const tick = guarded(now => {
    if (!running || printing) return;
    elapsed = Math.min(DURATION, now - started);
    const progress = elapsed / DURATION;
    const next = progress === 1 ? 0 : Math.max(.001, Math.round(coolingStart * (1 - progress) ** 2 * 1000) / 1000);
    if (next !== temperature) {
      temperature = next;
      draw();
    }
    if (progress === 1) {
      running = false;
      labels();
      status('Cooling complete. At λ = 0, the limiting law is supported on the solution curve.');
      return;
    }
    frame = requestAnimationFrame(tick);
  });

  function restart() {
    pause();
    setTemperature(.3);
    status('Reset to λ = 0.300. The selected shape is unchanged.');
  }

  try { draw(); } catch { unavailable(); return null; }
  run.addEventListener('click', guarded(() => {
    if (printing) return;
    if (running) { pause(`Paused at λ = ${temperature.toFixed(3)}.`); return; }
    if (reduced.matches) {
      const next = temperature === 0 ? .3 : MANUAL_TEMPERATURES.find(value => value < temperature - 1e-10) ?? 0;
      setTemperature(next);
      status(temperature ? `Temperature ${temperature.toFixed(3)}. The fixed color scale is unchanged.` : 'At λ = 0, the line-density legend describes the limiting law on the curve.');
      return;
    }
    if (temperature === 0) setTemperature(.3);
    if (elapsed === 0) coolingStart = temperature;
    started = performance.now() - elapsed;
    running = true;
    labels();
    status('Cooling toward the limiting law. Press Pause to inspect any temperature.');
    frame = requestAnimationFrame(tick);
  }));
  reset.addEventListener('click', guarded(() => { if (!printing) restart(); }));
  temperatureControl.addEventListener('input', guarded(() => {
    if (printing) return;
    const requested = Number(temperatureControl.value);
    pause();
    setTemperature(requested);
    status(temperature ? `Temperature set to ${temperature.toFixed(3)}.` : 'Showing the limiting law on the curve, with density per unit arc length.');
  }));
  exampleControl.addEventListener('change', guarded(() => {
    if (printing) return;
    const requested = exampleControl.value;
    pause();
    example = requested;
    elapsed = 0;
    coolingStart = temperature;
    draw();
    status(`Showing the ${example} loop at the same temperature.`);
  }));
  reduced.addEventListener('change', guarded(() => pause(reduced.matches ? 'Reduced motion: cooling advances one step per press.' : 'Automatic playback is available. Press play to begin.')));
  document.addEventListener('visibilitychange', guarded(() => { if (document.hidden) pause('Paused while the page is hidden.'); }));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(guarded(entries => {
      if (!entries[0].isIntersecting && running) pause('Paused while the figure is outside the viewing area.');
    }));
    observer.observe(root);
  }
  window.addEventListener('beforeprint', guarded(() => { pause(); printing = true; }));
  window.addEventListener('afterprint', guarded(() => { printing = false; labels(); }));
  controls.forEach(group => { group.hidden = false; });
  status('Ready. Adjust λ or start cooling to see the distribution change.');
  const controller = {
    getState: () => ({
      example, temperature, running, elapsed, mode: scene.mode,
      peak: scene.peak, w1UpperBound: scene.w1UpperBound, visibleMass: scene.visibleMass,
      reducedMotion: reduced.matches, printing, ready: !failed,
    }),
    pause: guarded(pause),
    reset: guarded(restart),
  };
  controllers.set(root, controller);
  return controller;
}
