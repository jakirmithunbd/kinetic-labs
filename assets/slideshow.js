/* Slideshow — scroll-snap based.

   The viewport is a native horizontal scroller, so touch swipe and keyboard
   scrolling already work. This file adds arrows, dots and optional autoplay,
   and gets out of the way entirely for reduced-motion visitors. */

(function () {
  'use strict';

  class KLSlideshow extends HTMLElement {
    connectedCallback() {
      this.viewport = this.querySelector('[data-slideshow-viewport]');
      this.slides = Array.from(this.querySelectorAll('[data-slideshow-slide]'));
      this.dots = Array.from(this.querySelectorAll('[data-slideshow-dot]'));
      if (!this.viewport || this.slides.length < 2) return;

      this.index = 0;
      this.playing = false;

      const prev = this.querySelector('[data-slideshow-prev]');
      const next = this.querySelector('[data-slideshow-next]');
      const toggle = this.querySelector('[data-slideshow-toggle]');

      if (prev) prev.addEventListener('click', () => this.go(-1));
      if (next) next.addEventListener('click', () => this.go(1));
      if (toggle) toggle.addEventListener('click', () => (this.playing ? this.pause() : this.play()));

      this.dots.forEach((dot) => {
        dot.addEventListener('click', () => this.goTo(parseInt(dot.getAttribute('data-slideshow-dot'), 10)));
      });

      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.intersectionRatio < 0.6) return;
              this.index = this.slides.indexOf(entry.target);
              this.syncDots();
            });
          },
          { root: this.viewport, threshold: 0.6 }
        );
        this.slides.forEach((slide) => this.observer.observe(slide));
      }

      if (this.hasAttribute('data-autoplay')) this.play();

      this.addEventListener('mouseenter', () => this.pause(true));
      this.addEventListener('focusin', () => this.pause(true));
    }

    goTo(index) {
      const target = this.slides[index];
      if (!target) return;
      this.viewport.scrollTo({
        left: target.offsetLeft - this.viewport.offsetLeft,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }

    go(direction) {
      this.goTo((this.index + direction + this.slides.length) % this.slides.length);
    }

    syncDots() {
      this.dots.forEach((dot, i) => {
        const active = i === this.index;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    play() {
      // Auto-advancing carousels are hostile to anyone who asked for less
      // motion, so autoplay simply never starts for them.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const interval = parseInt(this.getAttribute('data-autoplay'), 10);
      if (!interval) return;
      this.playing = true;
      clearInterval(this.timer);
      this.timer = setInterval(() => this.go(1), interval);
    }

    pause() {
      this.playing = false;
      clearInterval(this.timer);
    }

    disconnectedCallback() {
      clearInterval(this.timer);
      this.observer && this.observer.disconnect();
    }
  }

  customElements.define('kl-slideshow', KLSlideshow);
})();
