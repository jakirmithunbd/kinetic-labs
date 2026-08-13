/* Product finder quiz.

   No backend: answers carry product handles, the tally picks the top few, and
   the result is a cart permalink the browser can navigate to directly. */

(function () {
  'use strict';

  class KLQuiz extends HTMLElement {
    connectedCallback() {
      this.intro = this.querySelector('[data-quiz-intro]');
      this.questionsPanel = this.querySelector('[data-quiz-questions]');
      this.resultsPanel = this.querySelector('[data-quiz-results]');
      this.questions = Array.from(this.querySelectorAll('[data-quiz-question]'));
      this.stepLabel = this.querySelector('[data-quiz-step-label]');
      this.progress = this.querySelector('[data-quiz-progress]');
      this.progressFill = this.querySelector('[data-quiz-progress-fill]');
      this.backButton = this.querySelector('[data-quiz-back]');
      this.nextButton = this.querySelector('[data-quiz-next]');
      this.grid = this.querySelector('[data-quiz-result-grid]');
      this.cartLink = this.querySelector('[data-quiz-cart-link]');

      if (!this.questions.length) return;

      const data = this.querySelector('[data-quiz-products]');
      try {
        this.products = JSON.parse(data.textContent);
      } catch (e) {
        this.products = {};
      }

      this.index = 0;

      const start = this.querySelector('[data-quiz-start]');
      const restart = this.querySelector('[data-quiz-restart]');
      if (start) start.addEventListener('click', () => this.begin());
      if (restart) restart.addEventListener('click', () => this.reset());
      if (this.nextButton) this.nextButton.addEventListener('click', () => this.next());
      if (this.backButton) this.backButton.addEventListener('click', () => this.back());

      // A single-choice answer advances on its own; multi-choice waits for Next.
      this.addEventListener('change', (event) => {
        if (!event.target.matches('.quiz__answer-input')) return;
        this.syncNext();
        if (event.target.type === 'radio') {
          window.setTimeout(() => this.next(), 220);
        }
      });
    }

    begin() {
      this.intro.hidden = true;
      this.questionsPanel.hidden = false;
      this.show(0);
    }

    reset() {
      this.querySelectorAll('.quiz__answer-input').forEach((input) => {
        input.checked = false;
      });
      this.resultsPanel.hidden = true;
      this.intro.hidden = false;
      this.questionsPanel.hidden = true;
      this.index = 0;
    }

    show(index) {
      this.index = index;
      this.questions.forEach((q, i) => {
        q.hidden = i !== index;
      });

      const total = this.questions.length;
      const percent = Math.round(((index + 1) / total) * 100);

      if (this.stepLabel) {
        const template = (window.themeStrings || {}).quizStep || '';
        this.stepLabel.textContent = template
          .replace('%%current%%', index + 1)
          .replace('%%total%%', total);
      }
      if (this.progress) this.progress.setAttribute('aria-valuenow', percent);
      if (this.progressFill) this.progressFill.style.width = percent + '%';
      if (this.backButton) this.backButton.disabled = index === 0;

      this.syncNext();

      const legend = this.questions[index].querySelector('.h3');
      if (legend && window.KL) window.KL.announce(legend.textContent.trim());
    }

    syncNext() {
      if (!this.nextButton) return;
      const current = this.questions[this.index];
      const answered = !!current.querySelector('.quiz__answer-input:checked');
      this.nextButton.disabled = !answered;

      const strings = window.themeStrings || {};
      this.nextButton.textContent =
        this.index === this.questions.length - 1 ? strings.quizSeeResults : strings.quizNext;
    }

    next() {
      const current = this.questions[this.index];
      if (!current.querySelector('.quiz__answer-input:checked')) return;

      if (this.index < this.questions.length - 1) {
        this.show(this.index + 1);
      } else {
        this.finish();
      }
    }

    back() {
      if (this.index > 0) this.show(this.index - 1);
    }

    /* Tally the handles across every selected answer; most-mentioned wins. */
    tally() {
      const scores = {};
      const goals = [];

      this.querySelectorAll('.quiz__answer-input:checked').forEach((input) => {
        (input.getAttribute('data-products') || '')
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean)
          .forEach((handle) => {
            scores[handle] = (scores[handle] || 0) + 1;
          });

        const goal = input.getAttribute('data-goal');
        if (goal) goals.push(goal);
      });

      const ranked = Object.keys(scores)
        .filter((handle) => this.products[handle] && this.products[handle].available)
        .sort((a, b) => scores[b] - scores[a]);

      return { ranked: ranked, goals: goals };
    }

    finish() {
      const { ranked, goals } = this.tally();

      if (this.getAttribute('data-outcome') === 'collection') {
        const base = this.getAttribute('data-collection-url');
        if (base) {
          const url = new URL(base, window.location.origin);
          goals.forEach((goal) => url.searchParams.append('filter.p.m.custom.goal_tags', goal));
          window.location = url.toString();
          return;
        }
      }

      const limit = parseInt(this.getAttribute('data-recommend-count'), 10) || 3;
      const picks = ranked.slice(0, limit);

      this.questionsPanel.hidden = true;
      this.resultsPanel.hidden = false;
      this.resultsPanel.focus();

      this.renderPicks(picks);

      // /cart/{variant_id}:{qty},{variant_id}:{qty} — Shopify builds the cart
      // and lands the customer straight in it. No API call needed.
      if (this.cartLink) {
        if (!picks.length) {
          this.cartLink.hidden = true;
        } else {
          this.cartLink.hidden = false;
          const permalink = picks.map((handle) => `${this.products[handle].id}:1`).join(',');
          this.cartLink.href = `${window.routes.cart_url}/${permalink}`;
        }
      }
    }

    renderPicks(picks) {
      if (!this.grid) return;
      this.grid.innerHTML = '';

      picks.forEach((handle) => {
        const product = this.products[handle];
        const li = document.createElement('li');
        li.className = 'quiz__result';

        const link = document.createElement('a');
        link.className = 'quiz__result-link';
        link.href = product.url;

        if (product.image) {
          const img = document.createElement('img');
          img.src = product.image;
          img.alt = '';
          img.loading = 'lazy';
          img.width = 200;
          img.height = 200;
          img.className = 'quiz__result-image';
          link.appendChild(img);
        }

        const title = document.createElement('span');
        title.className = 'quiz__result-title';
        title.textContent = product.title;
        link.appendChild(title);

        const price = document.createElement('span');
        price.className = 'quiz__result-price data';
        price.textContent = product.price;
        link.appendChild(price);

        li.appendChild(link);
        this.grid.appendChild(li);
      });
    }
  }

  customElements.define('kl-quiz', KLQuiz);
})();
