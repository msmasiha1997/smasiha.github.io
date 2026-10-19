import { createModel } from './ula-model.js';

/** Compare the actual loss at equal outward normal displacements. */
export function initNormalRise(root) {
  if (!root || root.dataset.normalReady === 'true') return null;
  const $ = selector => root.querySelector(selector);
  const slider = $('[data-normal-slider]');
  const button = $('[data-normal-play]');
  const controls = $('[data-normal-controls]');
  const description = $('[data-normal-desc]');
  const status = $('[data-normal-status]');
  const distance = $('[data-normal-distance]');
  const nodes = ['a', 'b'].map(key => ({
    key,
    point: $(`[data-normal-point="${key}"]`),
    line: $(`[data-normal-line="${key}"]`),
    loss: $(`[data-normal-loss="${key}"]`),
    bar: $(`[data-normal-bar="${key}"]`),
  }));
  // Leave the complete static illustration intact if markup is incomplete.
  if (!slider || !button || !controls || !description || !status || !distance
    || nodes.some(node => !node.point || !node.line || !node.loss || !node.bar)) return null;

  const model = createModel('ellipse', 0.5);
  const maximum = 0.4;
  const duration = 4000;
  const barMaximum = 0.5;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const screen = point => ({ x: 220 + 120 * point.x, y: 180 - 120 * point.y });
  let delta = 0;
  let losses = [0, 0];
  let running = false;
  let frame = 0;
  let previousTime = 0;

  function updateButton() {
    button.textContent = reduced.matches
      ? delta >= maximum ? 'Reset' : 'Advance'
      : running ? 'Pause' : delta >= maximum ? 'Replay' : 'Play';
    root.dataset.normalState = running ? 'running' : delta >= maximum ? 'complete' : delta > 0 ? 'paused' : 'ready';
  }
  function render() {
    const worldPoints = [model.world(model.a + delta, 0), model.world(0, model.b + delta)];
    const bases = [model.world(model.a, 0), model.world(0, model.b)];
    losses = worldPoints.map(point => model.potential(point.x, point.y));
    nodes.forEach((node, index) => {
      const point = screen(worldPoints[index]);
      const base = screen(bases[index]);
      node.point.setAttribute('cx', point.x.toFixed(3));
      node.point.setAttribute('cy', point.y.toFixed(3));
      node.line.setAttribute('x1', base.x.toFixed(3));
      node.line.setAttribute('y1', base.y.toFixed(3));
      node.line.setAttribute('x2', point.x.toFixed(3));
      node.line.setAttribute('y2', point.y.toFixed(3));
      node.loss.textContent = losses[index].toFixed(3);
      node.bar.style.width = `${100 * losses[index] / barMaximum}%`;
    });
    distance.textContent = delta.toFixed(2);
    slider.value = delta.toFixed(2);
    slider.setAttribute('aria-valuetext', `Outward displacement ${delta.toFixed(2)} coordinate units`);
    description.textContent = `Points A and B start on the ellipse at its right and top tips. Each moves ${delta.toFixed(2)} coordinate units outward, perpendicular to the curve. The exact loss is ${losses[0].toFixed(3)} at A and ${losses[1].toFixed(3)} at B. Both loss bars use the same scale from zero to 0.5.`;
    root.dataset.normalDelta = delta.toFixed(6);
    updateButton();
  }
  function describeValues(prefix = '') {
    return `${prefix}Equal displacement ${delta.toFixed(2)}: loss at A ${losses[0].toFixed(3)}; loss at B ${losses[1].toFixed(3)}.${delta > 0 ? ' The loss rises more at B for the same step.' : ''}`;
  }
  function pause(message) {
    running = false;
    cancelAnimationFrame(frame);
    previousTime = 0;
    updateButton();
    if (message) status.textContent = message;
  }
  function tick(now) {
    if (!running) return;
    if (!previousTime) previousTime = now;
    const elapsed = Math.min(80, now - previousTime);
    previousTime = now;
    delta = Math.min(maximum, delta + maximum * elapsed / duration);
    render();
    if (delta >= maximum) {
      pause(describeValues('Complete. '));
      return;
    }
    frame = requestAnimationFrame(tick);
  }

  button.addEventListener('click', () => {
    if (running) { pause(describeValues('Paused. ')); return; }
    if (reduced.matches) {
      delta = delta >= maximum ? 0 : Math.min(maximum, Math.round((delta + 0.1) * 100) / 100);
      render();
      status.textContent = describeValues();
      return;
    }
    if (delta >= maximum) { delta = 0; render(); }
    running = true;
    previousTime = 0;
    updateButton();
    status.textContent = 'Moving both points outward by the same distance. The bars show the actual loss at each point.';
    frame = requestAnimationFrame(tick);
  });
  slider.addEventListener('input', event => {
    const requested = Number(event.target.value);
    pause();
    delta = Math.max(0, Math.min(maximum, Number.isFinite(requested) ? requested : 0));
    render();
    status.textContent = describeValues();
  });
  reduced.addEventListener('change', () => pause('Motion preference changed. Continue using the updated playback control.'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) pause(describeValues('Paused while the page is hidden. '));
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting && running) pause(describeValues('Paused while this figure is offscreen. '));
    }, { threshold: 0 }).observe(root);
  }
  for (let ancestor = root.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.tagName === 'DETAILS') {
      const disclosure = ancestor;
      disclosure.addEventListener('toggle', () => {
        if (!disclosure.open && running) pause(describeValues('Paused while the explanation is closed. '));
      });
    }
  }
  window.addEventListener('beforeprint', () => {
    pause();
    status.textContent = describeValues('Printed snapshot. ');
  });
  window.addEventListener('afterprint', () => {
    status.textContent = describeValues('Current snapshot. ');
  });

  render();
  status.textContent = 'Both points begin at zero loss. Move them the same distance to compare how quickly the loss rises.';
  controls.hidden = false;
  root.dataset.normalReady = 'true';
  return { pause, getState: () => ({ delta, losses: [...losses], running }) };
}
