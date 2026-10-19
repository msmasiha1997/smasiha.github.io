/* Presentation-inspired minimizer selection and LLM procedure. Static HTML remains complete. */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controllers = [];
  const notes = [
    'Take one training step for each of four LoRA parameter candidates, using the current source weights.',
    'Measure each candidate’s validation loss on the same held-out examples.',
    'Keep candidate C: its parameters give the lowest validation loss in this illustration.',
    'Differentiate through the selected parameters to update the source weights, then repeat.'
  ];
  const ease = x => x * x * (3 - 2 * x);

  document.querySelectorAll('[data-manifold]').forEach(figure => {
    const button = figure.querySelector('[data-manifold-play]');
    const controls = figure.querySelector('[data-manifold-controls]');
    const heading = figure.querySelector('[data-manifold-heading]');
    const caption = figure.querySelector('[data-manifold-caption]');
    const progressLabel = figure.querySelector('[data-manifold-progress]');
    const status = figure.querySelector('[data-manifold-status]');
    const descriptions = [...figure.querySelectorAll('[data-manifold-desc]')];
    const scores = [...figure.querySelectorAll('[data-manifold-score]')];
    if (!button || !controls || !heading || !caption || !progressLabel || !status || !scores.length) return;
    const gdRuns = [...figure.querySelectorAll('[data-gd-run]')].map(group => ({
      path: group.querySelector('[data-gd-path]'),
      head: group.closest('svg').querySelector(`[data-gd-head="${group.dataset.gdRun}"]`),
      points: group.querySelector('[data-gd-path]').getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number))
    }));
    const iteration = figure.querySelector('[data-gd-iteration]');
    if (!gdRuns.length || !iteration) return;
    const total = 9000;
    const stops = [0, 4500, 7600, total];
    const titles = ['Same loss, different starting points.', 'Different solutions, equally good training fit.', 'Then, compare validation scores.', 'Same training fit. A better choice.'];
    const captions = [
      'Same toy loss and step size, three starting points. Dashed paths follow gradient descent; the blue curve marks the possible zero-loss limits.',
      'The three runs approach A, B and C. All reach essentially zero training loss, but training alone gives no reason to prefer one.',
      'Each bar scores one model on validation data. A, B and C identify the same models in both panels; these validation scores are schematic.',
      'All three runs fit the training objective. Validation distinguishes their outcomes: B has the highest score among the models shown.'
    ];
    const alt = {
      landscape: [
        'Both axes are model parameters. The blue curve contains all minimizers in view of a computed toy loss. Three hollow circles mark different initializations. Dashed paths trace gradient descent with the same step size, 0.16. The background shows that same loss: lower near the blue curve, higher away from it.',
        'Three actual gradient-descent paths approach different points A, B and C on the blue minimizer curve. After 120 steps, each loss is below 10 to the minus 16. The dashed paths are optimizer trajectories; the solid blue curve is the set of solutions.',
        'The three gradient-descent runs have approached A, B and C. Sixteen blue dots mark example minimizers; their illustrative validation scores appear below in the same left-to-right order.',
        'Model B is circled on the blue minimizer curve. Its validation score is the highest among the sixteen shown. Three dashed gradient-descent paths approach A, B and C from different initializations using the same step size. All approach zero training loss.'
      ],
      scores: [
        'Validation scores will be revealed after gradient descent. The bars will follow the models in the same left-to-right order. A, B and C identify the same models in both panels.',
        'Gradient descent has approached three different training solutions. Validation scores will be shown next; letters A, B and C will match the models above.',
        'Sixteen bars compare the same models in the same left-to-right order. Each bar starts at a shared baseline. Taller means a higher illustrative validation score; these are not counts or measured accuracies. Letters A, B and C match the models above.',
        'Model B has the tallest score bar among the sixteen shown, and its corresponding point is circled above. Bar height represents an illustrative validation score, not a count. All candidates share the same minimum training loss.'
      ]
    };
    let elapsed = 0;
    let phase = 0;
    let started = 0;
    let running = false;
    let frame = 0;
    let printState = null;
    let visited = false;

    function describe() {
      button.textContent = reducedMotion.matches
        ? ['Show GD outcomes', 'Show scores', 'Select a model', 'Replay steps'][phase]
        : running ? 'Pause animation' : elapsed >= total ? 'Replay animation' : elapsed > 0 ? 'Resume animation' : 'Play animation';
      progressLabel.textContent = !visited && !reducedMotion.matches
        ? '4 stages · 9 seconds'
        : `${phase + 1} / 4${running ? ' · Playing' : elapsed >= total && !reducedMotion.matches ? ' · Complete' : ''}`;
    }
    function render(time, announce = false) {
      const previous = phase;
      phase = time < 4500 ? 0 : time < 5800 ? 1 : time < 8000 ? 2 : 3;
      figure.dataset.stage = String(phase);
      figure.dataset.running = String(running);
      // Reveal actual iterates. A logarithmic clock gives early GD steps time
      // to be seen; interpolation only connects successive computed points.
      const progress = Math.max(0, Math.min(1, (time - 300) / 4000));
      const gdStep = progress === 1 ? 120 : Math.expm1(progress * Math.log(121));
      const index = Math.floor(gdStep);
      gdRuns.forEach(run => {
        const current = run.points[index];
        const next = run.points[Math.min(120, index + 1)];
        const mix = gdStep - index;
        const head = current.map((value, axis) => value + (next[axis] - value) * mix);
        const visible = run.points.slice(0, index + 1);
        if (mix > 0) visible.push(head);
        run.path.setAttribute('points', visible.map(point => point.join(',')).join(' '));
        run.head.setAttribute('cx', head[0]);
        run.head.setAttribute('cy', head[1]);
        run.head.style.opacity = gdStep === 0 ? '0' : '1';
      });
      iteration.textContent = `GD step ${index} / 120`;
      const growth = phase < 2 ? 0 : ease(Math.max(0, Math.min(1, (time - 5800) / 1500)));
      scores.forEach(bar => {
        const height = Number(bar.dataset.height) * growth;
        bar.setAttribute('y', (Number(bar.dataset.base) - height).toFixed(3));
        bar.setAttribute('height', height.toFixed(3));
      });
      const selection = phase === 3 ? ease(Math.min(1, (time - 8000) / 450)) : 0;
      figure.querySelectorAll('.manifold-selection').forEach(ring => { ring.style.opacity = String(selection); });
      heading.textContent = titles[phase];
      caption.textContent = captions[phase];
      descriptions.forEach(desc => { desc.textContent = alt[desc.dataset.manifoldDesc][phase]; });
      describe();
      if (announce && previous !== phase) status.textContent = `Stage ${phase + 1} of 4. ${titles[phase]} ${captions[phase]}`;
    }
    function pause() {
      if (!running) return;
      elapsed = Math.min(total, performance.now() - started);
      running = false;
      cancelAnimationFrame(frame);
      render(elapsed);
    }
    function tick(now) {
      if (!running) return;
      elapsed = Math.min(total, now - started);
      if (elapsed >= total) running = false;
      render(elapsed, true);
      if (running) frame = requestAnimationFrame(tick);
    }
    function play() {
      if (elapsed >= total) elapsed = 0;
      started = performance.now() - elapsed;
      running = true;
      render(elapsed);
      status.textContent = `Animation playing. ${captions[phase]}`;
      frame = requestAnimationFrame(tick);
    }
    button.addEventListener('click', () => {
      if (printState) return;
      visited = true;
      if (reducedMotion.matches) {
        elapsed = stops[(phase + 1) % stops.length];
        render(elapsed, true);
      } else if (running) {
        pause();
        status.textContent = `Animation paused. ${captions[phase]}`;
      } else play();
    });
    reducedMotion.addEventListener('change', () => {
      const wasRunning = running;
      pause();
      elapsed = wasRunning ? total : stops[phase];
      render(elapsed);
      if (wasRunning) status.textContent = captions[phase];
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) pause();
      });
      observer.observe(figure);
    }
    window.addEventListener('beforeprint', () => {
      if (printState) return;
      pause();
      printState = {elapsed, visited};
      elapsed = total;
      render(total);
      caption.textContent = 'With the same toy loss and step size, gradient descent from three initializations approaches A, B and C. Their training losses approach zero; the schematic validation scores distinguish the solutions. B scores highest among the models shown.';
    });
    window.addEventListener('afterprint', () => {
      if (!printState) return;
      ({elapsed, visited} = printState);
      printState = null;
      render(elapsed);
    });
    figure.dataset.enhanced = 'true';
    render(0);
    controls.hidden = false;
  });

  document.querySelectorAll('[data-story="method"]').forEach(figure => {
    const button = figure.querySelector('.story-play');
    const status = figure.querySelector('.animation-status');
    const controls = figure.querySelector('.story-controls');
    const total = 10000;
    const steps = 4;
    const bars = [...figure.querySelectorAll('.mixture-bars i')];
    const weightLabels = [...figure.querySelectorAll('.source-weight-value')];
    const weights = [18, 10, 8, 14, 5, 10, 8, 12, 7, 8];
    let elapsed = total;
    let started = 0;
    let frame = 0;
    let running = false;
    let visited = false;
    let manualStep = steps - 1;

    function render(progress) {
      const stage = Math.min(steps - 1, Math.floor(progress * steps));
      figure.dataset.stage = String(stage);
      figure.querySelectorAll('[data-step]').forEach((step, index) => {
        if (index === stage) step.setAttribute('aria-current', 'step');
        else step.removeAttribute('aria-current');
      });
      figure.querySelector('[data-method-note]').textContent = notes[stage];
      const change = stage < 3 ? 0 : reducedMotion.matches ? 1 : ease(Math.min(1, (progress - .75) * 4));
      const proportions = weights.map(weight => 10 + (weight - 10) * change);
      // Round labels to tenths while keeping their displayed total at 100%.
      const tenths = proportions.map(weight => Math.floor(weight * 10));
      const remainders = proportions.map((weight, index) => ({ index, remainder: weight * 10 - tenths[index] }))
        .sort((a, b) => b.remainder - a.remainder);
      const missing = 1000 - tenths.reduce((sum, value) => sum + value, 0);
      for (let i = 0; i < missing; i++) tenths[remainders[i].index]++;
      bars.forEach((bar, index) => {
        bar.style.setProperty('--weight', `${proportions[index]}%`);
        weightLabels[index].textContent = `${tenths[index] / 10}%`;
      });
      figure.querySelector('.mixture-bars').setAttribute('aria-label', `Illustrative training-source proportions: ${tenths.map((value, index) => `source ${index + 1}: ${value / 10}%`).join(', ')}.`);
      figure.querySelector('.branch-grid').setAttribute('aria-label', `Four candidates A, B, C and D share the same network architecture but have different LoRA parameter values.${stage >= 2 ? ' Candidate C is selected for its lowest validation loss.' : ''}`);
      const line = figure.querySelector('.feedback-line');
      const length = line.getTotalLength();
      line.style.strokeDasharray = change === 1 || stage < 3 ? 'none' : String(length);
      line.style.strokeDashoffset = stage < 3 ? '0' : String(length * (1 - change));
    }
    function describe() {
      if (reducedMotion.matches) {
        button.textContent = manualStep === steps - 1 ? 'Replay steps' : 'Next step';
        status.textContent = `Step ${manualStep + 1} of ${steps} · Reduced motion`;
      } else {
        button.textContent = running ? 'Pause animation' : elapsed >= total ? 'Replay animation' : elapsed === 0 ? 'Play animation' : 'Resume animation';
        status.textContent = running ? 'Playing · stops automatically' : elapsed >= total ? 'Complete' : 'Paused';
      }
    }
    function pause() {
      if (!running) return;
      elapsed = Math.min(total, performance.now() - started);
      running = false;
      cancelAnimationFrame(frame);
      describe();
    }
    function tick(now) {
      if (!running) return;
      elapsed = Math.min(total, now - started);
      render(elapsed / total);
      if (elapsed < total) frame = requestAnimationFrame(tick);
      else { running = false; describe(); }
    }
    function play() {
      visited = true;
      if (elapsed >= total) elapsed = 0;
      started = performance.now() - elapsed;
      running = true;
      render(elapsed / total);
      describe();
      frame = requestAnimationFrame(tick);
    }
    button.addEventListener('click', () => {
      visited = true;
      if (reducedMotion.matches) {
        manualStep = (manualStep + 1) % steps;
        render((manualStep + .5) / steps);
        describe();
      } else if (running) pause();
      else play();
    });
    const finish = () => {
      pause(); elapsed = total; manualStep = steps - 1; render(1); describe();
    };
    reducedMotion.addEventListener('change', finish);
    controls.hidden = false;
    render(1);
    describe();
    if (!reducedMotion.matches) {
      button.textContent = 'Play animation';
      status.textContent = `${steps} steps · ${total / 1000} seconds`;
    }
    controllers.push({pause, finish});
    // Animate once when the figure is mostly visible. No looping or forced scrolling.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !visited && !reducedMotion.matches && !document.hidden) play();
          else if (!entry.isIntersecting) pause();
        });
      }, {threshold: .45});
      observer.observe(figure);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) controllers.forEach(controller => controller.pause());
  });
  window.addEventListener('beforeprint', () => controllers.forEach(controller => controller.finish()));
})();
