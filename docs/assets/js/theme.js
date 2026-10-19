/* Apply a saved choice before first paint; without JavaScript, CSS follows the system. */
(() => {
  'use strict';
  const storageKey = 'saeed-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const validTheme = value => value === 'light' || value === 'dark';
  let preference = null;
  let toggle;

  try {
    const saved = localStorage.getItem(storageKey);
    if (validTheme(saved)) preference = saved;
  } catch (_) {
    // The theme switch still works when browser storage is unavailable.
  }

  const applyTheme = () => {
    const theme = preference || (system.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#151b23' : '#ffffff';
    if (toggle) {
      const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }
  };

  applyTheme();
  system.addEventListener('change', () => {
    if (!preference) applyTheme();
  });
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) {
      preference = validTheme(event.newValue) ? event.newValue : null;
      applyTheme();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    toggle = document.querySelector('.theme-toggle');
    if (!toggle) return;
    applyTheme();
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
      try {
        localStorage.setItem(storageKey, preference);
      } catch (_) {
        // Keep the current page usable even if the choice cannot be saved.
      }
    });
  });
})();
