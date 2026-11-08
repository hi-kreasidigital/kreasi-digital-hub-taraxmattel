// Contact form: sends the message to the shared submit-form function (saved in the admin
// under "Form masuk" and emailed to the team). Turnstile adds its token to the form.
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var cfg = JSON.parse(form.getAttribute('data-cfg') || '{}');
  var status = form.querySelector('.contact-form__status');
  var button = form.querySelector('button[type=submit]');
  function say(text, kind) {
    status.textContent = text;
    status.className = 'contact-form__status' + (kind ? ' is-' + kind : '');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = new FormData(form);
    var val = function (k) { return String(d.get(k) || '').trim(); };
    var email = val('email');
    if (!val('name') || !val('business') || !val('message') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      say(cfg.invalid, 'err');
      var bad = form.querySelector(':invalid');
      if (bad) bad.focus();
      return;
    }
    button.disabled = true;
    say(cfg.sending);
    fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        site: cfg.site, form: 'kontak', lang: cfg.lang, source_page: cfg.source,
        name: val('name'), email: email, phone: val('phone'),
        message: cfg.business + ': ' + val('business') + '\n\n' + val('message'),
        data: { business: val('business') },
        website: val('website'), turnstile_token: val('cf-turnstile-response')
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      say(cfg.ok, 'ok');
      form.reset();
    }).catch(function () {
      say(cfg.err, 'err');
    }).then(function () {
      button.disabled = false;
      var ts = form.querySelector('.cf-turnstile');
      if (window.turnstile && ts) { try { window.turnstile.reset(ts); } catch (err) {} }
    });
  });
})();
