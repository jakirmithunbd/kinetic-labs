/* Product gallery — thumbnails, swipe, variant grouping, hover zoom.

   On mobile the viewport is a scroll-snap carousel, so swiping is native and
   costs no JavaScript. On desktop only one slide is shown at a time and the
   thumbnails drive it. */

(function () {
  'use strict';

  class KLProductGallery extends HTMLElement {
    connectedCallback() {
      this.viewport = this.querySelector('[data-gallery-viewport]');
      this.slides = Array.from(this.querySelectorAll('.product-gallery__slide'));
      this.thumbs = Array.from(this.querySelectorAll('[data-gallery-thumb]'));
      this.groupByVariant = this.getAttribute('data-group-by-variant') === 'true';

      this.thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          this.select(thumb.getAttribute('data-media-id'), true);
        });
      });

      // Keep the thumbnails in step when the customer swipes the carousel.
      if ('IntersectionObserver' in window && this.viewport) {
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.intersectionRatio < 0.6) return;
              this.markActive(entry.target.getAttribute('data-media-id'));
            });
          },
          { root: this.viewport, threshold: 0.6 }
        );
        this.slides.forEach((slide) => this.observer.observe(slide));
      }

      if (this.getAttribute('data-zoom') === 'true') this.initZoom();
    }

    /* Called by product.js when the variant changes. */
    showMedia(mediaId, variantId) {
      if (this.groupByVariant && variantId) this.filterByVariant(variantId);
      if (mediaId) this.select(String(mediaId), false);
    }

    // Show only the media assigned to this variant. If none is assigned,
    // show everything rather than an empty gallery.
    filterByVariant(variantId) {
      const scoped = this.slides.filter((slide) => {
        const ids = (slide.getAttribute('data-variant-ids') || '').split(' ');
        return ids.includes(String(variantId));
      });

      const shown = scoped.length ? scoped : this.slides;

      this.slides.forEach((slide) => {
        slide.hidden = !shown.includes(slide);
      });

      this.thumbs.forEach((thumb) => {
        const id = thumb.getAttribute('data-media-id');
        thumb.hidden = !shown.some((slide) => slide.getAttribute('data-media-id') === id);
      });
    }

    select(mediaId, scrollIntoView) {
      const slide = this.slides.find((s) => s.getAttribute('data-media-id') === String(mediaId));
      if (!slide || slide.hidden) return;

      this.slides.forEach((s) => {
        s.classList.toggle('is-active', s === slide);
        s.toggleAttribute('data-inactive', s !== slide);
      });

      this.markActive(mediaId);

      if (scrollIntoView && this.viewport) {
        this.viewport.scrollTo({
          left: slide.offsetLeft - this.viewport.offsetLeft,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        });
      }

      // Pause any video that just scrolled out of view.
      this.slides.forEach((s) => {
        if (s === slide) return;
        const video = s.querySelector('video');
        if (video && !video.paused) video.pause();
      });
    }

    markActive(mediaId) {
      this.thumbs.forEach((thumb) => {
        const active = thumb.getAttribute('data-media-id') === String(mediaId);
        thumb.classList.toggle('is-active', active);
        thumb.setAttribute('aria-current', active ? 'true' : 'false');
      });
    }

    /* Hover zoom: pointer only, and never on a touch device where it would
       just fight with scrolling. */
    initZoom() {
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

      this.querySelectorAll('.product-gallery__slide[data-media-type="image"]').forEach((slide) => {
        const img = slide.querySelector('img');
        if (!img) return;

        const media = slide.querySelector('.product-gallery__media');
        media.classList.add('media--zoomable');

        media.addEventListener('mouseenter', () => {
          const zoomSrc = img.getAttribute('data-zoom-src');
          if (zoomSrc && media.style.backgroundImage === '') {
            media.style.backgroundImage = `url(${zoomSrc})`;
          }
          media.classList.add('is-zooming');
        });

        media.addEventListener('mousemove', (event) => {
          const rect = media.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * 100;
          const y = ((event.clientY - rect.top) / rect.height) * 100;
          media.style.backgroundPosition = `${x}% ${y}%`;
        });

        media.addEventListener('mouseleave', () => {
          media.classList.remove('is-zooming');
        });
      });
    }

    disconnectedCallback() {
      this.observer && this.observer.disconnect();
    }
  }

  customElements.define('kl-product-gallery', KLProductGallery);
})();
