/**
 * Countdown Timer — ConversionMax Pro
 * Supports fixed end date and evergreen (per-visitor via localStorage) modes.
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-countdown-section]').forEach(function (section) {
    var mode = section.getAttribute('data-countdown-mode');
    var timerEl = section.querySelector('[data-countdown-timer]');
    var expiredEl = section.querySelector('[data-countdown-expired]');
    var daysEl = section.querySelector('[data-countdown-days]');
    var hoursEl = section.querySelector('[data-countdown-hours]');
    var minsEl = section.querySelector('[data-countdown-mins]');
    var secsEl = section.querySelector('[data-countdown-secs]');

    var endTime;

    if (mode === 'fixed') {
      var endStr = section.getAttribute('data-countdown-end');
      endTime = new Date(endStr).getTime();
    } else {
      // Evergreen mode
      var duration = parseInt(section.getAttribute('data-countdown-duration'), 10) || 30;
      var storageKey = section.getAttribute('data-countdown-storage-key');

      try {
        var stored = localStorage.getItem(storageKey);
        if (stored) {
          endTime = parseInt(stored, 10);
          // If the stored end time has already passed, reset it
          if (endTime <= Date.now()) {
            endTime = Date.now() + duration * 60 * 1000;
            localStorage.setItem(storageKey, endTime.toString());
          }
        } else {
          endTime = Date.now() + duration * 60 * 1000;
          localStorage.setItem(storageKey, endTime.toString());
        }
      } catch (e) {
        // localStorage not available — just use a live timer
        endTime = Date.now() + duration * 60 * 1000;
      }
    }

    function pad(n) {
      return n < 10 ? '0' + n : '' + n;
    }

    function tick() {
      var now = Date.now();
      var diff = endTime - now;

      if (diff <= 0) {
        // Expired
        timerEl.style.display = 'none';
        expiredEl.style.display = '';
        return;
      }

      var totalSecs = Math.floor(diff / 1000);
      var days = Math.floor(totalSecs / 86400);
      var hours = Math.floor((totalSecs % 86400) / 3600);
      var mins = Math.floor((totalSecs % 3600) / 60);
      var secs = totalSecs % 60;

      daysEl.textContent = pad(days);
      hoursEl.textContent = pad(hours);
      minsEl.textContent = pad(mins);
      secsEl.textContent = pad(secs);

      // Add urgency class when under 1 hour
      if (diff < 3600000) {
        section.classList.add('cmp-countdown--urgent');
      }

      requestAnimationFrame(function () {
        setTimeout(tick, 1000);
      });
    }

    tick();
  });
})();
