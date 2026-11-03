/* ==========================================================================
   Site behaviour: announcement bar, sticky header, nav dropdown, mobile menu,
   review carousel dots, video modal, quote form.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var safe = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  /* ---------- Footer year ---------- */
  var yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Announcement bar ---------- */
  var announce = $('#announce');
  if (announce) {
    if (safe.get('announce-dismissed') === '1') {
      announce.remove();
    } else {
      $('[data-announce-close]', announce).addEventListener('click', function () {
        safe.set('announce-dismissed', '1');
        announce.style.height = announce.offsetHeight + 'px';
        requestAnimationFrame(function () {
          announce.style.height = '0px';
          announce.style.opacity = '0';
        });
        setTimeout(function () { announce.remove(); onScroll(); }, 480);
      });
    }
  }

  /* ---------- Sticky header state ---------- */
  var header = $('#header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('is-stuck', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Desktop dropdown ---------- */
  var dd = $('.has-dd');
  if (dd) {
    var ddBtn = $('[data-dd]', dd);
    var setDd = function (open) {
      dd.classList.toggle('is-open', open);
      ddBtn.setAttribute('aria-expanded', String(open));
    };
    ddBtn.addEventListener('click', function () { setDd(!dd.classList.contains('is-open')); });
    document.addEventListener('click', function (e) { if (!dd.contains(e.target)) setDd(false); });
    dd.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setDd(false); ddBtn.focus(); } });
    $$('.dd a', dd).forEach(function (a) { a.addEventListener('click', function () { setDd(false); }); });
  }

  /* ---------- Mobile menu ---------- */
  var burger = $('[data-burger]');
  var mnav = $('#mnav');
  if (burger && mnav) {
    var setMenu = function (open) {
      mnav.classList.toggle('is-open', open);
      header.classList.toggle('is-menu-open', open);
      document.body.classList.toggle('is-locked', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) {
        mnav.style.paddingTop = (header.getBoundingClientRect().bottom + 16) + 'px';
        var first = $('a', mnav);
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
      }
    };
    burger.addEventListener('click', function () { setMenu(!mnav.classList.contains('is-open')); });
    $$('a', mnav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (!mnav.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setMenu(false); burger.focus(); return; }
      if (e.key === 'Tab') { // simple focus trap: header controls + panel links
        var items = $$('a, button', mnav).concat($$('.logo, .header__tel, .burger', header));
        var idx = items.indexOf(document.activeElement);
        if (e.shiftKey && idx <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* ---------- Review carousel dots (visible < 1024px) ---------- */
  var reviews = $('#reviews');
  var dots = $('#review-dots');
  if (reviews && dots) {
    var cards = $$(':scope > li', reviews);
    cards.forEach(function (card, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show review ' + (i + 1));
      b.addEventListener('click', function () {
        reviews.scrollTo({ left: card.offsetLeft - (reviews.clientWidth - card.clientWidth) / 2, behavior: 'smooth' });
      });
      dots.appendChild(b);
    });
    var dotBtns = $$('button', dots);
    var syncDots = function () {
      var center = reviews.scrollLeft + reviews.clientWidth / 2;
      var best = 0, bestDist = Infinity;
      cards.forEach(function (c, i) {
        var d = Math.abs(c.offsetLeft + c.clientWidth / 2 - center);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      dotBtns.forEach(function (b, i) { b.setAttribute('aria-current', String(i === best)); });
    };
    reviews.addEventListener('scroll', function () { requestAnimationFrame(syncDots); }, { passive: true });
    window.addEventListener('resize', syncDots);
    syncDots();
  }

  /* ---------- Video modal ---------- */
  $$('[data-modal-open]').forEach(function (btn) {
    var modal = document.getElementById(btn.getAttribute('data-modal-open'));
    if (!modal || typeof modal.showModal !== 'function') return;
    btn.addEventListener('click', function () {
      var src = modal.getAttribute('data-video');
      var stage = $('.modal__stage', modal);
      if (src && !$('video', stage)) {
        var v = document.createElement('video');
        v.src = src; v.controls = true; v.playsInline = true; v.autoplay = true;
        stage.innerHTML = '';
        stage.appendChild(v);
      }
      modal.showModal();
      var v2 = $('video', modal); if (v2) v2.play().catch(function () {});
    });
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.close(); });
    $('[data-modal-close]', modal).addEventListener('click', function () { modal.close(); });
    modal.addEventListener('close', function () { var v = $('video', modal); if (v) v.pause(); });
  });

  /* ---------- Quote form ---------- */
  var form = $('#quote-form');
  if (form) {
    var card = $('#formcard');
    var submitBtn = $('#submit-btn');

    var rules = {
      firstName: function (v) { return v.trim() ? '' : 'Please enter your first name.'; },
      lastName: function (v) { return v.trim() ? '' : 'Please enter your last name.'; },
      email: function (v) {
        if (!v.trim()) return 'Please enter your email address.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.';
      },
      phone: function (v) {
        if (!v.trim()) return '';
        return v.replace(/\D/g, '').length === 10 ? '' : 'Please enter a 10-digit phone number.';
      },
      zip: function (v) {
        if (!v.trim()) return 'Please enter the project ZIP code.';
        return /^\d{5}$/.test(v.trim()) ? '' : 'Please enter a 5-digit ZIP code.';
      },
      message: function (v) {
        if (!v.trim()) return 'Please tell us a little about your project.';
        return v.trim().length >= 10 ? '' : 'Please add a few more details (10+ characters).';
      }
    };

    var validate = function (input) {
      var rule = rules[input.name];
      if (!rule) return true;
      var msg = rule(input.value);
      var field = input.closest('.field');
      var err = $('#err-' + input.name);
      field.classList.toggle('has-error', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg;
      return !msg;
    };

    // Phone mask: (###) ###-####
    var phone = $('#phone');
    phone.addEventListener('input', function () {
      var d = phone.value.replace(/\D/g, '').slice(0, 10);
      var out = d;
      if (d.length > 6) out = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
      else if (d.length > 3) out = '(' + d.slice(0, 3) + ') ' + d.slice(3);
      else if (d.length > 0) out = '(' + d;
      phone.value = out;
    });
    $('#zip').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); });

    $$('input, textarea', form).forEach(function (input) {
      if (!rules[input.name]) return;
      input.addEventListener('blur', function () { validate(input); });
      input.addEventListener('input', function () {
        if (input.closest('.field').classList.contains('has-error')) validate(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = $$('input, textarea', form).filter(function (i) { return rules[i.name]; });
      var firstBad = null;
      fields.forEach(function (i) { if (!validate(i) && !firstBad) firstBad = i; });
      if (firstBad) { firstBad.focus(); return; }
      if ($('[name="website"]', form).value) return; // honeypot

      submitBtn.disabled = true;
      var label = $('.btn__label', submitBtn);
      var icon = $('.icon', submitBtn);
      label.textContent = 'Sending';
      icon.style.display = 'none';
      var spin = document.createElement('span');
      spin.className = 'spinner'; spin.setAttribute('aria-hidden', 'true');
      submitBtn.appendChild(spin);

      /* DRAFT: simulated submission.
         Production: POST FormData(form) to the client's endpoint (Formspree, Netlify Forms, custom API). */
      setTimeout(function () {
        card.classList.add('is-sent');
        form.reset();
        submitBtn.disabled = false;
        spin.remove(); icon.style.display = ''; label.textContent = 'Submit Request';
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 1300);
    });
  }
})();
