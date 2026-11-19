// Contact form: sends the message to the shared submit-form function (saved in the admin
// under "Form masuk" and emailed to the team).
// With Turnstile on the page, the verification box is shown first and the send button
// stays disabled until the visitor has passed it; after each send it has to be passed again.
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var cfg = JSON.parse(form.getAttribute('data-cfg') || '{}');
  var status = form.querySelector('.contact-form__status');
  var button = form.querySelector('button[type=submit]');
  var widget = form.querySelector('.cf-turnstile');
  // no widget on the page = nothing to wait for; Turnstile may already have passed before this script ran
  var verified = !widget || !!(window.txmTs && window.txmTs.ok);
  var sending = false;
  function refresh() { button.disabled = sending || !verified; }
  window.txmTurnstileOk = function () { verified = true; refresh(); };
  window.txmTurnstileReset = function () { verified = !widget; refresh(); };
  refresh();

  function say(text, kind) {
    status.textContent = text;
    status.className = 'contact-form__status' + (kind ? ' is-' + kind : '');
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!verified || sending) return;
    var d = new FormData(form);
    var val = function (k) { return String(d.get(k) || '').trim(); };
    var email = val('email');
    if (!val('name') || !val('business') || !val('message') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      say(cfg.invalid, 'err');
      var bad = form.querySelector(':invalid');
      if (bad) bad.focus();
      return;
    }
    sending = true; refresh();
    say(cfg.sending);
    var ok = false;
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
      ok = true;
      form.reset();
    }).catch(function () {
      say(cfg.err, 'err');
    }).then(function () {
      sending = false;
      // a Turnstile token works only once: ask for a fresh check before the next send
      if (widget) {
        verified = false;
        if (window.turnstile) { try { window.turnstile.reset(widget); } catch (err) {} }
      }
      refresh();
      if (ok) say(cfg.ok, 'ok');
    });
  });
})();
