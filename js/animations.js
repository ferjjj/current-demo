/* ==========================================================================
   Animation engine (vanilla JS, no dependencies) — SPEC.md §9
   - Scroll reveals via IntersectionObserver
   - Lightweight rAF parallax
   - Pointer tilt on service cards
   Everything is skipped / simplified under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------- Stagger: give children of [data-stagger] reveal + index ---------- */
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.classList.add('reveal');
      child.style.setProperty('--i', i);
    });
  });

  /* ---------- Scroll reveal ---------- */
  var targets = document.querySelectorAll('.reveal, .split, .wipe, .draw-x');

  // Elements that start with zero visible area (clip-path / scaleX(0)) never
  // intersect, so we observe their parent and reveal them together.
  var watchEl = function (el) {
    return (el.classList.contains('wipe') || el.classList.contains('draw-x')) ? el.parentElement : el;
  };
  var revealMap = new Map();
  targets.forEach(function (el) {
    var w = watchEl(el);
    if (!revealMap.has(w)) revealMap.set(w, []);
    revealMap.get(w).push(el);
  });

  function showAll() {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  }

  if (reduce || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        (revealMap.get(entry.target) || []).forEach(function (el) { el.classList.add('is-in'); });
        io.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

    // Wait for fonts so headline masks measure correctly, but never block for long.
    var started = false;
    var start = function () {
      if (started) return;
      started = true;
      revealMap.forEach(function (_list, watched) { io.observe(watched); });
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start);
      setTimeout(start, 900);
    } else {
      start();
    }
  }

  /* ---------- Parallax ---------- */
  var layers = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (!reduce && layers.length) {
    var ticking = false;
    var vh = window.innerHeight;

    var update = function () {
      ticking = false;
      layers.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0;
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        var offset = (rect.top + rect.height / 2 - vh / 2);
        // rect includes the current transform; compensate so we don't feed back
        var current = parseFloat(el.style.getPropertyValue('--py')) || 0;
        offset -= current;
        var shift = Math.max(-70, Math.min(70, offset * speed)); // keep drift subtle
        el.style.setProperty('--py', shift.toFixed(1) + 'px');
      });
    };
    var onScroll = function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { vh = window.innerHeight; onScroll(); });
    update();
  }

  /* ---------- Pointer tilt on cards (fine pointers only) ---------- */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!reduce && fine) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      var max = 4; // degrees
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (px * max * 2).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-py * max * 2).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Pause ambient animations when tab hidden ---------- */
  document.addEventListener('visibilitychange', function () {
    root.classList.toggle('is-paused', document.hidden);
  });
})();
