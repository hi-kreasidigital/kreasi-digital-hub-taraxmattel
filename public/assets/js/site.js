// Language toggle: slide the white panel to the chosen language, then open that page.
(function () {
  var group = document.querySelector('.lang');
  if (!group) return;
  var current = group.getAttribute('data-lang');
  group.querySelectorAll('.lang__opt').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = link.getAttribute('hreflang');
      try { localStorage.setItem('txm-lang', target); } catch (err) {}
      if (target === current) { e.preventDefault(); return; }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      e.preventDefault();
      group.classList.add(target === 'en' ? 'is-to-en' : 'is-to-id');
      setTimeout(function () { window.location.href = link.href; }, 240);
    });
  });
})();

// Card sliders: arrows scroll one card; hidden when everything fits.
document.querySelectorAll('[data-slider]').forEach(function (slider) {
  var track = slider.querySelector('.slider__track');
  var prev = slider.querySelector('.slider__arrow--prev');
  var next = slider.querySelector('.slider__arrow--next');
  function step() {
    var card = track.firstElementChild;
    if (!card) return track.clientWidth;
    var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  }
  function update() {
    var max = track.scrollWidth - track.clientWidth;
    slider.classList.toggle('is-static', max <= 2);
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  }
  [prev, next].forEach(function (btn) {
    btn.addEventListener('click', function () {
      track.scrollBy({ left: step() * Number(btn.getAttribute('data-dir')), behavior: 'smooth' });
    });
  });
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
});

// Thumbnail pop up.
(function () {
  var box = document.querySelector('.lightbox');
  if (!box || typeof box.showModal !== 'function') return;
  var img = box.querySelector('.lightbox__img');
  var opener = null;
  document.querySelectorAll('[data-zoom]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      opener = btn;
      img.src = btn.getAttribute('data-zoom');
      img.alt = btn.getAttribute('data-alt') || '';
      box.showModal();
    });
  });
  box.querySelector('.lightbox__close').addEventListener('click', function () { box.close(); });
  box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
  box.addEventListener('close', function () { if (opener) opener.focus(); });
})();
