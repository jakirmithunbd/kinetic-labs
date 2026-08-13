/* Shipping estimator — /cart/shipping_rates.json */

(function () {
  'use strict';

  const root = document.querySelector('.shipping-estimator');
  if (!root) return;

  const countrySelect = root.querySelector('[data-estimator-country]');
  const provinceWrapper = root.querySelector('[data-estimator-province-wrapper]');
  const provinceSelect = root.querySelector('[data-estimator-province]');
  const zipInput = root.querySelector('[data-estimator-zip]');
  const submit = root.querySelector('[data-estimator-submit]');
  const results = root.querySelector('[data-estimator-results]');

  // Shopify's country_option_tags carry their provinces as a data attribute.
  function syncProvinces() {
    const option = countrySelect.selectedOptions[0];
    if (!option) return;

    let provinces = [];
    try {
      provinces = JSON.parse(option.getAttribute('data-provinces') || '[]');
    } catch (e) {
      provinces = [];
    }

    provinceSelect.innerHTML = '';
    if (!provinces.length) {
      provinceWrapper.hidden = true;
      return;
    }

    provinces.forEach((pair) => {
      const opt = document.createElement('option');
      opt.value = pair[0];
      opt.textContent = pair[1];
      provinceSelect.appendChild(opt);
    });
    provinceWrapper.hidden = false;
  }

  countrySelect.addEventListener('change', syncProvinces);
  syncProvinces();

  submit.addEventListener('click', () => {
    const params = new URLSearchParams({
      'shipping_address[country]': countrySelect.value,
      'shipping_address[province]': provinceWrapper.hidden ? '' : provinceSelect.value,
      'shipping_address[zip]': zipInput.value
    });

    results.textContent = '';
    submit.setAttribute('aria-busy', 'true');

    fetch(`${window.routes.cart_url}/shipping_rates.json?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const rates = data.shipping_rates || [];
        if (!rates.length) {
          results.innerHTML = '<p class="text-caption text-muted">No shipping rates found for that address.</p>';
          return;
        }

        const list = document.createElement('ul');
        list.className = 'list-unstyled shipping-estimator__rates';
        rates.forEach((rate) => {
          const li = document.createElement('li');
          li.className = 'shipping-estimator__rate';
          li.innerHTML = `<span>${rate.name}</span> <span class="data">${window.KL.formatMoney(
            Math.round(parseFloat(rate.price) * 100)
          )}</span>`;
          list.appendChild(li);
        });
        results.appendChild(list);
      })
      .catch(() => {
        results.innerHTML = '<p class="text-caption text-muted">Couldn’t fetch rates. Try again.</p>';
      })
      .finally(() => submit.removeAttribute('aria-busy'));
  });
})();
