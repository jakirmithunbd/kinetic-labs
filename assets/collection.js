/* ==========================================================================
   Collection filtering, sorting and load-more.

   Everything here is an enhancement over markup that already works: the facet
   form GETs to the collection URL, the pills are ordinary links, and
   "load more" is a link to page 2. With JavaScript off, the catalogue is
   fully browsable and fully crawlable.
   ========================================================================== */

(function () {
  'use strict';

  const section = document.querySelector('[data-collection-section]');
  if (!section) return;

  const sectionId = section.id.replace('CollectionGrid-', '');
  let abortController = null;

  /* Merge a form's values into the current query string.

     Several facet forms coexist on one page (desktop sidebar, toolbar sort,
     mobile drawer). Each owns only the parameters it renders, so we clear
     just those and leave everything else — a sort choice survives a filter
     change, and vice versa. */
  function buildUrl(form) {
    const url = new URL(window.location.href);
    const owned = new Set();

    Array.from(form.elements).forEach((el) => {
      if (el.name) owned.add(el.name);
    });

    owned.forEach((name) => url.searchParams.delete(name));
    url.searchParams.delete('page');

    new FormData(form).forEach((value, key) => {
      if (value === '' || value == null) return;
      url.searchParams.append(key, value);
    });

    return url;
  }

  function render(url, options) {
    const settings = options || {};

    if (abortController) abortController.abort();
    abortController = new AbortController();

    section.setAttribute('aria-busy', 'true');
    section.classList.add('is-loading');

    const fetchUrl = new URL(url);
    fetchUrl.searchParams.set('section_id', sectionId);

    return fetch(fetchUrl.toString(), { signal: abortController.signal })
      .then((response) => {
        if (!response.ok) throw new Error(response.status);
        return response.text();
      })
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const fresh = doc.querySelector('[data-collection-section]');
        if (!fresh) throw new Error('missing section');

        section.innerHTML = fresh.innerHTML;

        // The mobile filter drawer lives outside the section wrapper, so it
        // has to be swapped separately to stay in sync with the new counts.
        const freshDrawer = doc.getElementById('FilterDrawer');
        const currentDrawer = document.getElementById('FilterDrawer');
        if (freshDrawer && currentDrawer) {
          const wasOpen = currentDrawer.classList.contains('is-open');
          const panel = currentDrawer.querySelector('.drawer__panel');
          const freshPanel = freshDrawer.querySelector('.drawer__panel');
          if (panel && freshPanel) {
            const scrollTop = panel.querySelector('.drawer__body')?.scrollTop || 0;
            panel.innerHTML = freshPanel.innerHTML;
            const body = panel.querySelector('.drawer__body');
            if (body) body.scrollTop = scrollTop;
          }
          if (wasOpen) currentDrawer.classList.add('is-open');
        }

        if (!settings.skipHistory) {
          const display = new URL(url);
          display.searchParams.delete('section_id');
          window.history.pushState({ collection: true }, '', display.toString());
        }

        window.KL && window.KL.initReveal && window.KL.initReveal(section);

        const count = section.querySelector('[data-collection-count]');
        if (count && window.KL) window.KL.announce(count.textContent.trim());

        if (settings.scroll !== false) {
          section.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'auto'
              : 'smooth',
            block: 'start'
          });
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        // Fall back to a normal navigation rather than leaving a dead UI.
        window.location = url.toString();
      })
      .finally(() => {
        section.removeAttribute('aria-busy');
        section.classList.remove('is-loading');
      });
  }

  const debouncedRender = window.KL.debounce((url) => render(url, { scroll: false }), 400);

  /* ---- Facet changes ----------------------------------------------------- */

  document.addEventListener('change', (event) => {
    const form = event.target.closest('[data-facet-form]');
    if (!form) return;

    const url = buildUrl(form);

    // Typing in a price field shouldn't fire a request per keystroke.
    if (event.target.type === 'number') {
      debouncedRender(url);
    } else {
      render(url, { scroll: false });
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.type !== 'number') return;
    const form = event.target.closest('[data-facet-form]');
    if (!form) return;
    debouncedRender(buildUrl(form));
  });

  // Never let a facet form do a full page submit once JS is running.
  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-facet-form]');
    if (!form) return;
    event.preventDefault();
    render(buildUrl(form), { scroll: false });
  });

  /* ---- Pills, clear-all, pagination -------------------------------------- */

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-facet-remove], [data-facet-clear], .pagination a');
    if (link && link.href) {
      event.preventDefault();
      render(new URL(link.href), { scroll: !!event.target.closest('.pagination') });
      return;
    }

    const loadMore = event.target.closest('[data-load-more]');
    if (!loadMore) return;
    event.preventDefault();
    appendNextPage(loadMore);
  });

  /* ---- Load more --------------------------------------------------------- */

  function appendNextPage(trigger) {
    const url = new URL(trigger.href);
    url.searchParams.set('section_id', sectionId);

    trigger.setAttribute('aria-busy', 'true');
    trigger.classList.add('is-loading');

    fetch(url.toString())
      .then((r) => r.text())
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const grid = document.getElementById(trigger.getAttribute('data-grid-target'));
        const freshGrid = doc.querySelector('[data-product-grid]');
        if (!grid || !freshGrid) throw new Error('missing grid');

        const added = Array.from(freshGrid.children);
        added.forEach((node) => grid.appendChild(node));

        const freshTrigger = doc.querySelector('[data-load-more]');
        const freshStatus = doc.querySelector('[data-load-more-status]');
        const status = document.querySelector('[data-load-more-status]');

        if (status && freshStatus) status.textContent = freshStatus.textContent;

        if (freshTrigger) {
          trigger.href = freshTrigger.href;
        } else {
          trigger.remove();
        }

        // Move focus to the first newly added card so keyboard users don't
        // lose their place at the bottom of the page.
        const firstNew = added[0] && added[0].querySelector('a');
        if (firstNew) {
          firstNew.setAttribute('tabindex', '-1');
          firstNew.focus({ preventScroll: true });
        }

        const displayUrl = new URL(trigger.href || window.location.href);
        displayUrl.searchParams.delete('section_id');
        window.history.replaceState({}, '', displayUrl.toString());

        window.KL && window.KL.initReveal && window.KL.initReveal(grid);
      })
      .catch(() => {
        window.location = trigger.href;
      })
      .finally(() => {
        trigger.removeAttribute('aria-busy');
        trigger.classList.remove('is-loading');
      });
  }

  /* ---- Back / forward ---------------------------------------------------- */

  window.addEventListener('popstate', () => {
    render(new URL(window.location.href), { skipHistory: true, scroll: false });
  });
})();
