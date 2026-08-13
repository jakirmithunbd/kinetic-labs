/* Batch / certificate-of-analysis lookup.

   Matches the typed batch number against the coa_batch records rendered into
   the page. No request, no backend — and when an external endpoint is
   configured the form is left alone to submit normally. */

(function () {
  'use strict';

  class KLCoaLookup extends HTMLElement {
    connectedCallback() {
      // An external endpoint means a real form submission; don't intercept.
      if (this.hasAttribute('data-endpoint')) return;

      this.form = this.querySelector('form');
      this.input = this.querySelector('[data-coa-input]');
      this.result = this.querySelector('[data-coa-result]');
      const data = this.querySelector('[data-coa-data]');
      if (!this.form || !this.input || !this.result || !data) return;

      try {
        this.batches = JSON.parse(data.textContent);
      } catch (e) {
        this.batches = [];
      }

      this.form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.lookup();
      });
    }

    lookup() {
      const term = this.input.value.trim().toUpperCase();
      const strings = window.themeStrings || {};

      if (!term) {
        this.result.innerHTML = '';
        return;
      }

      const match = this.batches.find((b) => b.batch === term);

      if (!match) {
        this.result.innerHTML =
          '<p class="form-status form-status--error">' + (strings.coaNoResult || '') + '</p>';
        return;
      }

      const parts = [];
      parts.push('<p class="coa__match-title">' + this.escape(match.product || match.batch) + '</p>');
      parts.push('<p class="coa__match-meta label-micro">' + this.escape(match.batch) +
        (match.date ? ' &middot; ' + this.escape(match.date) : '') + '</p>');
      if (match.file) {
        parts.push('<a class="button button--secondary" href="' + this.escape(match.file) +
          '" download>' + (strings.coaDownload || '') + '</a>');
      }

      this.result.innerHTML = '<div class="coa__match">' + parts.join('') + '</div>';
    }

    escape(value) {
      const div = document.createElement('div');
      div.textContent = value == null ? '' : String(value);
      return div.innerHTML;
    }
  }

  customElements.define('kl-coa-lookup', KLCoaLookup);
})();
