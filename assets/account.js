/* Account pages: the login / recover-password toggle, and address form
   disclosure. Both panels exist in the HTML, so with JavaScript off the
   recover form is still reachable — it just isn't hidden. */

(function () {
  'use strict';

  const login = document.getElementById('CustomerLogin');
  const recover = document.getElementById('RecoverPassword');

  if (login && recover) {
    // Deep link from the reset email lands on #recover.
    if (window.location.hash === '#recover') show('recover');

    document.addEventListener('click', (event) => {
      const toggle = event.target.closest('[data-auth-toggle]');
      if (!toggle) return;
      event.preventDefault();
      show(toggle.getAttribute('data-auth-toggle'));
    });
  }

  function show(which) {
    const showRecover = which === 'recover';
    recover.style.display = showRecover ? 'block' : 'none';
    login.style.display = showRecover ? 'none' : 'block';

    const target = showRecover ? recover : login;
    const field = target.querySelector('input');
    if (field) field.focus();
  }

  /* Address forms */
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-address-toggle]');
    if (!trigger) return;
    event.preventDefault();

    const panel = document.getElementById(trigger.getAttribute('data-address-toggle'));
    if (!panel) return;

    const open = panel.hidden;
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      const field = panel.querySelector('input, select');
      if (field) field.focus();
    }
  });

  document.addEventListener('click', (event) => {
    const del = event.target.closest('[data-address-delete]');
    if (!del) return;
    if (!window.confirm(del.getAttribute('data-confirm'))) event.preventDefault();
  });

  // Shopify's country/province helper, applied to every address form present.
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.Shopify === 'undefined' || !window.Shopify.CountryProvinceSelector) return;

    document.querySelectorAll('[data-address-country-select]').forEach((select) => {
      const id = select.id;
      const provinceId = select.getAttribute('data-province-id');
      const containerId = select.getAttribute('data-province-container');
      new window.Shopify.CountryProvinceSelector(id, provinceId, {
        hideElement: containerId
      });
    });
  });
})();
