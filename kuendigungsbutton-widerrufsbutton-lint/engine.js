// Kündigungsbutton & Widerrufsbutton Check — one brain for VS Code and the web page.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.SBL_RULES;
  var BY = {}; RULES.forEach(function (r) { BY[r.id] = r; });

  var ORDER_OK = /zahlungspflichtig|kostenpflichtig|kaufen/i;
  var CANCEL_OK = /(verträge|vertrag|abo|abonnement|mitgliedschaft)\s+hier\s+kündigen|^(vertrag|verträge)\s+kündigen$/i;
  var CANCEL_CONFIRM_OK = /jetzt\s+(verbindlich\s+)?kündigen|kündigung\s+(jetzt\s+)?(absenden|abschicken|abgeben)/i;
  var WIDERRUF_OK = /(vertrag|verträge|bestellung|kauf)\s+widerrufen/i;
  var WIDERRUF_CONFIRM_OK = /widerruf\s+(jetzt\s+)?(bestätigen|absenden|abschicken|erklären)|jetzt\s+widerrufen/i;

  function lineAt(text, idx) { return text.slice(0, idx).split('\n').length; }
  function clean(s) { return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
  function attr(a, name) { var m = new RegExp('\\b' + name + '\\s*=\\s*["\']([^"\']*)["\']', 'i').exec(a || ''); return m ? m[1] : ''; }
  function templated(l) { return /\{\{|\{%|\{\s*[a-z_$]|<\?/.test(l); }

  function controls(text, base) {
    var out = [], m, re;
    re = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
    while ((m = re.exec(text))) { var t = attr(m[1], 'type').toLowerCase(); out.push({ kind: 'button', submit: t === '' || t === 'submit', label: clean(m[2]), href: attr(m[1], 'href') || attr(m[1], 'formaction'), idx: base + m.index }); }
    re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    while ((m = re.exec(text))) out.push({ kind: 'a', submit: false, label: clean(m[2]), href: attr(m[1], 'href'), idx: base + m.index });
    re = /<input\b([^>]*)>/gi;
    while ((m = re.exec(text))) { var ty = attr(m[1], 'type').toLowerCase(); if (ty === 'submit' || ty === 'button') out.push({ kind: 'input', submit: ty === 'submit', label: clean(attr(m[1], 'value')), href: '', idx: base + m.index }); }
    return out.sort(function (a, b) { return a.idx - b.idx; });
  }

  function check(text, opts) {
    text = String(text || '');
    var findings = [];
    function add(id, idx, detail) {
      var r = BY[id];
      findings.push({ check: id, sev: r.sev, line: typeof idx === 'number' ? lineAt(text, idx) : 1, msg: r.title + (detail ? ' — ' + detail : '') + '. ' + r.fix + ' (' + r.law + ')' });
    }
    var all = controls(text, 0);
    var forms = [], m, re = /<form\b[^>]*>([\s\S]*?)<\/form>/gi;
    while ((m = re.exec(text))) {
      var body = m[1], b = body.toLowerCase();
      var kind = /widerruf/.test(b) ? 'widerruf' : /kündig/.test(b) ? 'cancel' : /€|\beur\b|zahlungs|gesamtsumme|warenkorb|bestellübersicht|preis/.test(b) ? 'order' : '';
      forms.push({ kind: kind, body: body, idx: m.index, ctl: controls(body, m.index + m[0].indexOf(body)) });
    }

    forms.forEach(function (f) {
      var subs = f.ctl.filter(function (c) { return c.submit && c.label && !templated(c.label); });
      var b = f.body.toLowerCase();
      if (f.kind === 'order') {
        subs.forEach(function (c) { if (!ORDER_OK.test(c.label)) add('ORDER_LABEL', c.idx, 'Button „' + c.label + '“'); });
      } else if (f.kind === 'cancel') {
        subs.forEach(function (c) { if (!CANCEL_CONFIRM_OK.test(c.label)) add('CANCEL_CONFIRM_LABEL', c.idx, 'Button „' + c.label + '“'); });
        if (!/ordentlich/.test(b)) add('CANCEL_FIELD_ART', f.idx);
        else if (/au(ß|ss)erordentlich/.test(b) && !/grund/.test(b)) add('CANCEL_FIELD_ART', f.idx, 'Feld für den Kündigungsgrund fehlt');
        if (!/name\s*=\s*["'](full_?name|name|vorname|nachname|kundennummer|kundennr|customer_?(id|number))["']|kundennummer|nachname|vor- und nachname/.test(b)) add('CANCEL_FIELD_IDENT', f.idx);
        if (!/vertragsnummer|vertragsnr|vertrag_id|abonummer|abo-nummer|welcher vertrag|welches abo|name\s*=\s*["'](vertrag|contract|abo|tarif)[^"']*["']/.test(b)) add('CANCEL_FIELD_VERTRAG', f.idx);
        if (!/type\s*=\s*["']date["']|zeitpunkt|frühestmöglich|fruehestmoeglich|kündigungsdatum|beendigungsdatum|kündigen zum|beenden zum/.test(b)) add('CANCEL_FIELD_ZEITPUNKT', f.idx);
        if (!/type\s*=\s*["']email["']|e-mail|email/.test(b)) add('CANCEL_FIELD_EMAIL', f.idx);
      } else if (f.kind === 'widerruf') {
        subs.forEach(function (c) { if (!WIDERRUF_CONFIRM_OK.test(c.label)) add('WIDERRUF_CONFIRM_LABEL', c.idx, 'Button „' + c.label + '“'); });
        if (!/name\s*=\s*["'](full_?name|name|vorname|nachname)["']|ihr name|vor- und nachname|nachname/.test(b)) add('WIDERRUF_FIELD_NAME', f.idx);
        if (!/bestellnummer|bestellnr|order_?(id|number|nr)|vertragsnummer|rechnungsnummer|name\s*=\s*["'](bestellung|order|vertrag)[^"']*["']/.test(b)) add('WIDERRUF_FIELD_VERTRAG', f.idx);
        if (!/type\s*=\s*["']email["']|e-mail|email/.test(b)) add('WIDERRUF_FIELD_KANAL', f.idx);
      }
    });

    var hasCancelOk = false, hasWiderrufOk = false;
    all.forEach(function (c) {
      if (!c.label || templated(c.label)) return;
      if (CANCEL_OK.test(c.label)) hasCancelOk = true;
      if (WIDERRUF_OK.test(c.label)) hasWiderrufOk = true;
      var h = (c.href || '').toLowerCase();
      if (!c.submit && /kuendig|kündig|cancel/.test(h) && !CANCEL_OK.test(c.label) && !CANCEL_CONFIRM_OK.test(c.label)) add('CANCEL_LABEL', c.idx, 'Link „' + c.label + '“ → ' + c.href);
      if (!c.submit && /widerruf|withdraw/.test(h) && !WIDERRUF_OK.test(c.label) && !WIDERRUF_CONFIRM_OK.test(c.label)) add('WIDERRUF_LABEL', c.idx, 'Link „' + c.label + '“ → ' + c.href);
    });

    var low = text.toLowerCase(), i;
    var sub = /\babo\b|abonnement|mitgliedschaft|mindestlaufzeit|pro monat|€\s*\/\s*monat|monatlich kündbar|subscription/.exec(low);
    if (sub && !hasCancelOk) add('CANCEL_BUTTON_MISSING', sub.index);
    var shop = /widerrufsrecht|widerrufsfrist|meine bestellungen|bestellbestätigung|warenkorb|in den warenkorb/.exec(low);
    if (shop && !hasWiderrufOk) add('WIDERRUF_MISSING', shop.index);
    if ((i = low.indexOf('widerrufsbelehrung')) >= 0 && /widerrufsformular/.test(low) && !/widerrufsfunktion/.test(low)) add('BELEHRUNG_FUNKTION', i);

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, errors: findings.filter(function (f) { return f.sev === 'error'; }).length, rules: RULES.length };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.SBLENGINE = api;
})();
