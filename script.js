/* ===========================================================
   ClearviewPools — El Paso Residential Pool Cleaning
   Site interactions: nav, scroll reveal, form validation
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

  /* ---------- Quote form validation ---------- */
  var form = document.getElementById('quoteForm');
  if (!form) return;

  var statusEl = document.getElementById('formStatus');

  var RULES = {
    name: {
      test: function (v) { return v.trim().length >= 2; },
      message: 'Please enter your full name.'
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
    },
    service: {
      test: function (v) { return v.trim() !== ''; },
      message: 'Please choose the service you need.'
    }
  };

  function setError(field, message) {
    var errEl = document.getElementById('err-' + field.id);
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
    var rule = RULES[field.id];
    if (!rule) { return true; }
    var valid = rule.test(field.value);
    setError(field, valid ? '' : rule.message);
    return valid;
  }

  // Live re-validation once a field has been marked invalid
  Object.keys(RULES).forEach(function (id) {
    var field = document.getElementById(id);
    if (!field) { return; }
    field.addEventListener('blur', function () { validateField(field); });
    field.addEventListener('input', function () {
      if (field.classList.contains('invalid')) { validateField(field); }
    });
    field.addEventListener('change', function () {
      if (field.classList.contains('invalid')) { validateField(field); }
    });
  });

  function showStatus(message, type) {
    if (!statusEl) { return; }
    statusEl.textContent = message;
    statusEl.className = 'form-status show ' + (type === 'success' ? 'success' : 'error-msg');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var firstInvalid = null;
    var allValid = true;

    Object.keys(RULES).forEach(function (id) {
      var field = document.getElementById(id);
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

    // No backend is configured for this static site, so the request is handed
    // off to the visitor's email client with everything pre-filled.
    var get = function (id) {
      var el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    var name = get('name');
    var lines = [
      'Name: ' + name,
      'Phone: ' + get('phone'),
      'Email: ' + get('email'),
      'Address / Neighborhood: ' + (get('address') || 'Not provided'),
      'Service needed: ' + get('service'),
      '',
      'About the pool:',
      get('message') || 'Not provided'
    ];

    var mailto = 'mailto:hello@clearviewpools.com' +
      '?subject=' + encodeURIComponent('Pool quote request — ' + name) +
      '&body=' + encodeURIComponent(lines.join('\n'));

    showStatus(
      'Thanks, ' + name.split(' ')[0] + '! Your email app is opening with the request ready to send. ' +
      'In a hurry? Call or text (915) 555-0142 for the fastest reply.',
      'success'
    );

    window.location.href = mailto;
    form.reset();
  });
})();
