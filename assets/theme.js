/* ==========================================================================
   Kinetic Labs — theme.js
   Core behaviour as custom elements. No framework, no jQuery.
   Everything here is progressive enhancement: navigation, forms and links all
   work with this file blocked.
   ========================================================================== */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------------ */

  const KL = (window.KL = window.KL || {});

  KL.formatMoney = function (cents) {
    const format = (window.shopSettings && window.shopSettings.moneyFormat) || '${{amount}}';
    const value = (cents / 100).toFixed(2);
    const parts = value.split('.');
    const withCommas = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return format
      .replace(/\{\{\s*amount\s*\}\}/, withCommas + '.' + parts[1])
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, withCommas)
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + parts[1])
      .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/, parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
  };

  KL.announce = function (message) {
    const region = document.getElementById('LiveRegion');
    if (!region) return;
    region.textContent = '';
    window.setTimeout(() => {
      region.textContent = message;
    }, 60);
  };

  KL.debounce = function (fn, wait) {
    let timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, arguments), wait);
    };
  };

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

  KL.trapFocus = function (container, onEscape) {
    function handler(event) {
      if (event.key === 'Escape') {
        onEscape && onEscape();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(container.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', handler);
    return () => container.removeEventListener('keydown', handler);
  };

  /* ------------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------------ */

  function initReveal(root) {
    const targets = (root || document).querySelectorAll('.reveal:not(.is-visible)');
    if (!targets.length) return;

    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    );

    targets.forEach((el) => observer.observe(el));
  }

  document.addEventListener('DOMContentLoaded', () => initReveal());
  document.addEventListener('shopify:section:load', (e) => initReveal(e.target));
  KL.initReveal = initReveal;

  /* ------------------------------------------------------------------------
     <kl-drawer> — cart drawer, menu drawer, filter drawer
     ------------------------------------------------------------------------ */

  class KLDrawer extends HTMLElement {
    connectedCallback() {
      this.overlay = this.querySelector('.drawer__overlay');
      this.panel = this.querySelector('.drawer__panel');
      this.releaseFocus = null;
      this.opener = null;

      this.addEventListener('click', (event) => {
        if (event.target.closest('[data-drawer-close]') || event.target === this.overlay) {
          event.preventDefault();
          this.close();
        }
      });
    }

    open(opener) {
      if (this.classList.contains('is-open')) return;
      this.opener = opener || document.activeElement;
      this.classList.add('is-open');
      this.setAttribute('aria-hidden', 'false');
      document.body.classList.add('overflow-hidden');

      this.releaseFocus = KL.trapFocus(this, () => this.close());

      window.requestAnimationFrame(() => {
        const target =
          this.querySelector('[data-drawer-autofocus]') ||
          this.querySelector('.drawer__close') ||
          this.panel;
        target && target.focus({ preventScroll: true });
      });

      this.dispatchEvent(new CustomEvent('drawer:open', { bubbles: true }));
    }

    close() {
      if (!this.classList.contains('is-open')) return;
      this.classList.remove('is-open');
      this.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('overflow-hidden');

      this.releaseFocus && this.releaseFocus();
      this.releaseFocus = null;

      if (this.opener && document.contains(this.opener)) {
        this.opener.focus({ preventScroll: true });
      }

      this.dispatchEvent(new CustomEvent('drawer:close', { bubbles: true }));
    }

    toggle(opener) {
      this.classList.contains('is-open') ? this.close() : this.open(opener);
    }
  }
  customElements.define('kl-drawer', KLDrawer);

  // Any element with [data-drawer-open="DrawerId"] opens that drawer.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-drawer-open]');
    if (!trigger) return;

    const drawer = document.getElementById(trigger.getAttribute('data-drawer-open'));
    if (!drawer || typeof drawer.open !== 'function') return;

    event.preventDefault();
    drawer.open(trigger);
  });

  /* ------------------------------------------------------------------------
     <kl-quantity> — stepper wired to a number input
     ------------------------------------------------------------------------ */

  class KLQuantity extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input[type="number"]');
      if (!this.input) return;

      this.querySelectorAll('button[data-step]').forEach((button) => {
        button.addEventListener('click', () => {
          const step = parseInt(button.getAttribute('data-step'), 10);
          this.nudge(step);
        });
      });

      this.input.addEventListener('change', () => this.validate());
      this.updateButtons();
    }

    get step() {
      return parseInt(this.input.step, 10) || 1;
    }
    get min() {
      return parseInt(this.input.min, 10) || 0;
    }
    get max() {
      return this.input.max ? parseInt(this.input.max, 10) : Infinity;
    }

    nudge(direction) {
      const current = parseInt(this.input.value, 10) || this.min;
      let next = current + direction * this.step;
      next = Math.min(Math.max(next, this.min), this.max);
      if (next === current) return;
      this.input.value = next;
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
      this.updateButtons();
    }

    // Quantity rules for B2B mean the typed value has to be coerced to the
    // nearest valid increment, not just clamped.
    validate() {
      let value = parseInt(this.input.value, 10);
      if (isNaN(value)) value = this.min;

      if (this.step > 1) {
        const offset = value - this.min;
        value = this.min + Math.round(offset / this.step) * this.step;
      }

      value = Math.min(Math.max(value, this.min), this.max);
      this.input.value = value;
      this.updateButtons();
    }

    updateButtons() {
      const value = parseInt(this.input.value, 10) || this.min;
      const minus = this.querySelector('[data-step="-1"]');
      const plus = this.querySelector('[data-step="1"]');
      if (minus) minus.disabled = value <= this.min;
      if (plus) plus.disabled = value >= this.max;
    }
  }
  customElements.define('kl-quantity', KLQuantity);

  /* ------------------------------------------------------------------------
     <kl-header> — sticky on scroll, transparent over hero
     ------------------------------------------------------------------------ */

  class KLHeader extends HTMLElement {
    connectedCallback() {
      this.sticky = this.hasAttribute('data-sticky');
      this.lastY = window.scrollY;
      this.threshold = 40;

      this.setHeightVar();
      this.onResize = KL.debounce(() => this.setHeightVar(), 150);
      window.addEventListener('resize', this.onResize);

      if (!this.sticky) return;

      this.onScroll = () => {
        if (this.ticking) return;
        this.ticking = true;
        window.requestAnimationFrame(() => {
          this.update();
          this.ticking = false;
        });
      };
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.update();
    }

    disconnectedCallback() {
      window.removeEventListener('resize', this.onResize);
      this.onScroll && window.removeEventListener('scroll', this.onScroll);
    }

    setHeightVar() {
      document.documentElement.style.setProperty('--header-height', this.offsetHeight + 'px');
    }

    update() {
      const y = window.scrollY;
      this.classList.toggle('header--scrolled', y > this.threshold);
      // Hide on downward scroll past the fold, reveal the moment they scroll back.
      if (y > 240 && y > this.lastY) {
        this.classList.add('header--hidden');
      } else {
        this.classList.remove('header--hidden');
      }
      this.lastY = y;
    }
  }
  customElements.define('kl-header', KLHeader);

  /* ------------------------------------------------------------------------
     <kl-menu> — accessible disclosure for mega menu / nested drawer nav
     ------------------------------------------------------------------------ */

  class KLMenu extends HTMLElement {
    connectedCallback() {
      this.button = this.querySelector('[aria-expanded]');
      this.panel = this.querySelector('[data-menu-panel]');
      if (!this.button || !this.panel) return;

      this.button.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });

      this.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
          this.button.focus();
        }
      });

      // Desktop hover intent — pointer only, so keyboard and touch keep the
      // explicit click behaviour.
      if (this.hasAttribute('data-hover') && window.matchMedia('(hover: hover)').matches) {
        this.addEventListener('mouseenter', () => this.open());
        this.addEventListener('mouseleave', () => this.close());
      }

      document.addEventListener('click', (e) => {
        if (this.isOpen && !this.contains(e.target)) this.close();
      });
    }

    get isOpen() {
      return this.button.getAttribute('aria-expanded') === 'true';
    }

    open() {
      // Only one mega menu panel at a time.
      document.querySelectorAll('kl-menu').forEach((m) => {
        if (m !== this && typeof m.close === 'function') m.close();
      });
      this.button.setAttribute('aria-expanded', 'true');
      this.classList.add('is-open');
    }

    close() {
      this.button.setAttribute('aria-expanded', 'false');
      this.classList.remove('is-open');
    }

    toggle() {
      this.isOpen ? this.close() : this.open();
    }
  }
  customElements.define('kl-menu', KLMenu);

  /* ------------------------------------------------------------------------
     <kl-predictive-search>
     ------------------------------------------------------------------------ */

  class KLPredictiveSearch extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input[type="search"]');
      this.results = this.querySelector('[data-predictive-results]');
      this.status = this.querySelector('[data-predictive-status]');
      if (!this.input || !this.results) return;

      this.abortController = null;

      this.input.addEventListener(
        'input',
        KL.debounce(() => this.search(), 250)
      );

      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.reset();
        if (e.key === 'ArrowDown') {
          const first = this.results.querySelector('a');
          if (first) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    }

    reset() {
      this.results.innerHTML = '';
      this.setAttribute('aria-expanded', 'false');
      if (this.status) this.status.textContent = '';
    }

    search() {
      const term = this.input.value.trim();
      if (term.length < 2) {
        this.reset();
        return;
      }

      if (this.abortController) this.abortController.abort();
      this.abortController = new AbortController();

      const params = new URLSearchParams({
        q: term,
        'resources[type]': this.getAttribute('data-resources') || 'product,collection,page,article',
        'resources[limit]': this.getAttribute('data-limit') || '6',
        'resources[options][unavailable_products]': 'last',
        'resources[options][fields]': 'title,product_type,variants.title,vendor',
        section_id: 'predictive-search'
      });

      this.setAttribute('aria-busy', 'true');

      fetch(`${window.routes.predictive_search_url}?${params}`, {
        signal: this.abortController.signal
      })
        .then((r) => {
          if (!r.ok) throw new Error(r.status);
          return r.text();
        })
        .then((text) => {
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const markup = doc.querySelector('#shopify-section-predictive-search');
          this.results.innerHTML = markup ? markup.innerHTML : '';
          this.setAttribute('aria-expanded', 'true');

          const count = this.results.querySelectorAll('[data-predictive-item]').length;
          if (this.status) {
            this.status.textContent = count
              ? `${count} results`
              : this.getAttribute('data-no-results') || 'No results';
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') this.reset();
        })
        .finally(() => this.removeAttribute('aria-busy'));
    }
  }
  customElements.define('kl-predictive-search', KLPredictiveSearch);

  /* ------------------------------------------------------------------------
     <kl-recently-viewed> — localStorage only, no customer data leaves the page
     ------------------------------------------------------------------------ */

  const RECENT_KEY = 'kl:recently-viewed';
  const RECENT_LIMIT = 12;

  KL.recordProductView = function (handle) {
    if (!handle) return;
    try {
      const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter((h) => h !== handle);
      list.unshift(handle);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_LIMIT)));
    } catch (e) {
      /* storage unavailable (private mode) — the feature simply doesn't run */
    }
  };

  class KLRecentlyViewed extends HTMLElement {
    connectedCallback() {
      let handles = [];
      try {
        handles = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      } catch (e) {
        return;
      }

      const exclude = this.getAttribute('data-exclude');
      handles = handles.filter((h) => h !== exclude).slice(0, parseInt(this.getAttribute('data-limit'), 10) || 4);

      if (!handles.length) return;

      const sectionId = this.getAttribute('data-section-id');
      const query = handles.map((h) => `q=${encodeURIComponent(h)}`).join('&');

      fetch(`${window.location.pathname}?section_id=${sectionId}&${query}`)
        .then((r) => r.text())
        .then((text) => {
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const grid = doc.querySelector('[data-recently-viewed-grid]');
          const target = this.querySelector('[data-recently-viewed-grid]');
          if (grid && target && grid.innerHTML.trim()) {
            target.innerHTML = grid.innerHTML;
            this.hidden = false;
            initReveal(this);
          }
        })
        .catch(() => {});
    }
  }
  customElements.define('kl-recently-viewed', KLRecentlyViewed);

  /* ------------------------------------------------------------------------
     <kl-tabs> — used by review filters and the testing page
     ------------------------------------------------------------------------ */

  class KLTabs extends HTMLElement {
    connectedCallback() {
      this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
      this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));

      this.tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => this.select(index));
        tab.addEventListener('keydown', (e) => {
          const map = { ArrowRight: 1, ArrowLeft: -1 };
          if (!(e.key in map)) return;
          e.preventDefault();
          const next = (index + map[e.key] + this.tabs.length) % this.tabs.length;
          this.select(next);
          this.tabs[next].focus();
        });
      });
    }

    select(index) {
      this.tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
      });
      this.panels.forEach((panel, i) => {
        panel.hidden = i !== index;
      });
    }
  }
  customElements.define('kl-tabs', KLTabs);

  /* ------------------------------------------------------------------------
     <kl-accordion-group> — keeps one FAQ open at a time when asked to
     ------------------------------------------------------------------------ */

  class KLAccordionGroup extends HTMLElement {
    connectedCallback() {
      if (!this.hasAttribute('data-exclusive')) return;
      this.addEventListener('toggle', (event) => {
        const item = event.target;
        if (item.tagName !== 'DETAILS' || !item.open) return;
        this.querySelectorAll('details[open]').forEach((other) => {
          if (other !== item) other.open = false;
        });
      }, true);
    }
  }
  customElements.define('kl-accordion-group', KLAccordionGroup);

  /* ------------------------------------------------------------------------
     <kl-faq-search> — client-side filter over an accordion list
     ------------------------------------------------------------------------ */

  class KLFaqSearch extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('input');
      this.target = document.getElementById(this.getAttribute('data-target'));
      this.empty = this.querySelector('[data-faq-empty]');
      if (!this.input || !this.target) return;

      this.input.addEventListener(
        'input',
        KL.debounce(() => this.filter(), 150)
      );
    }

    filter() {
      const term = this.input.value.trim().toLowerCase();
      let matches = 0;

      this.target.querySelectorAll('[data-faq-item]').forEach((item) => {
        const hit = !term || item.textContent.toLowerCase().includes(term);
        item.hidden = !hit;
        if (hit) matches += 1;
      });

      this.target.querySelectorAll('[data-faq-group]').forEach((group) => {
        group.hidden = !group.querySelector('[data-faq-item]:not([hidden])');
      });

      if (this.empty) this.empty.hidden = matches > 0;
      KL.announce(`${matches} results`);
    }
  }
  customElements.define('kl-faq-search', KLFaqSearch);

  /* ------------------------------------------------------------------------
     Country / language selectors — a native form, enhanced not replaced
     ------------------------------------------------------------------------ */

  document.addEventListener('change', (event) => {
    const select = event.target.closest('[data-localization-select]');
    if (!select) return;
    const input = select.form.querySelector(`input[name="${select.dataset.localizationSelect}"]`);
    if (input) input.value = select.value;
    select.form.submit();
  });
})();
