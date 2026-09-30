/* OpenVox migration check — shared engine (VS Code + web page). */
(function () {
  var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json')
    : (typeof window !== 'undefined' ? window.OVX_RULES : []);
  var PKG_CTX = /\b(install|package|packages|ensure|pkg|dnf|yum|apt-get|apt|zypper|rpm|dpkg|choco)\b|_package\b/i;
  var PUPPET_PKG = /\b(puppet-agent|puppetserver|puppetdb(?:-termini)?)\b/;
  var FREEZE = Date.UTC(2024, 9, 22);

  function frozenDays(today) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(today || ''));
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(t) || t < FREEZE) return null;
    return Math.round((t - FREEZE) / 86400000);
  }

  // Join backslash-continued lines and flatten whitespace; keep the first line number.
  function logicalLines(text) {
    var raw = String(text || '').replace(/\r\n?/g, '\n').split('\n'), out = [], buf = '', start = 0;
    for (var i = 0; i < raw.length; i++) {
      var l = raw[i];
      if (!buf) start = i + 1;
      if (/\\\s*$/.test(l)) { buf += l.replace(/\\\s*$/, ' '); continue; }
      buf += l;
      out.push({ line: start, text: buf.replace(/\s+/g, ' ').trim() });
      buf = '';
    }
    if (buf) out.push({ line: start, text: buf.replace(/\s+/g, ' ').trim() });
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    var days = frozenDays(opts.today), findings = [], lines = logicalLines(text), hasPuppetPkg = false;
    lines.forEach(function (L) {
      if (!L.text || L.text.charAt(0) === '#' || L.text.indexOf('//') === 0) return;
      if (PKG_CTX.test(L.text) && PUPPET_PKG.test(L.text)) hasPuppetPkg = true;
    });
    lines.forEach(function (L) {
      var s = L.text;
      if (!s || s.charAt(0) === '#' || s.indexOf('//') === 0) return;
      RULES.forEach(function (r) {
        if (r.scope === 'mixed') return;
        if (r.scope === 'pkg' && !PKG_CTX.test(s)) return;
        if (!new RegExp(r.re).test(s)) return;
        var msg = r.msg + (r.freeze && days !== null ? ' Frozen ' + days + ' days as of ' + String(opts.today).slice(0, 10) + '.' : '');
        findings.push({ check: r.id, sev: r.sev, msg: msg, line: L.line, fix: r.fix, text: s });
      });
    });
    if (hasPuppetPkg) {
      var mixed = RULES.filter(function (r) { return r.scope === 'mixed'; })[0];
      if (mixed) {
        var hit = lines.filter(function (L) { return L.text.charAt(0) !== '#' && PKG_CTX.test(L.text) && new RegExp(mixed.re).test(L.text); })[0];
        if (hit) findings.push({ check: mixed.id, sev: mixed.sev, msg: mixed.msg, line: hit.line, fix: mixed.fix, text: hit.text });
      }
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, frozen_days: days };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.OVXENGINE = api;
})();
