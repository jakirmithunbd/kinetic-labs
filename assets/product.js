/* ==========================================================================
   Kinetic Labs — product.js
   Variant selection, purchase options, sticky add-to-cart, gallery sync,
   share.

   Variant state is resolved client-side from a payload Liquid rendered, so
   money formatting, Markets presentment currency and B2B catalogue pricing
   are already correct — JavaScript only swaps strings, it never does maths on
   prices.
   ========================================================================== */

(function () {
  'use strict';

  const KL = (window.KL = window.KL || {});

  /* ------------------------------------------------------------------------
     <kl-variant-state> — the single source of truth for the selected variant
     ------------------------------------------------------------------------ */

  class KLVariantState extends HTMLElement {
    connectedCallback() {
      const dataEl = this.querySelector('[data-variant-data]');
      if (!dataEl) return;

      try {
        this.data = JSON.parse(dataEl.textContent);
      } catch (e) {
        return;
      }

      this.root = this.closest('.product-info') || document;
      this.sectionId = this.getAttribute('data-section');
      this.pickers = Array.from(this.root.querySelectorAll('[data-option-picker]'));

      this.selection = this.readSelection();
      this.current = this.matchVariant(this.selection);

      this.pickers.forEach((picker) => {
        picker.addEventListener('change', (event) => {
          if (!event.target.matches('[data-option-value]')) return;
          this.selection = this.readSelection();
          this.onSelectionChange();
        });
      });

      this.refreshAvailability();
    }

    readSelection() {
      const values = [];
      this.pickers.forEach((picker) => {
        const position = parseInt(picker.getAttribute('data-option-position'), 10);
        const checked = picker.querySelector('[data-option-value]:checked');
        if (checked) values[position - 1] = checked.value;
      });
      return values;
    }

    matchVariant(selection) {
      // A picker may be missing (a merchant removed the size block), so match
      // on the options we actually know about rather than requiring all.
      return (
        this.data.variants.find((variant) =>
          selection.every((value, index) => value === undefined || variant.options[index] === value)
        ) || null
      );
    }

    onSelectionChange() {
      const variant = this.matchVariant(this.selection);
      this.current = variant;

      this.refreshAvailability();
      this.updateSelectedLabels();
      this.updateForm(variant);
      this.updatePrices(variant);
      this.updateInventory(variant);
      this.updateQuantityRules(variant);
      this.updateUrl(variant);

      this.dispatchEvent(
        new CustomEvent('variant:change', { bubbles: true, detail: { variant: variant } })
      );
    }

    /* A value is offered if some variant exists that matches it plus every
       other currently-selected option. That's what stops a customer picking
       Watermelon + 2kg when only 1kg comes in Watermelon. */
    refreshAvailability() {
      this.pickers.forEach((picker) => {
        const position = parseInt(picker.getAttribute('data-option-position'), 10);
        const index = position - 1;

        picker.querySelectorAll('[data-option-value]').forEach((input) => {
          const candidate = this.selection.slice();
          candidate[index] = input.value;

          const match = this.data.variants.find((variant) =>
            candidate.every((value, i) => value === undefined || variant.options[i] === value)
          );

          const available = !!(match && match.available);
          input.toggleAttribute('data-unavailable', !available);
          input.setAttribute('aria-disabled', available ? 'false' : 'false');
          // Left selectable on purpose: choosing a sold-out flavour should show
          // the sold-out state, not silently do nothing.
        });
      });
    }

    updateSelectedLabels() {
      this.pickers.forEach((picker) => {
        const checked = picker.querySelector('[data-option-value]:checked');
        const label = picker.querySelector('[data-option-selected]');
        if (checked && label) label.textContent = checked.value;
      });
    }

    updateForm(variant) {
      const input = this.root.querySelector('[data-variant-input]');
      const button = this.root.querySelector('[data-add-to-cart]');
      const buttonText = this.root.querySelector('[data-add-to-cart-text]');
      const stickyButton = document.querySelector('.sticky-atc__button');

      if (input) {
        input.value = variant ? variant.id : '';
        input.disabled = !variant || !variant.available;
      }

      const strings = window.themeStrings || {};
      let label = strings.addToCart || 'Add to cart';
      if (!variant) label = strings.unavailable || 'Unavailable';
      else if (!variant.available) label = strings.soldOut || 'Sold out';

      const disabled = !variant || !variant.available;

      [button, stickyButton].forEach((el) => {
        if (!el) return;
        el.disabled = disabled;
        el.setAttribute('aria-disabled', disabled ? 'true' : 'false');
      });

      if (buttonText) {
        const priceSpan = buttonText.querySelector('[data-add-to-cart-price]');
        buttonText.childNodes[0].nodeValue = label;
        if (priceSpan) priceSpan.hidden = disabled;
      }
      if (stickyButton) stickyButton.textContent = label;
    }

    updatePrices(variant) {
      if (!variant) return;

      const oneTimePrice = this.root.querySelector('[data-one-time-price]');
      if (oneTimePrice) oneTimePrice.textContent = variant.price;

      const buttonPrice = this.root.querySelector('[data-add-to-cart-price]');
      const stickyPrice = document.querySelector('[data-sticky-price]');

      const planInput = this.root.querySelector('[data-purchase-option="subscribe"]');
      const usingPlan = planInput && planInput.checked;
      const planId = usingPlan ? planInput.value : null;
      const allocation = planId ? variant.sellingPlanAllocations[planId] : null;

      const activePrice = allocation ? allocation.price : variant.price;
      if (buttonPrice) buttonPrice.textContent = ' — ' + activePrice;
      if (stickyPrice) stickyPrice.textContent = activePrice;

      // Size cards carry their own price and per-serve figure.
      const perServing = this.root.querySelector('[data-per-serving]');
      if (perServing) {
        perServing.textContent = variant.perServing || '';
        perServing.hidden = !variant.perServing;
      }

      const planPrice = this.root.querySelector('[data-plan-price]');
      const planSaving = this.root.querySelector('[data-plan-saving]');
      const defaultAllocation = planInput ? variant.sellingPlanAllocations[planInput.value] : null;
      if (planPrice && defaultAllocation) planPrice.textContent = defaultAllocation.price;
      if (planSaving && defaultAllocation) {
        planSaving.hidden = !defaultAllocation.saving;
        if (defaultAllocation.saving) {
          const template = planSaving.getAttribute('data-saving-template') || '%%';
          planSaving.textContent = template.replace('%%', defaultAllocation.saving);
        }
      }
    }

    updateInventory(variant) {
      const target = this.root.querySelector('[data-inventory-status]');
      if (!target || !variant) return;

      const strings = window.themeStrings || {};
      const threshold = this.data.lowStockThreshold || 0;
      const tracked = variant.inventoryManagement === 'shopify';
      let dot = 'in';
      let text = strings.inStock;

      if (!variant.available) {
        dot = 'out';
        text = strings.outOfStock;
      } else if (tracked && variant.inventoryQuantity > 0 && variant.inventoryQuantity <= threshold) {
        dot = 'low';
        text = (strings.lowStock || '%%').replace('%%', variant.inventoryQuantity);
      } else if (tracked && variant.inventoryQuantity <= 0 && variant.inventoryPolicy === 'continue') {
        dot = 'low';
        text = strings.backorder;
      }

      target.innerHTML = `<span class="inventory-status__dot inventory-status__dot--${dot}" aria-hidden="true"></span><span class="label-micro">${text}</span>`;
    }

    updateQuantityRules(variant) {
      const input = this.root.querySelector('[data-quantity-input]');
      if (!input || !variant) return;

      const rule = variant.quantityRule || {};
      input.min = rule.min || 1;
      input.step = rule.increment || 1;

      if (rule.max) {
        input.max = rule.max;
      } else if (variant.inventoryManagement === 'shopify' && variant.inventoryPolicy === 'deny') {
        input.max = variant.inventoryQuantity;
      } else {
        input.removeAttribute('max');
      }

      const stepper = input.closest('kl-quantity');
      if (stepper && typeof stepper.validate === 'function') stepper.validate();
    }

    // Deep-linkable variant URLs, without adding a history entry per tap.
    updateUrl(variant) {
      if (!variant || !window.history.replaceState) return;
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({ variant: variant.id }, '', url.toString());
    }
  }
  customElements.define('kl-variant-state', KLVariantState);

  /* ------------------------------------------------------------------------
     <kl-purchase-options>
     ------------------------------------------------------------------------ */

  class KLPurchaseOptions extends HTMLElement {
    connectedCallback() {
      this.root = this.closest('.product-info') || document;
      this.interval = this.querySelector('[data-plan-interval]');
      this.select = this.querySelector('[data-plan-select]');
      this.subscribeInput = this.querySelector('[data-purchase-option="subscribe"]');

      this.addEventListener('change', (event) => {
        if (event.target.matches('[data-purchase-option]')) this.onModeChange();
        if (event.target.matches('[data-plan-select]')) this.onPlanChange();
      });

      this.sync();
    }

    onModeChange() {
      const subscribing = this.subscribeInput && this.subscribeInput.checked;
      if (this.interval) this.interval.hidden = !subscribing;
      this.sync();
    }

    onPlanChange() {
      if (this.subscribeInput && this.select) this.subscribeInput.value = this.select.value;
      this.sync();
    }

    sync() {
      const hidden = this.root.querySelector('[data-selling-plan-input]');
      const subscribing = this.subscribeInput && this.subscribeInput.checked;
      const planId = subscribing ? (this.select ? this.select.value : this.subscribeInput.value) : '';

      if (hidden) hidden.value = planId;

      const state = this.root.querySelector('kl-variant-state');
      if (state && typeof state.updatePrices === 'function') state.updatePrices(state.current);
    }
  }
  customElements.define('kl-purchase-options', KLPurchaseOptions);

  /* ------------------------------------------------------------------------
     <kl-sticky-atc> — appears once the real button has scrolled away
     ------------------------------------------------------------------------ */

  class KLStickyAtc extends HTMLElement {
    connectedCallback() {
      const anchor = document.querySelector('[data-add-to-cart]');
      if (!anchor || !('IntersectionObserver' in window)) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          this.hidden = entry.isIntersecting || entry.boundingClientRect.top > 0;
        },
        { threshold: 0 }
      );

      observer.observe(anchor);
    }
  }
  customElements.define('kl-sticky-atc', KLStickyAtc);

  /* ------------------------------------------------------------------------
     <kl-share>
     ------------------------------------------------------------------------ */

  class KLShare extends HTMLElement {
    connectedCallback() {
      this.trigger = this.querySelector('[data-share-trigger]');
      this.fallback = this.querySelector('[data-share-fallback]');
      this.status = this.querySelector('[data-share-status]');
      this.copyButton = this.querySelector('[data-share-copy]');

      if (!this.trigger) return;

      this.trigger.addEventListener('click', () => {
        const payload = {
          title: this.getAttribute('data-title'),
          url: this.getAttribute('data-url')
        };

        if (navigator.share) {
          navigator.share(payload).catch(() => {});
        } else if (this.fallback) {
          this.fallback.hidden = !this.fallback.hidden;
        }
      });

      if (this.copyButton) {
        this.copyButton.addEventListener('click', () => {
          const input = this.querySelector('.share__input');
          navigator.clipboard
            .writeText(input.value)
            .then(() => this.announce())
            .catch(() => {
              input.select();
              document.execCommand('copy');
              this.announce();
            });
        });
      }
    }

    announce() {
      if (!this.status) return;
      this.status.hidden = false;
      this.status.textContent = (window.themeStrings || {}).linkCopied || '';
      setTimeout(() => {
        this.status.hidden = true;
      }, 2500);
    }
  }
  customElements.define('kl-share', KLShare);

  /* ------------------------------------------------------------------------
     Gallery ↔ variant sync
     ------------------------------------------------------------------------ */

  document.addEventListener('variant:change', (event) => {
    const variant = event.detail.variant;
    const gallery = document.querySelector('kl-product-gallery');
    if (gallery && variant && typeof gallery.showMedia === 'function') {
      gallery.showMedia(variant.featuredMediaId, variant.id);
    }
  });
})();
