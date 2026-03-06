/**
 * Bundle Builder — ConversionMax Pro
 * Lets visitors toggle products into a bundle, then add all as a single cart action.
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-bundle-section]').forEach(function (section) {
    var products = section.querySelectorAll('[data-bundle-product]');
    var summary = section.querySelector('[data-bundle-summary]');
    var totalEl = section.querySelector('[data-bundle-total]');
    var countEl = section.querySelector('[data-bundle-count]');
    var atcBtn = section.querySelector('[data-bundle-atc]');
    var bundleItems = {};

    function updateSummary() {
      var keys = Object.keys(bundleItems);
      var total = 0;
      keys.forEach(function (k) {
        total += bundleItems[k].price;
      });

      var count = keys.length;

      if (count > 0) {
        summary.style.display = '';
        atcBtn.disabled = false;
      } else {
        summary.style.display = 'none';
        atcBtn.disabled = true;
      }

      totalEl.textContent = 'Bundle Total: ' + CMP.formatMoney(total);
      countEl.textContent = count + (count === 1 ? ' item' : ' items') + ' selected';
    }

    products.forEach(function (prod) {
      var toggleBtn = prod.querySelector('[data-bundle-toggle]');
      var variantEl = prod.querySelector('[data-bundle-variant]');
      var blockId = prod.getAttribute('data-block-id');

      function getSelectedVariant() {
        if (variantEl.tagName === 'SELECT') {
          var opt = variantEl.options[variantEl.selectedIndex];
          return {
            id: parseInt(opt.value, 10),
            price: parseInt(opt.getAttribute('data-price'), 10)
          };
        }
        return {
          id: parseInt(variantEl.value, 10),
          price: parseInt(variantEl.getAttribute('data-price'), 10)
        };
      }

      toggleBtn.addEventListener('click', function () {
        var isSelected = prod.classList.contains('cmp-bundle-product--selected');

        if (isSelected) {
          prod.classList.remove('cmp-bundle-product--selected');
          toggleBtn.textContent = 'Add to Bundle';
          toggleBtn.classList.remove('cmp-btn--primary');
          toggleBtn.classList.add('cmp-btn--outline');
          delete bundleItems[blockId];
        } else {
          var variant = getSelectedVariant();
          prod.classList.add('cmp-bundle-product--selected');
          toggleBtn.textContent = 'Remove from Bundle';
          toggleBtn.classList.remove('cmp-btn--outline');
          toggleBtn.classList.add('cmp-btn--primary');
          bundleItems[blockId] = {
            variantId: variant.id,
            price: variant.price
          };
        }

        updateSummary();
      });

      // If variant changes while selected, update the stored item
      if (variantEl.tagName === 'SELECT') {
        variantEl.addEventListener('change', function () {
          if (prod.classList.contains('cmp-bundle-product--selected')) {
            var variant = getSelectedVariant();
            bundleItems[blockId] = {
              variantId: variant.id,
              price: variant.price
            };
            updateSummary();
          }
        });
      }
    });

    if (atcBtn) {
      atcBtn.addEventListener('click', function () {
        var keys = Object.keys(bundleItems);
        if (keys.length === 0) return;

        var items = keys.map(function (k) {
          return {
            id: bundleItems[k].variantId,
            quantity: 1
          };
        });

        atcBtn.disabled = true;
        atcBtn.textContent = 'Adding...';

        CMP.cart.add({ items: items })
          .then(function () {
            CMP.notify('Bundle added to cart!');
            atcBtn.textContent = 'Added ✓';
            setTimeout(function () {
              atcBtn.disabled = false;
              atcBtn.textContent = 'Add Bundle to Cart';
            }, 2000);
          })
          .catch(function (err) {
            console.error('Bundle ATC error:', err);
            CMP.notify('Could not add bundle. Please try again.');
            atcBtn.disabled = false;
            atcBtn.textContent = 'Add Bundle to Cart';
          });
      });
    }
  });
})();
