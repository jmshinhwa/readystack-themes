/* CNPJ Alfanumérico Lint — mesmo motor no VS Code e no navegador.
   IN RFB nº 2.229/2024: CNPJ alfanumérico atribuído a novas inscrições a partir de julho de 2026. */
(function (root) {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.CNPJ_RULES;

  // DV oficial: módulo 11, pesos 2..9 da direita para a esquerda, cada caractere vale ASCII - 48.
  function dvPart(base) {
    var sum = 0, w = 2;
    for (var i = base.length - 1; i >= 0; i--) {
      sum += (base.charCodeAt(i) - 48) * w;
      w = (w === 9) ? 2 : w + 1;
    }
    var r = sum % 11;
    return (r < 2) ? 0 : 11 - r;
  }
  function dv(base12) {
    var b = String(base12).toUpperCase().replace(/[^A-Z0-9]/g, '');
    var d1 = dvPart(b);
    var d2 = dvPart(b + d1);
    return '' + d1 + d2;
  }
  function isValid(cnpj) {
    var c = String(cnpj).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{12}\d{2}$/.test(c)) return false;
    if (/^(.)\1{13}$/.test(c)) return false;
    return dv(c.slice(0, 12)) === c.slice(12);
  }

  var COMPILED = RULES.map(function (r) {
    return { r: r, re: new RegExp(r.pattern, (r.flags || '') + 'g') };
  });

  function nearCnpj(lines, i, n) {
    for (var k = Math.max(0, i - n); k <= Math.min(lines.length - 1, i + n); k++) {
      if (/cnpj/i.test(lines[k])) return true;
    }
    return false;
  }

  function check(text, opts) {
    var lines = String(text || '').split(/\r?\n/);
    var findings = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/cnpj-lint-ignore/.test(line)) continue;
      for (var j = 0; j < COMPILED.length; j++) {
        var c = COMPILED[j], r = c.r, m;
        c.re.lastIndex = 0;
        while ((m = c.re.exec(line)) !== null) {
          if (m[0] === '') { c.re.lastIndex++; continue; }
          var ok;
          if (r.type === 'dv') {
            var raw = m[0].replace(/['"`]/g, '');
            var formatted = /[./-]/.test(raw);
            ok = (formatted || nearCnpj(lines, i, 2)) && !isValid(raw);
            if (ok) {
              var clean = raw.replace(/[^A-Z0-9]/g, '');
              findings.push({ check: r.id, sev: r.sev, line: i + 1,
                msg: r.msg + ' ' + raw + ' → DV correto ' + dv(clean.slice(0, 12)) + '. ' + r.fix, title: r.title, text: line.trim() });
            }
            continue;
          }
          ok = (r.ctx < 0) || (r.ctx === 0) || nearCnpj(lines, i, r.ctx);
          if (ok) {
            findings.push({ check: r.id, sev: r.sev, line: i + 1, msg: r.msg + ' ' + r.fix, title: r.title, text: line.trim() });
          }
          break;
        }
      }
    }
    return { findings: findings, rules: RULES.length };
  }

  var api = { engine: { check: check, dv: dv, isValid: isValid }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  root.CNPJENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
