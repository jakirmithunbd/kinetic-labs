/* ==========================================================================
   Kinetic Labs — cart.js
   Every cart mutation goes through the Cart Ajax API and re-renders the
   affected sections with the Section Rendering API. Forms still post normally
   if this file fails to load.
   ========================================================================== */

(function () {
  'use strict';

  const KL = (window.KL = window.KL || {});
  const routes = window.routes || {};

  /* ------------------------------------------------------------------------
     Section registry — anything that renders cart state registers itself so a
     single mutation can refresh the drawer, the cart page, and the header
     count in one round trip.
     ------------------------------------------------------------------------ */

  KL.cartSections = new Set();

  KL.registerCartSection = function (id, selector) {
    KL.cartSections.add({ id: id, selector: selector || `#shopify-section-${id}` });
  };

  function sectionsToRequest() {
    return Array.from(KL.cartSections)
      .map((s) => s.id)
      .join(',');
  }

  function renderSections(sections) {
    if (!sections) return;

    KL.cartSections.forEach(({ id, selector }) => {
      const html = sections[id];
      const target = document.querySelector(selector);
      if (!html || !target) return;

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const source = doc.querySelector(selector) || doc.querySelector(`#shopify-section-${id}`);
      if (!source) return;

      target.innerHTML = source.innerHTML;
      KL.initReveal && KL.initReveal(target);
    });

    document.dispatchEvent(new CustomEvent('cart:rendered'));
  }

  /* ------------------------------------------------------------------------
     Core operations
     ------------------------------------------------------------------------ */

  function request(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.description || data.message || 'Cart error');
        error.data = data;
        throw error;
      }
      return data;
    });
  }

  KL.cart = {
    add(items, extra) {
      const payload = Object.assign(
        { items: Array.isArray(items) ? items : [items], sections: sectionsToRequest() },
        extra || {}
      );
      return request(routes.cart_add_url, payload).then((data) => {
        renderSections(data.sections);
        document.dispatchEvent(new CustomEvent('cart:added', { detail: { items: data.items || [data] } }));
        return data;
      });
    },

    change(payload) {
      return request(
        routes.cart_change_url,
        Object.assign({ sections: sectionsToRequest() }, payload)
      ).then((data) => {
        renderSections(data.sections);
        document.dispatchEvent(new CustomEvent('cart:changed', { detail: { cart: data } }));
        return data;
      });
    },

    update(payload) {
      return request(
        routes.cart_update_url,
        Object.assign({ sections: sectionsToRequest() }, payload)
      ).then((data) => {
        renderSections(data.sections);
        document.dispatchEvent(new CustomEvent('cart:changed', { detail: { cart: data } }));
        return data;
      });
    },

    get() {
      return fetch(`${routes.cart_url}.js`).then((r) => r.json());
    }
  };

  function openCartDrawer() {
    if (window.shopSettings && window.shopSettings.cartType !== 'drawer') return false;
    const drawer = document.getElementById('CartDrawer');
    if (!drawer || typeof drawer.open !== 'function') return false;
    drawer.open();
    return true;
  }

  /* ------------------------------------------------------------------------
     <kl-product-form> — add to cart
     ------------------------------------------------------------------------ */

  class KLProductForm extends HTMLElement {
    connectedCallback() {
      this.form = this.querySelector('form');
      if (!this.form) return;

      this.submitButton = this.querySelector('[type="submit"]');
      this.errorTarget = this.querySelector('[data-form-error]');

      this.form.addEventListener('submit', (event) => this.onSubmit(event));
    }

    onSubmit(event) {
      if (this.submitButton && this.submitButton.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      this.setLoading(true);
      this.setError('');

      const formData = new FormData(this.form);
      const items = [
        {
          id: Number(formData.get('id')),
          quantity: Number(formData.get('quantity') || 1)
        }
      ];

      const sellingPlan = formData.get('selling_plan');
      if (sellingPlan) items[0].selling_plan = Number(sellingPlan);

      // Line item properties, e.g. gift messages or quiz attribution.
      const properties = {};
      formData.forEach((value, key) => {
        const match = key.match(/^properties\[(.+)\]$/);
        if (match && value) properties[match[1]] = value;
      });
      if (Object.keys(properties).length) items[0].properties = properties;

      KL.cart
        .add(items)
        .then(() => {
          KL.announce(this.getAttribute('data-added-message') || 'Added to cart');
          if (!openCartDrawer()) {
            window.location = routes.cart_url;
          }
        })
        .catch((error) => {
          this.setError(error.message);
          KL.announce(error.message);
        })
        .finally(() => this.setLoading(false));
    }

    setLoading(loading) {
      if (!this.submitButton) return;
      this.submitButton.classList.toggle('is-loading', loading);
      this.submitButton.setAttribute('aria-busy', loading ? 'true' : 'false');
      this.submitButton.disabled = loading;
    }

    setError(message) {
      if (!this.errorTarget) return;
      this.errorTarget.textContent = message;
      this.errorTarget.hidden = !message;
    }
  }
  customElements.define('kl-product-form', KLProductForm);

  /* ------------------------------------------------------------------------
     <kl-cart-items> — quantity steppers and remove links inside cart UI
     ------------------------------------------------------------------------ */

  class KLCartItems extends HTMLElement {
    connectedCallback() {
      this.addEventListener('change', (event) => {
        const input = event.target.closest('[data-cart-quantity]');
        if (!input) return;
        this.updateLine(input.dataset.line, parseInt(input.value, 10));
      });

      this.addEventListener('click', (event) => {
        const remove = event.target.closest('[data-cart-remove]');
        if (!remove) return;
        event.preventDefault();
        this.updateLine(remove.dataset.line, 0);
      });
    }

    updateLine(line, quantity) {
      if (!line || isNaN(quantity)) return;
      this.classList.add('is-loading');
      this.setAttribute('aria-busy', 'true');

      KL.cart
        .change({ line: Number(line), quantity: quantity })
        .then((cart) => {
          KL.announce(
            quantity === 0
              ? 'Item removed'
              : `Cart updated, ${cart.item_count} items`
          );
        })
        .catch((error) => KL.announce(error.message))
        .finally(() => {
          this.classList.remove('is-loading');
          this.removeAttribute('aria-busy');
        });
    }
  }
  customElements.define('kl-cart-items', KLCartItems);

  /* ------------------------------------------------------------------------
     Cart note — debounced, saved without a page reload
     ------------------------------------------------------------------------ */

  document.addEventListener('input', (event) => {
    const note = event.target.closest('[data-cart-note]');
    if (!note) return;

    clearTimeout(note._timer);
    note._timer = setTimeout(() => {
      fetch(routes.cart_update_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.value })
      }).catch(() => {});
    }, 500);
  });

  /* ------------------------------------------------------------------------
     <kl-quick-add> — add straight from a product card, or open the flavour
     picker when the product has more than one variant
     ------------------------------------------------------------------------ */

  class KLQuickAdd extends HTMLElement {
    connectedCallback() {
      this.button = this.querySelector('button');
      if (!this.button) return;

      this.button.addEventListener('click', (event) => {
        event.preventDefault();

        const variantId = this.getAttribute('data-variant-id');
        if (variantId) {
          this.add(Number(variantId));
          return;
        }

        // Multi-variant: pull the product's picker into a modal instead of
        // guessing which flavour they wanted.
        this.openPicker();
      });
    }

    add(id) {
      this.button.classList.add('is-loading');
      KL.cart
        .add({ id: id, quantity: 1 })
        .then(() => {
          KL.announce('Added to cart');
          openCartDrawer();
        })
        .catch((error) => KL.announce(error.message))
        .finally(() => this.button.classList.remove('is-loading'));
    }

    openPicker() {
      const modal = document.getElementById('QuickAddModal');
      if (!modal) {
        window.location = this.getAttribute('data-product-url');
        return;
      }
      modal.loadProduct(this.getAttribute('data-product-url'), this.button);
    }
  }
  customElements.define('kl-quick-add', KLQuickAdd);

  /* ------------------------------------------------------------------------
     <kl-quick-add-modal>
     ------------------------------------------------------------------------ */

  class KLQuickAddModal extends HTMLElement {
    connectedCallback() {
      this.body = this.querySelector('[data-quick-add-body]');
      this.drawer = this.closest('kl-drawer') || this;
    }

    loadProduct(url, opener) {
      if (!url || !this.body) return;

      this.body.setAttribute('aria-busy', 'true');
      if (this.drawer && typeof this.drawer.open === 'function') this.drawer.open(opener);

      fetch(`${url}?section_id=quick-add`)
        .then((r) => r.text())
        .then((text) => {
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const content = doc.querySelector('[data-quick-add-content]');
          this.body.innerHTML = content ? content.innerHTML : '';
        })
        .catch(() => {
          window.location = url;
        })
        .finally(() => this.body.removeAttribute('aria-busy'));
    }
  }
  customElements.define('kl-quick-add-modal', KLQuickAddModal);
})();
