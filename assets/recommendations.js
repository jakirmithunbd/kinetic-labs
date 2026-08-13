/* Product recommendations — fetches itself when Shopify hasn't resolved the
   list server-side yet, and removes itself entirely when there's nothing to
   show rather than leaving an empty heading on the page. */

(function () {
  'use strict';

  class KLRecommendations extends HTMLElement {
    connectedCallback() {
      if (!this.hasAttribute('data-empty')) return;

      const url = this.getAttribute('data-url');
      if (!url) return;

      fetch(url)
        .then((r) => r.text())
        .then((text) => {
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const source = doc.querySelector('kl-recommendations');
          if (!source || !source.innerHTML.trim()) {
            this.remove();
            return;
          }
          this.innerHTML = source.innerHTML;
          this.removeAttribute('data-empty');
          window.KL && window.KL.initReveal && window.KL.initReveal(this);
        })
        .catch(() => this.remove());
    }
  }

  customElements.define('kl-recommendations', KLRecommendations);
})();
