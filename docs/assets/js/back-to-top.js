/* Enhance the native top-of-page link without changing article anchors. */
(() => {
  'use strict';
  const link = document.querySelector('.back-to-top');
  if (!link) return;

  let pending = false;
  const updateVisibility = () => {
    pending = false;
    const threshold = Math.max(400, window.innerHeight * 0.75);
    // Keep a focused control available until the reader moves focus elsewhere.
    link.hidden = window.scrollY <= threshold && document.activeElement !== link;
  };
  const scheduleUpdate = () => {
    if (!pending) {
      pending = true;
      window.requestAnimationFrame(updateVisibility);
    }
  };

  link.classList.add('is-floating');
  document.body.classList.add('has-back-to-top');
  updateVisibility();
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('pageshow', scheduleUpdate);
  link.addEventListener('blur', scheduleUpdate);
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const firstLink = document.querySelector('.main-nav a');
    if (firstLink) firstLink.focus({ preventScroll: true });
    // An immediate jump is fast on long articles and respects reduced motion.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    updateVisibility();
  });
})();
