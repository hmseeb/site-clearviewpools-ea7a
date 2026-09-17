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

})();
