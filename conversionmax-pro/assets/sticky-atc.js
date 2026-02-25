/**
 * Sticky Add-to-Cart Bar — ConversionMax Pro
 * Shows/hides based on scroll position. Adds item via AJAX.
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-sticky-atc]').forEach(function (bar) {
    var trigger = parseInt(bar.getAttribute('data-scroll-trigger'), 10) || 400;
    var atcBtn = bar.querySelector('[data-sticky-atc-btn]');
    var isVisible = false;

    function toggleBar() {
      var scrollY = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollY > trigger && !isVisible) {
        bar.classList.add('cmp-sticky-atc--visible');
        isVisible = true;
      } else if (scrollY <= trigger && isVisible) {
        bar.classList.remove('cmp-sticky-atc--visible');
        isVisible = false;
      }
    }

    // Throttled scroll handler
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          toggleBar();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    // Initial check
    toggleBar();

    // Add to cart
    if (atcBtn) {
      atcBtn.addEventListener('click', function () {
        var variantId = atcBtn.getAttribute('data-variant-id');
        if (!variantId) return;

        atcBtn.disabled = true;
        var originalText = atcBtn.textContent.trim();
        atcBtn.textContent = 'Adding...';

        CMP.cart.add({
          items: [{
            id: parseInt(variantId, 10),
            quantity: 1
          }]
        })
        .then(function () {
          CMP.notify('Added to cart!');
          atcBtn.textContent = 'Added ✓';
          setTimeout(function () {
            atcBtn.disabled = false;
            atcBtn.textContent = originalText;
          }, 2000);
        })
        .catch(function (err) {
          console.error('Sticky ATC error:', err);
          CMP.notify('Could not add to cart. Please try again.');
          atcBtn.disabled = false;
          atcBtn.textContent = originalText;
        });
      });
    }
  });
})();
