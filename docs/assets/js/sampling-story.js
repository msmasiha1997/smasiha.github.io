import { createModel, createEnsemble, seededRandom, gaussianRandom, advanceULA } from './ula-model.js';
import { createGibbsReference, distributionDiagnostics } from './gibbs-reference.js';
import { initNormalRise } from './normal-rise.js';
import { initGibbsDensity } from './gibbs-density.js?v=20261019-curves';
import { renderSamplingField } from './sampling-field.js';
import { initFamilyGeometry } from './sampling-family-geometry.js';

initNormalRise(document.getElementById('normal-rise'));
initGibbsDensity(document.getElementById('fixed-gibbs-experiment'));

const PRESETS = {
  warm: { temperature: .30, h: .020, budget: 6000 },
  medium: { temperature: .06, h: .010, budget: 24000 },
  cold: { temperature: .01, h: .005, budget: 120000 },
};
const SVG_NS = 'http://www.w3.org/2000/svg';
const xPixel = x => 239 + x * 362 / 6.8;
const yPixel = y => 201 - y * 362 / 6.8;
const curvePoints = model => model.curve().map(p => `${xPixel(p.x).toFixed(2)},${yPixel(p.y).toFixed(2)}`).join(' ');
const format = value => value.toLocaleString('en-US');

/** Independent figure controllers. Numerical references never drive ULA updates. */
export function initSamplingExperiment(root) {
  if (!root || root.dataset.ready === 'true') return null;
  const $ = selector => root.querySelector(selector);
  const isULA = root.dataset.samplingExperiment === 'ula';
  const family = root.dataset.family === 'true';
  const solutionLabel = family ? 'S(θ)' : 'S';
  const primary = $('[data-plot="primary"]');
  const comparison = $('[data-plot="reference"]');
  const run = $('[data-run]');
  const reset = $('[data-reset]');
  const sweep = $('[data-sweep]');
  const familyGeometry = initFamilyGeometry($('[data-family-geometry]'));
  if (!primary || !comparison || !run || !reset) return null;
  const count = Math.max(16, Math.min(2048, Number(root.dataset.particleCount) || 256));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const put = (selector, value) => { const element = $(selector); if (element) element.textContent = value; };
  const status = message => put('[data-experiment-status]', message);
  let example = $('[data-example]')?.value || 'ellipse';
  let theta = Number($('[data-theta]')?.value ?? .5);
  let preset = $('[data-preset]')?.value || 'medium';
  let schedule = PRESETS[preset] || PRESETS.medium;
  let temperature = isULA ? schedule.temperature : Number($('[data-temperature]')?.value ?? .3);
  let model, reference, particles, normal, previousModel = null;
  let steps = 0, goal = schedule.budget, history = [];
  let running = false, frame = 0, lastTime = 0, remainder = 0;
  let coolingStart = temperature, coolingElapsed = 0;
  let lastMeasured = 0, diagnostic = null, comparisonOutside = 0;
  let sweeping = false, sweepFrame = 0, sweepStart = 0, sweepOrigin = 0;
  // Record actual chain positions at a deterministic interval, independent of FPS.
  // The displayed segments join stored iterates; they do not smooth or drive ULA.
  const trailIndices = [0, 42, 85, 128, 170, 213].filter(i => i < count);
  let trails = [], lastRecorded = 0;
  const trailGroup = primary.querySelector('[data-trails]');
  const trailPaths = trailIndices.map(() => {
    const path = document.createElementNS(SVG_NS, 'polyline');
    return path;
  });
  trailGroup?.replaceChildren(...trailPaths);
  const circleSets = new Map();

  for (const plot of [primary, comparison]) {
    const group = plot.querySelector('[data-particles]');
    const circles = [];
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('r', '2.6'); fragment.append(circle); circles.push(circle);
      if (plot === primary && trailIndices.includes(i)) circle.classList.add('tracked-chain');
    }
    group.replaceChildren(fragment); circleSets.set(plot, circles);
  }

  function drawCloud(plot, cloud) {
    let outside = 0;
    circleSets.get(plot).forEach((circle, i) => {
      const p = cloud[i];
      circle.setAttribute('cx', xPixel(p.x).toFixed(3));
      circle.setAttribute('cy', yPixel(p.y).toFixed(3));
      if (Math.abs(p.x) > 3.4 || Math.abs(p.y) > 3.4) outside += 1;
    });
    return outside;
  }
  function drawGeometry() {
    for (const plot of [primary, comparison]) {
      plot.querySelector('[data-solution]')?.setAttribute('points', curvePoints(model));
      plot.querySelector('[data-previous]')?.setAttribute('points', family && previousModel && plot === primary ? curvePoints(previousModel) : '');
    }
    if ($('[data-previous-key]')) $('[data-previous-key]').hidden = !previousModel;
    familyGeometry?.update(model, theta);
  }
  function clearTrails() {
    trails = trailIndices.map(i => [{ ...particles[i] }]); lastRecorded = 0;
    drawTrails();
  }
  function recordTrails() {
    trailIndices.forEach((i, j) => {
      trails[j].push({ ...particles[i] });
      if (trails[j].length > 24) trails[j].shift();
    });
    lastRecorded = steps;
  }
  function drawTrails() {
    trailPaths.forEach((path, i) => path.setAttribute('points', (trails[i] || []).map(p => `${xPixel(p.x).toFixed(3)},${yPixel(p.y).toFixed(3)}`).join(' ')));
  }
  function showOutside(primaryOutside) {
    const element = $('[data-outside]');
    if (!element) return;
    element.hidden = primaryOutside + comparisonOutside === 0;
    element.textContent = `${primaryOutside} ULA samples and ${comparisonOutside} independent reference points are outside the viewing window. They remain included in the computation.`;
  }
  function describePlots() {
    const geometry = example === 'circle' ? 'circular' : 'elliptical';
    const parameterDescription = family ? `theta ${theta.toFixed(2)}, ` : '';
    const primaryTitle = primary.querySelector('title');
    const referenceTitle = comparison.querySelector('title');
    const primaryDescription = primary.querySelector('desc');
    const referenceDescription = comparison.querySelector('desc');
    if (primaryTitle) primaryTitle.textContent = `${isULA ? 'ULA particles' : 'Gibbs reference'} for a ${family ? 'parameter-dependent' : 'fixed'} ${geometry} solution set`;
    if (referenceTitle) referenceTitle.textContent = `${isULA ? 'Numerical Gibbs target' : 'Limiting distribution'} for the ${geometry} solution set`;
    if (primaryDescription) primaryDescription.textContent = isULA
      ? `${count} actual ULA particles after ${steps} steps at ${parameterDescription}temperature ${temperature} and step size ${schedule.h}, over the normalized Gibbs density. Six short paths join recorded iterates, sampled every ten updates. Exact minimizers are shown only for explanation and diagnostics. Mean distance ${diagnostic?.meanDistance.toFixed(3) ?? 'not yet measured'}.`
      : `${count} directly transformed reference draws at ${parameterDescription}temperature ${temperature}. Each displayed cloud represents the Gibbs law at its shown temperature.`;
    if (referenceDescription) referenceDescription.textContent = isULA
      ? `${count} independent reference draws from the numerically computed Gibbs target at temperature ${temperature}. They are not ULA output. Both panels use the same coordinate scale.`
      : `${count} reference points drawn directly from the limiting law supported on the ${example}. The paired random numbers make temperature changes visually comparable.`;
  }
  function updateLabels() {
    root.dataset.steps = String(steps);
    root.dataset.temperature = String(temperature);
    root.dataset.theta = String(theta);
    root.dataset.h = isULA ? String(schedule.h) : '';
    root.dataset.budget = isULA ? String(goal) : '';
    root.dataset.sweeping = String(sweeping);
    root.dataset.state = running ? 'running' : isULA ? (steps >= goal ? 'complete' : steps ? 'paused' : 'ready') : (temperature === 0 ? 'complete' : 'paused');
    put('[data-theta-value]', `θ = ${theta.toFixed(2)}`);
    put('[data-current-slice]', `Current target · θ = ${theta.toFixed(2)}`);
    put('[data-sampling-phase]', sweeping ? 'Moving θ · ULA paused' : running ? `${family ? 'θ fixed · ' : ''}ULA running` : steps >= goal ? 'Batch complete' : steps ? 'ULA paused' : 'Ready to sample');
    $('[data-run-progress]')?.setAttribute('style', `--run-progress: ${Math.min(1, steps / goal) * 100}%`);
    if (sweep) sweep.textContent = reduced.matches ? 'Next θ' : sweeping ? 'Pause θ sweep' : 'Sweep θ';
    $('[data-theta]')?.setAttribute('aria-valuetext', `theta ${theta.toFixed(2)}`);
    put('[data-temperature-value]', temperature === 0 ? 'λ = 0 · limiting law' : `λ = ${temperature.toFixed(3)}`);
    if ($('[data-temperature]')) {
      $('[data-temperature]').value = String(temperature);
      $('[data-temperature]').setAttribute('aria-valuetext', temperature === 0 ? 'zero: limiting distribution' : `temperature ${temperature.toFixed(3)}`);
    }
    if (isULA) {
      const manualBatch = Math.ceil(schedule.budget / 12);
      run.textContent = reduced.matches ? `Advance ${format(manualBatch)} steps` : running ? 'Pause' : steps >= goal ? 'Run another batch' : steps ? 'Resume ULA' : 'Run ULA';
      put('[data-progress]', `${format(steps)} / ${format(goal)} steps per chain`);
      put('[data-parameters]', `${family ? `${example === 'ellipse' ? 'Ellipse' : 'Circle'} · shared across θ · ` : ''}λ = ${temperature.toFixed(2)} · h = ${schedule.h.toFixed(3)} · ${format(schedule.budget)} steps per run · ${format(count)} chains`);
      put('[data-trace-end]', format(goal));
    } else {
      run.textContent = reduced.matches ? (temperature === 0 ? 'Reset cooling' : 'Cool one step') : running ? 'Pause' : temperature === 0 ? 'Replay cooling' : 'Cool toward the limit';
      put('[data-progress]', temperature === 0 ? `Limiting law on ${solutionLabel}` : 'Changing the target distribution');
      put('[data-parameters]', `${format(count)} paired reference draws · direct numerical Gibbs calculation`);
    }
    put('[data-motion-note]', reduced.matches ? 'Reduced motion: updates occur in manual batches.' : 'Playback starts only when you press the button.');
  }
  function pause(message) {
    sweeping = false; cancelAnimationFrame(sweepFrame); sweepStart = 0;
    running = false; cancelAnimationFrame(frame); lastTime = 0; remainder = 0;
    updateLabels(); if (message) status(message);
  }
  function redrawTrace() {
    const trace = $('[data-error-trace]');
    if (trace) trace.setAttribute('points', history.map(item => `${24 + 280 * item.steps / goal},${90 - 80 * item.value}`).join(' '));
  }
  function measure() {
    diagnostic = distributionDiagnostics(particles, model, reference);
    history.push({ steps, value: diagnostic.binTV });
    if (history.length > 250) history = history.filter((_, index) => index % 2 === 0 || index === history.length - 1);
    put('[data-discrepancy]', diagnostic.binTV.toFixed(3));
    put('[data-distance]', diagnostic.meanDistance.toFixed(3));
    lastMeasured = steps; redrawTrace(); describePlots();
  }
  function updateReference() {
    reference = createGibbsReference(model, temperature);
    const densityImage = primary.querySelector('[data-sampling-field]');
    if (densityImage) {
      const field = renderSamplingField(model, reference);
      densityImage.setAttribute('href', field.dataUrl);
      densityImage.dataset.visibleMass = String(field.visibleMass);
    }
    const targetPoints = isULA ? reference.points(count, 9173) : createGibbsReference(model, 0).points(count, 9173);
    comparisonOutside = drawCloud(comparison, targetPoints);
    if (isULA) {
      const referenceDiagnostic = distributionDiagnostics(targetPoints, model, reference);
      put('[data-reference-discrepancy]', referenceDiagnostic.binTV.toFixed(3));
    } else {
      particles = reference.points(count, 9173);
      showOutside(drawCloud(primary, particles));
      put('[data-coupling]', reference.couplingDistance.toFixed(3));
      describePlots();
    }
    drawGeometry(); updateLabels();
  }
  function restart(message) {
    pause(); previousModel = null; model = createModel(example, theta);
    if (isULA) {
      schedule = PRESETS[preset] || PRESETS.medium; temperature = schedule.temperature;
      particles = createEnsemble(model, count, 2424); normal = gaussianRandom(seededRandom(7431));
      steps = 0; goal = schedule.budget; history = []; lastMeasured = 0;
      clearTrails();
      updateReference(); measure(); showOutside(drawCloud(primary, particles));
      status(message || 'Ready. Points start away from the set. The blue density field is the Gibbs target; run ULA to watch the chains explore it.');
    } else {
      temperature = .3; coolingStart = temperature; coolingElapsed = 0;
      updateReference();
      status(message || 'Ready. Lower the temperature to see the Gibbs law approach its limit.');
    }
    updateLabels();
  }
  function advance(remaining) {
    const measurementInterval = Math.max(50, Math.round(schedule.budget / 120));
    while (remaining > 0) {
      const chunk = Math.min(remaining, measurementInterval - (steps - lastMeasured), 10 - (steps - lastRecorded));
      advanceULA(particles, model, { h: schedule.h, temperature, steps: chunk, normal });
      steps += chunk; remaining -= chunk;
      if (!particles.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))) {
        pause('Numerical values became non-finite. Restart this setup before continuing.'); return false;
      }
      if (steps - lastMeasured >= measurementInterval) measure();
      if (steps - lastRecorded >= 10) recordTrails();
    }
    showOutside(drawCloud(primary, particles)); drawTrails(); updateLabels(); return true;
  }
  function complete() {
    pause();
    if (isULA) {
      if (lastMeasured !== steps) measure();
      status(`${format(steps)} steps complete. The 32-bin discrepancy is ${diagnostic.binTV.toFixed(3)}; mean distance to the set is ${diagnostic.meanDistance.toFixed(3)}. Finite-sample fluctuations remain; neither number certifies mixing.`);
    } else {
      temperature = 0; updateReference();
      status('At λ = 0, the displayed points follow the limiting law on the solution set.');
    }
    updateLabels();
  }
  function tick(now) {
    if (!running) return;
    if (!lastTime) lastTime = now;
    const elapsed = Math.min(80, now - lastTime); lastTime = now;
    if (isULA) {
      remainder += elapsed * schedule.budget / 12000;
      const n = Math.min(goal - steps, Math.floor(remainder));
      if (n) { remainder -= n; if (!advance(n)) return; }
      if (steps >= goal) { complete(); return; }
    } else {
      coolingElapsed += elapsed;
      const progress = Math.min(1, coolingElapsed / 7500);
      const nextTemperature = progress === 1 ? 0 : Math.max(.001, Math.round(coolingStart * (1 - progress) ** 2 * 1000) / 1000);
      if (nextTemperature !== temperature) { temperature = nextTemperature; updateReference(); }
      if (progress >= 1) { complete(); return; }
    }
    frame = requestAnimationFrame(tick);
  }
  run.addEventListener('click', () => {
    if (sweeping) pause();
    if (running) { pause(isULA ? `Paused at ${format(steps)} steps. Parameters and particles are unchanged.` : `Paused at λ = ${temperature.toFixed(3)}.`); return; }
    if (isULA) {
      if (steps >= goal) { goal += schedule.budget; redrawTrace(); }
      if (reduced.matches) {
        const n = Math.min(Math.ceil(schedule.budget / 12), goal - steps);
        if (!advance(n)) return;
        if (lastMeasured !== steps) measure();
        if (steps >= goal) complete();
        else status(`${format(steps)} steps. Discrepancy ${diagnostic.binTV.toFixed(3)}; distance ${diagnostic.meanDistance.toFixed(3)}. Each point received real gradient and Gaussian-noise updates.`);
        updateLabels(); return;
      }
      status(`ULA is running with ${family ? 'θ, ' : ''}temperature and step size held fixed. The density field is the independently computed target; short trails show six chains’ recent recorded positions.`);
    } else {
      if (temperature === 0) { restart(); if (reduced.matches) return; }
      if (reduced.matches) {
        temperature = [.3, .15, .06, .02, .005, 0].find(value => value < temperature - 1e-8) ?? 0;
        updateReference();
        status(temperature === 0 ? 'Now showing the limiting law on the solution set.' : `Directly computed Gibbs reference at λ = ${temperature.toFixed(3)}.`);
        return;
      }
      coolingStart = temperature; coolingElapsed = 0;
      status('Cooling the target distribution. Paired reference points show how the Gibbs law changes as temperature decreases.');
    }
    running = true; lastTime = 0; remainder = 0; updateLabels(); frame = requestAnimationFrame(tick);
  });
  reset.addEventListener('click', () => restart());
  $('[data-example]')?.addEventListener('change', event => {
    example = event.target.value; restart(`Switched to the ${example}. ${isULA ? 'ULA restarts from the same Cartesian cloud and random seed.' : 'The reference law is recomputed for this shape.'}`);
  });
  $('[data-preset]')?.addEventListener('change', event => {
    preset = event.target.value; restart('Schedule changed. This is an illustrative parameter choice, not a certified error budget. The starting cloud and random seed are unchanged.');
  });
  $('[data-temperature]')?.addEventListener('input', event => {
    const requestedTemperature = Number(event.target.value);
    pause(); temperature = requestedTemperature; updateReference();
    status(temperature === 0 ? `Showing the limiting law supported on ${solutionLabel}.` : `Showing a directly computed Gibbs reference at λ = ${temperature.toFixed(3)}.`);
  });
  function changeTheta(value, keepSweep = false) {
    if (!keepSweep) { pause(); previousModel = model; }
    theta = value; model = createModel(example, theta);
    if ($('[data-theta]')) $('[data-theta]').value = String(theta);
    if (isULA) {
      steps = 0; goal = schedule.budget; history = []; lastMeasured = 0;
      clearTrails();
      updateReference(); measure(); showOutside(drawCloud(primary, particles)); updateLabels();
      if (!keepSweep) status('θ changed; particles and the noise stream were retained. The dashed curve is the previous target set. Run ULA at this θ, or Restart for a comparison from the common initialization.');
    } else {
      updateReference();
      status('θ changed. Both the Gibbs reference and the limiting law were recomputed for the new parameter.');
    }
  }
  $('[data-theta]')?.addEventListener('input', event => changeTheta(Number(event.target.value)));
  function sweepTick(now) {
    if (!sweeping) return;
    if (!sweepStart) sweepStart = now;
    const next = Math.min(1, Math.round((sweepOrigin + (now - sweepStart) / 6000) * 20) / 20);
    if (next !== theta) changeTheta(next, true);
    if (next >= 1) { pause('Family sweep complete. No ULA updates were taken; the particles stayed fixed. Run ULA at θ = 1, or choose another θ. Restart before comparing independent runs.'); return; }
    sweepFrame = requestAnimationFrame(sweepTick);
  }
  sweep?.addEventListener('click', () => {
    if (sweeping) { pause('Parameter sweep paused. Particles are unchanged. Run ULA to sample the selected fixed target.'); return; }
    pause(); previousModel = model;
    if (reduced.matches) {
      changeTheta(theta >= 1 ? 0 : Math.min(1, theta + .25));
      return;
    }
    if (theta >= 1) changeTheta(0);
    sweepOrigin = theta; sweepStart = 0; sweeping = true;
    status('Browsing the family: only θ and the Gibbs target change. ULA is paused and all particles stay fixed.');
    updateLabels(); sweepFrame = requestAnimationFrame(sweepTick);
  });
  reduced.addEventListener('change', () => pause('Motion preference changed. Continue using the updated playback control.'));
  document.addEventListener('visibilitychange', () => { if (document.hidden && (running || sweeping)) pause('Paused while the page is hidden.'); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting && (running || sweeping)) pause('Paused while this experiment is offscreen.');
    }, { threshold: 0 }).observe(root);
  }
  window.addEventListener('beforeprint', () => {
    pause();
    status(isULA
      ? `Printed snapshot: ${format(steps)} ULA steps per chain, λ = ${temperature.toFixed(2)}, h = ${schedule.h.toFixed(3)}${family ? `, θ = ${theta.toFixed(2)}` : ''}. Blue shading is the separately computed Gibbs density.`
      : `Printed snapshot: ${temperature === 0 ? `the limiting law on ${solutionLabel}` : `the Gibbs reference at λ = ${temperature.toFixed(3)}`}${family ? `, θ = ${theta.toFixed(2)}` : ''}. These clouds represent directly computed probability distributions.`);
  });
  window.addEventListener('afterprint', () => {
    status(isULA ? `Paused at ${format(steps)} steps per chain after printing. Resume to continue.` : 'Cooling remains paused after printing. Continue when ready.');
  });
  restart();
  root.querySelectorAll('[data-experiment-controls]').forEach(element => { element.hidden = false; });
  root.dataset.ready = 'true';
  return { pause, getState: () => ({ isULA, example, theta, temperature, h: schedule.h, steps, goal, running, sweeping, count, particles: particles.map(p => ({ ...p })), trails, diagnostic }) };
}

for (const experiment of document.querySelectorAll('[data-sampling-experiment]')) {
  initSamplingExperiment(experiment);
}
