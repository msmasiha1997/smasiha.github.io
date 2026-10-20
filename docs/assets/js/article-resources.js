/* Progressive enhancement: native links/disclosures work without this script. */
(() => {
  document.querySelectorAll('[data-copy-citation]').forEach(button => {
    const citation = button.closest('.post-citation');
    const code = citation.querySelector('code');
    const status = citation.querySelector('[data-copy-status]');
    button.hidden = false;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        status.textContent = 'Copied.';
      } catch {
        // Keep the citation usable when clipboard access is unavailable or denied.
        const range = document.createRange();
        range.selectNodeContents(code);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        code.closest('pre').focus({ preventScroll: true });
        status.textContent = 'Text selected. Press Ctrl+C or ⌘C to copy.';
      }
    });
  });

  const contents = document.querySelector('[data-post-contents]');
  if (!contents) return;
  document.body.classList.add('has-article-resources');

  const wide = window.matchMedia('(min-width: 960px)');
  const links = [...contents.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  const current = contents.querySelector('[data-contents-current]');
  const layout = () => {
    // A resize must not hide the link a keyboard reader is using.
    contents.open = wide.matches || contents.contains(document.activeElement);
  };
  layout();
  wide.addEventListener('change', layout);

  links.forEach((link, index) => {
    link.addEventListener('click', event => {
      if (wide.matches || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const target = sections[index];
      if (!target) return;
      // Move keyboard focus out before hiding the menu; leave anchor navigation native.
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      contents.open = false;
    });
  });

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
    if (current) current.textContent = active >= 0 ? links[active].textContent : '';
    // Keep the highlighted entry in view on short desktop windows.
    if (wide.matches && active >= 0 && contents.open && !contents.contains(document.activeElement)) {
      const nav = contents.closest('nav');
      const bounds = nav.getBoundingClientRect();
      const item = links[active].getBoundingClientRect();
      if (item.top < bounds.top + 4) nav.scrollTop += item.top - bounds.top - 4;
      else if (item.bottom > bounds.bottom - 4) nav.scrollTop += item.bottom - bounds.bottom + 4;
    }
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
