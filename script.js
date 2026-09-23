/* ===========================================================
   ClearviewPools — El Paso Residential Pool Cleaning
   Site interactions: nav, scroll reveal
   =========================================================== */
(function () {
  'use strict';

  /* ---------- Current year in footer ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ---------- Mobile navigation ---------- */
  var navToggle = document.getElementById('navToggle');
  var primaryNav = document.getElementById('primaryNav');

  function closeNav() {
    if (!navToggle || !primaryNav) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open navigation menu');
    primaryNav.classList.remove('open');
    document.body.classList.remove('nav-open');
  }

  function openNav() {
    if (!navToggle || !primaryNav) return;
    navToggle.setAttribute('aria-expanded', 'true');
    navToggle.setAttribute('aria-label', 'Close navigation menu');
    primaryNav.classList.add('open');
    document.body.classList.add('nav-open');
  }

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) { closeNav(); } else { openNav(); }
    });

    // Close after tapping any nav link
    primaryNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) { closeNav(); }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeNav(); }
    });

    // Reset nav state when resizing back to desktop
    var resizeTimer;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (window.innerWidth > 820) { closeNav(); }
      }, 150);
    });
  }

  /* ---------- Header shadow on scroll ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      if (window.scrollY > 8) {
        header.classList.add('is-stuck');
      } else {
        header.classList.remove('is-stuck');
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Scroll reveal ---------- */
  var revealTargets = document.querySelectorAll(
    '.section-head, .service-card, .step-card, .testimonial, .shot, .split-media, .split-body, .stat, .section-cta'
  );

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    Array.prototype.forEach.call(revealTargets, function (el) {
      el.classList.add('reveal');
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    Array.prototype.forEach.call(revealTargets, function (el) {
      observer.observe(el);
    });
  }

  /* ---------- Quote / contact forms -> GoHighLevel ---------- */
  var LEAD_ENDPOINT = '/api/ghl-lead';

  var RULES = {
    firstName: {
      test: function (v) { return v.trim().length >= 2; },
      message: 'Please enter your first name.'
    },
    lastName: {
      test: function (v) { return v.trim().length >= 1; },
      message: 'Please enter your last name.'
    },
    phone: {
      test: function (v) {
        var digits = v.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
      },
      message: 'Please enter a valid phone number with area code.'
    },
    email: {
      test: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()); },
      message: 'Please enter a valid email address.'
    }
  };

  function setupLeadForm(form) {
    var statusEl = form.querySelector('.form-status');
    var submitBtn = form.querySelector('button[type="submit"]');
    var thanksEl = form.parentNode ? form.parentNode.querySelector('.form-thanks') : null;

    function fieldEl(name) { return form.querySelector('[name="' + name + '"]'); }

    function setError(field, message) {
      var errEl = field.id ? document.getElementById('err-' + field.id) : null;
      if (message) {
        field.classList.add('invalid');
        field.setAttribute('aria-invalid', 'true');
        if (errEl) { errEl.textContent = message; }
      } else {
        field.classList.remove('invalid');
        field.removeAttribute('aria-invalid');
        if (errEl) { errEl.textContent = ''; }
      }
    }

    function validateField(field) {
      var rule = RULES[field.name];
      if (!rule) { return true; }
      var valid = rule.test(field.value);
      setError(field, valid ? '' : rule.message);
      return valid;
    }

    Object.keys(RULES).forEach(function (name) {
      var field = fieldEl(name);
      if (!field) { return; }
      field.addEventListener('blur', function () { validateField(field); });
      field.addEventListener('input', function () {
        if (field.classList.contains('invalid')) { validateField(field); }
      });
    });

    function showStatus(message, type) {
      if (!statusEl) { return; }
      statusEl.textContent = message;
      statusEl.className = 'form-status show ' + (type === 'success' ? 'success' : 'error-msg');
    }

    function clearStatus() {
      if (!statusEl) { return; }
      statusEl.textContent = '';
      statusEl.className = 'form-status';
    }

    function value(name) {
      var el = fieldEl(name);
      return el ? el.value.trim() : '';
    }

    function showThanks() {
      if (!thanksEl) {
        showStatus('Thank you! Your request is in — we’ll reach out the same business day.', 'success');
        form.reset();
        return;
      }
      form.hidden = true;
      form.style.display = 'none';
      thanksEl.hidden = false;
      if (typeof thanksEl.focus === 'function') {
        thanksEl.setAttribute('tabindex', '-1');
        thanksEl.focus();
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearStatus();

      var firstInvalid = null;
      var allValid = true;

      Object.keys(RULES).forEach(function (name) {
        var field = fieldEl(name);
        if (!field) { return; }
        if (!validateField(field)) {
          allValid = false;
          if (!firstInvalid) { firstInvalid = field; }
        }
      });

      if (!allValid) {
        showStatus('Please fix the highlighted fields and try again.', 'error');
        if (firstInvalid) { firstInvalid.focus(); }
        return;
      }

      var payload = {
        firstName: value('firstName'),
        lastName: value('lastName'),
        phone: value('phone'),
        email: value('email'),
        message: value('message'),
        company: value('company'),
        formName: form.getAttribute('data-form-name') || form.id || 'Website Form'
      };

      var originalLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      window.fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok || !data || data.ok !== true) {
            throw new Error((data && data.error) ||
              'We could not send your request just now. Please call (915) 555-0142.');
          }
          return data;
        });
      }).then(function () {
        showThanks();
      })['catch'](function (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
        showStatus(
          (err && err.message) ||
          'We could not send your request just now. Please call (915) 555-0142.',
          'error'
        );
      });
    });
  }

  if (window.fetch) {
    Array.prototype.forEach.call(
      document.querySelectorAll('form[data-form-name]'),
      setupLeadForm
    );
  }

})();
