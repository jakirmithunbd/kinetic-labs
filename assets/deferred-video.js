/* Click-to-load embeds.

   Nothing is requested from YouTube or Vimeo until the visitor presses play —
   which keeps third-party JavaScript off the critical path and out of the
   Lighthouse budget, and means no tracking cookie is set for someone who
   never watched the video. */

(function () {
  'use strict';

  class KLDeferredVideo extends HTMLElement {
    connectedCallback() {
      const button = this.querySelector('[data-video-play]');
      if (!button) return;
      button.addEventListener('click', () => this.load());
    }

    load() {
      const type = this.getAttribute('data-type');
      const id = this.getAttribute('data-id');
      if (!id) return;

      const src =
        type === 'vimeo'
          ? `https://player.vimeo.com/video/${id}?autoplay=1`
          : `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;

      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = this.getAttribute('data-title') || 'Video';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.className = 'video-block__iframe';

      this.innerHTML = '';
      this.appendChild(iframe);
      iframe.focus();
    }
  }

  customElements.define('kl-deferred-video', KLDeferredVideo);
})();
