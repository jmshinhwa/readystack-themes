/* python-pci-log-leak-lint — finds card data and credentials written to Python logs. Same file runs in node (VS Code) and in the browser. */
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.PLL_RULES;

  // A statement that writes text somewhere a human or a log store will keep it.
  var SINK = /(?:\b(?:logger|logging|log|_logger|_log|LOGGER|LOG|self\.log(?:ger)?|app\.logger|current_app\.logger)\.(?:debug|info|warning|warn|error|exception|critical|fatal|log)\s*\(|(?<![\w.])print\s*\(|\braise\s+[A-Za-z_][\w.]*\s*\()/;
  var STR = /([rRbBuUfF]{0,2})("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/g;

  // Keep code and f-string {expressions}; drop plain message text so "password reset for %s" is not a leak.
  function codeOnly(s) {
    return s.replace(STR, function (m, pre, body) {
      if (!/f/i.test(pre)) return '""';
      var out = [], re = /\{([^{}]*)\}/g, x;
      while ((x = re.exec(body))) out.push(x[1]);
      return '"' + (out.length ? ' ' + out.join(' ') + ' ' : '') + '"';
    });
  }
  function dropComment(line) {
    var s = line.replace(STR, function (m) { return m.replace(/#/g, '_'); });
    var i = s.indexOf('#');
    return i < 0 ? line : line.slice(0, i);
  }
  function depth(s) {
    var c = codeOnly(s);
    return (c.match(/\(/g) || []).length - (c.match(/\)/g) || []).length;
  }
  function luhn(d) {
    var sum = 0, alt = false;
    for (var i = d.length - 1; i >= 0; i--) {
      var n = +d[i];
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }

  function parseDay(s) {
    var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    var d = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }
  // Req 10.5.1 keeps audit log history for at least 12 months.
  function tail(today) {
    var t = parseDay(today);
    if (t === null) return '';
    var d = new Date(t), until = new Date(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()));
    return ' Written on ' + d.toISOString().slice(0, 10) + ', a log line kept for the 12 months of Req 10.5.1 is still stored on ' + until.toISOString().slice(0, 10) + '.';
  }

  // Each sink statement, flattened to one line even when the call wraps.
  function statements(lines) {
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var ln = dropComment(lines[i]);
      if (!/\S/.test(ln) || !SINK.test(ln)) continue;
      var text = ln.slice(ln.search(SINK)), j = i, bal = depth(text);
      while (bal > 0 && j + 1 < lines.length && j - i < 8) {
        j++;
        var nx = dropComment(lines[j]);
        text += ' ' + nx.trim();
        bal += depth(nx);
      }
      out.push({ line: i + 1, raw: text.replace(/\s+/g, ' '), code: codeOnly(text).replace(/\s+/g, ' ') });
    }
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text || '').split(/\r?\n/), sinks = statements(lines), findings = [], end = tail(opts.today);
    RULES.forEach(function (r) {
      var add = function (line, extra) {
        findings.push({ check: r.id, sev: r.sev, line: line, msg: r.msg + (extra || '') + ' ' + r.req + ' → ' + r.fix + '.' + end });
      };
      if (r.kind === 'sink') {
        var re = new RegExp(r.code, 'i'), un = r.unless ? new RegExp(r.unless, 'i') : null;
        sinks.forEach(function (s) {
          if (re.test(s.code) && !(un && un.test(s.code))) add(s.line, '');
        });
      } else if (r.kind === 'luhn') {
        sinks.forEach(function (s) {
          var m, dg = /(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)/g;
          while ((m = dg.exec(s.raw))) {
            var d = m[0].replace(/\D/g, '');
            if (d.length >= 13 && d.length <= 19 && luhn(d)) { add(s.line, ' Found ending ' + d.slice(-4) + '.'); break; }
          }
        });
      } else if (r.kind === 'line') {
        var lr = new RegExp(r.code);
        lines.forEach(function (ln, i) { if (lr.test(dropComment(ln))) add(i + 1, ''); });
      }
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PLLENGINE = API;
})();
