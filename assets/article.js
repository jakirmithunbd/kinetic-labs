/* Table of contents, generated from the article's own headings.

   Building it from the rendered body means the merchant writes the article
   once — there is no second list of headings to keep in sync, and it can
   never go stale. */

(function () {
  'use strict';

  class KLToc extends HTMLElement {
    connectedCallback() {
      const source = document.getElementById(this.getAttribute('data-source'));
      const list = document.getElementById(this.getAttribute('data-list'));
      if (!source || !list) return;

      const headings = Array.from(source.querySelectorAll('h2'));
      if (headings.length < 2) {
        // One heading isn't a table of contents.
        this.closest('.article-toc')?.remove();
        return;
      }

      headings.forEach((heading, index) => {
        if (!heading.id) {
          const slug = heading.textContent
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
          heading.id = slug || `section-${index + 1}`;
        }

        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${heading.id}`;
        link.textContent = heading.textContent;
        link.className = 'article-toc__link';
        li.appendChild(link);
        list.appendChild(li);
      });

      if (!('IntersectionObserver' in window)) return;

      const links = Array.from(list.querySelectorAll('a'));
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            links.forEach((link) => {
              link.classList.toggle('is-active', link.hash === `#${entry.target.id}`);
            });
          });
        },
        { rootMargin: '-20% 0px -70% 0px' }
      );

      headings.forEach((heading) => observer.observe(heading));
    }
  }

  customElements.define('kl-toc', KLToc);
})();
