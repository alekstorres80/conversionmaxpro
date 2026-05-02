/**
 * ConversionMax Pro — Global Theme JS
 * Vanilla JavaScript only, no dependencies.
 */

(function () {
  'use strict';

  /* ========================================
     Cart API helper
     ======================================== */
  window.CMP = window.CMP || {};

  CMP.cart = {
    /**
     * Add items to cart via AJAX
     * @param {Object} data  – { items: [{ id, quantity, properties }] } or { id, quantity }
     * @returns {Promise}
     */
    add: function (data) {
      return fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error('Cart add failed: ' + r.status);
        return r.json();
      });
    },

    /**
     * Get current cart state
     * @returns {Promise}
     */
    get: function () {
      return fetch('/cart.js', {
        headers: { 'Content-Type': 'application/json' }
      }).then(function (r) { return r.json(); });
    },

    /**
     * Update cart (quantities, etc.)
     * @param {Object} data  – { updates: { variantId: qty, ... } }
     * @returns {Promise}
     */
    update: function (data) {
      return fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error('Cart update failed: ' + r.status);
        return r.json();
      });
    }
  };

  /* ========================================
     Cart notification toast
     ======================================== */
  CMP.notify = function (message) {
    var existing = document.querySelector('.cmp-cart-notification');
    if (existing) existing.remove();

    var el = document.createElement('div');
    el.className = 'cmp-cart-notification';
    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(function () {
      el.classList.add('cmp-cart-notification--visible');
    });

    setTimeout(function () {
      el.classList.remove('cmp-cart-notification--visible');
      setTimeout(function () { el.remove(); }, 400);
    }, 3000);
  };

  /* ========================================
     Money formatting helper
     ======================================== */
  CMP.formatMoney = function (cents) {
    var amount = (cents / 100).toFixed(2);
    return (window.Shopify && Shopify.currency && Shopify.currency.active
      ? Shopify.currency.active
      : '$') + amount;
  };

  /* ========================================
     FAQ Accordion
     ======================================== */
  function initFaqAccordion() {
    var items = document.querySelectorAll('.cmp-faq__item');
    items.forEach(function (item) {
      var btn = item.querySelector('.cmp-faq__question');
      var answer = item.querySelector('.cmp-faq__answer');
      if (!btn || !answer) return;

      btn.addEventListener('click', function () {
        var isOpen = item.classList.contains('cmp-faq__item--open');

        // Close all others
        items.forEach(function (other) {
          if (other !== item) {
            other.classList.remove('cmp-faq__item--open');
            var otherAnswer = other.querySelector('.cmp-faq__answer');
            if (otherAnswer) otherAnswer.style.maxHeight = null;
          }
        });

        if (isOpen) {
          item.classList.remove('cmp-faq__item--open');
          answer.style.maxHeight = null;
        } else {
          item.classList.add('cmp-faq__item--open');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });
  }

  /* ========================================
     Site Nav (mobile toggle)
     ======================================== */
  function initSiteNav() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var menu = document.querySelector('[data-nav-menu]');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('cmp-site-nav__menu--open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ========================================
     Cart count refresh after AJAX add
     ======================================== */
  CMP.refreshCartCount = function () {
    return CMP.cart.get().then(function (cart) {
      var nodes = document.querySelectorAll('[data-cart-count]');
      nodes.forEach(function (n) {
        n.textContent = cart.item_count;
        if (cart.item_count > 0) {
          n.classList.remove('cmp-site-header__cart-count--empty');
        } else {
          n.classList.add('cmp-site-header__cart-count--empty');
        }
      });
    }).catch(function () { /* swallow */ });
  };

  /* ========================================
     Init on DOM ready
     ======================================== */
  function init() {
    initFaqAccordion();
    initSiteNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
