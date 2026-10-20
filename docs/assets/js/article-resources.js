/* Progressive enhancement: native links/disclosures work without this script. */
(() => {
  const contents = document.querySelector('[data-post-contents]');
  if (!contents) return;

  const wide = window.matchMedia('(min-width: 1200px)');
  const links = [...contents.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  const layout = () => {
    // A resize must not hide the link a keyboard reader is using.
    contents.open = wide.matches || contents.contains(document.activeElement);
  };
  layout();
  wide.addEventListener('change', layout);

  // Compare heading positions instead of measuring each long section's visibility.
  let pending = false;
  const update = () => {
    pending = false;
    let active = -1;
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= 150) active = index;
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      active = links.length - 1;
    }
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const schedule = () => {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', schedule);
  // Expanding a proof or citation can move headings without a scroll event.
  document.addEventListener('toggle', schedule, true);
  document.fonts.ready.then(schedule);
  update();
})();
