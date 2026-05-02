/**
 * Quantity Breaks — ConversionMax Pro
 * Handles tier selection and AJAX add-to-cart.
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-qb-grid]').forEach(function (grid) {
    var section = grid.closest('[data-section-id]');
    var cards = grid.querySelectorAll('[data-qb-card]');
    var atcBtn = section ? section.querySelector('[data-qb-atc]') : null;
    var selected = null;

    function selectCard(card) {
      cards.forEach(function (c) {
        c.classList.remove('cmp-qb-card--selected');
      });
      card.classList.add('cmp-qb-card--selected');
      selected = card;
    }

    // Default: select first card
    if (cards.length > 0) {
      // Select the best-value card if one exists, otherwise first
      var bestCard = grid.querySelector('.cmp-qb-card--best') || cards[0];
      selectCard(bestCard);
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        selectCard(card);
      });
    });

    if (atcBtn) {
      atcBtn.addEventListener('click', function () {
        if (!selected) return;

        var variantId = selected.getAttribute('data-variant-id');
        var quantity = parseInt(selected.getAttribute('data-quantity'), 10) || 1;

        if (!variantId) {
          CMP.notify('Please configure variant IDs in the theme editor.');
          return;
        }

        atcBtn.disabled = true;
        atcBtn.textContent = 'Adding...';

        CMP.cart.add({
          items: [{
            id: parseInt(variantId, 10),
            quantity: quantity
          }]
        })
        .then(function () {
          CMP.notify('Added to cart!');
          atcBtn.textContent = 'Added ✓';
          setTimeout(function () {
            atcBtn.disabled = false;
            atcBtn.textContent = atcBtn.getAttribute('data-original-text') || 'Add to Cart';
          }, 2000);
        })
        .catch(function (err) {
          console.error('Quantity breaks ATC error:', err);
          CMP.notify('Could not add to cart. Please try again.');
          atcBtn.disabled = false;
          atcBtn.textContent = atcBtn.getAttribute('data-original-text') || 'Add to Cart';
        });
      });

      // Store original text
      atcBtn.setAttribute('data-original-text', atcBtn.textContent.trim());
    }
  });
})();
