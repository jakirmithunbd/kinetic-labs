/* Announcement bar — rotation and dismissal.
   Rotation pauses on hover and on focus, and never runs for visitors who ask
   for reduced motion. */

(function () {
  'use strict';

  class KLAnnouncementBar extends HTMLElement {
    connectedCallback() {
      this.storageKey = this.getAttribute('data-storage-key');

      if (this.storageKey && this.isDismissed()) {
        this.remove();
        return;
      }

      this.slides = Array.from(this.querySelectorAll('[data-announcement-slide]'));
      this.index = 0;

      const dismiss = this.querySelector('[data-announcement-dismiss]');
      if (dismiss) dismiss.addEventListener('click', () => this.dismiss());

      const prev = this.querySelector('[data-announcement-prev]');
      const next = this.querySelector('[data-announcement-next]');
      if (prev) prev.addEventListener('click', () => this.go(-1));
      if (next) next.addEventListener('click', () => this.go(1));

      if (this.hasAttribute('data-rotate') && this.slides.length > 1) this.startRotation();
    }

    isDismissed() {
      try {
        return sessionStorage.getItem(this.storageKey) === '1';
      } catch (e) {
        return false;
      }
    }

    dismiss() {
      try {
        sessionStorage.setItem(this.storageKey, '1');
      } catch (e) {
        /* no storage — the bar simply comes back next page load */
      }
      this.remove();
    }

    go(direction) {
      this.slides[this.index].hidden = true;
      this.index = (this.index + direction + this.slides.length) % this.slides.length;
      this.slides[this.index].hidden = false;
    }

    startRotation() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const interval = parseInt(this.getAttribute('data-interval'), 10) || 6000;
      const tick = () => this.go(1);

      this.timer = setInterval(tick, interval);

      const pause = () => clearInterval(this.timer);
      const resume = () => {
        clearInterval(this.timer);
        this.timer = setInterval(tick, interval);
      };

      this.addEventListener('mouseenter', pause);
      this.addEventListener('mouseleave', resume);
      this.addEventListener('focusin', pause);
      this.addEventListener('focusout', resume);

      document.addEventListener('visibilitychange', () => {
        document.hidden ? pause() : resume();
      });
    }

    disconnectedCallback() {
      clearInterval(this.timer);
    }
  }

  customElements.define('kl-announcement-bar', KLAnnouncementBar);
})();
