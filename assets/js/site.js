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
