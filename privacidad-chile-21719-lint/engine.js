/* Privacidad Chile — Ley 21.719 art. 14 ter policy lint. Same file runs in node and in the browser. */
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.PCH_RULES;
  var VIGENCIA = '2026-12-01';
  var ENT = { aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', nbsp: ' ', amp: '&', ordm: 'º', deg: '°' };

  // Strip tags/entities without moving newlines, then collapse whitespace keeping a line number per char.
  function flatten(text) {
    var t = String(text || '').replace(/<[^>]*>/g, function (m) { return m.replace(/[^\n]/g, ' '); });
    t = t.replace(/&([A-Za-z]+);/g, function (m, n) { return ENT[n] || ' '; });
    var flat = '', lines = [], line = 1, sp = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (/\s/.test(c)) { if (c === '\n') line++; if (!sp && flat.length) { flat += ' '; lines.push(line); } sp = true; }
      else { flat += c; lines.push(line); sp = false; }
    }
    return { flat: flat, lines: lines };
  }

  function rutOk(body, dv) {
    var d = body.replace(/\./g, ''), s = 0, m = 2;
    for (var i = d.length - 1; i >= 0; i--) { s += (+d[i]) * m; m = m === 7 ? 2 : m + 1; }
    var r = 11 - (s % 11), want = r === 11 ? '0' : r === 10 ? 'K' : String(r);
    return want === String(dv).toUpperCase();
  }

  function dayTail(today) {
    var m = String(today || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]), v = Date.UTC(2026, 11, 1);
    if (isNaN(t)) return '';
    var n = Math.round((v - t) / 86400000);
    if (n > 0) return ' Faltan ' + n + ' días para el ' + VIGENCIA + ', cuando rige la Ley 21.719.';
    if (n === 0) return ' La Ley 21.719 rige hoy, ' + VIGENCIA + '.';
    return ' La Ley 21.719 rige desde el ' + VIGENCIA + ' (hace ' + (-n) + ' días).';
  }

  function check(text, opts) {
    opts = opts || {};
    var f = flatten(text), flat = f.flat, findings = [], tail = dayTail(opts.today);
    function lineAt(idx) { return f.lines[idx] || 1; }
    RULES.forEach(function (r) {
      var flags = r.flags === undefined ? 'i' : r.flags;
      if (r.kind === 'absent') {
        if (r.when && !new RegExp(r.when, 'i').test(flat)) return;
        if (!new RegExp(r.need, flags).test(flat)) findings.push({ check: r.id, sev: r.sev, msg: r.msg + ' → ' + r.fix + tail, line: 1 });
      } else if (r.kind === 'present') {
        if (r.unless && new RegExp(r.unless, 'i').test(flat)) return;
        var re = new RegExp(r.pat, flags + 'g'), mm, seen = {};
        while ((mm = re.exec(flat))) {
          var ln = lineAt(mm.index);
          if (!seen[ln]) { seen[ln] = 1; findings.push({ check: r.id, sev: r.sev, msg: r.msg + ' → ' + r.fix, line: ln }); }
          if (mm[0] === '') re.lastIndex++;
        }
      } else if (r.kind === 'rut') {
        var rr = /\b(\d{1,2}\.?\d{3}\.?\d{3})\s*-\s*([\dkK])\b/g, x;
        while ((x = rr.exec(flat))) {
          if (!rutOk(x[1], x[2])) findings.push({ check: r.id, sev: r.sev, msg: 'RUT ' + x[1] + '-' + x[2] + ': ' + r.msg + ' → ' + r.fix, line: lineAt(x.index) });
        }
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PCHENGINE = API;
})();
