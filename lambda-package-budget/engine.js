/* Lambda Package Size Budget — engine (Node + browser). Sizes measured 2026-09-30:
   PyPI cp312 manylinux x86_64 wheels (unzipped = sum of the wheel's file sizes) and npm dist.unpackedSize. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.LPB_RULES;
  var LIMIT_UNZIPPED = 250, LIMIT_ZIPPED = 50, HEAVY_MB = 10;

  function norm(n) { return String(n).toLowerCase().replace(/[_.]+/g, '-'); }
  function find(eco, name) {
    var n = eco === 'py' ? norm(name) : name;
    for (var i = 0; i < RULES.length; i++) {
      var r = RULES[i];
      if (r.eco !== eco) continue;
      if (r.pkg === n) return r;
      if (/\/\*$/.test(r.pkg) && n.indexOf(r.pkg.slice(0, -1)) === 0) return r;
    }
    return null;
  }
  function mb(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function pct(x) { return (Math.round(x / LIMIT_UNZIPPED * 1000) / 10).toFixed(1); }

  function parseRequirements(text) {
    var out = [];
    text.split(/\r?\n/).forEach(function (raw, i) {
      var s = raw.replace(/\s#.*$/, '').replace(/^#.*$/, '').trim();
      if (!s || s.charAt(0) === '-') return;
      var m = s.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)/);
      if (m) out.push({ name: m[1], line: i + 1, section: 'requirements' });
    });
    return out;
  }
  function parsePackageJson(text) {
    var j = JSON.parse(text), lines = text.split(/\r?\n/), out = [];
    ['dependencies', 'devDependencies'].forEach(function (sec) {
      var deps = j[sec] || {}, start = 0;
      for (var k = 0; k < lines.length; k++) if (lines[k].indexOf('"' + sec + '"') >= 0) { start = k; break; }
      Object.keys(deps).forEach(function (name) {
        var line = start + 1;
        for (var k = start; k < lines.length; k++) if (lines[k].indexOf('"' + name + '"') >= 0) { line = k + 1; break; }
        out.push({ name: name, line: line, section: sec });
      });
    });
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    var budget = opts.budget_mb || LIMIT_UNZIPPED;
    var findings = [], rows = [], unmeasured = [], total = 0, zip = 0, zipKnown = true, save = 0, deps, eco;
    var t = String(text || '').replace(/^﻿/, '');
    if (/^\s*\{/.test(t)) {
      eco = 'npm';
      try { deps = parsePackageJson(t); } catch (e) {
        return { findings: [{ check: 'parse', sev: 'error', msg: 'package.json does not parse: ' + e.message, line: 1 }], summary: null };
      }
    } else { eco = 'py'; deps = parseRequirements(t); }

    deps.forEach(function (d) {
      var r = find(eco, d.name);
      var shipped = d.section !== 'devDependencies';
      if (r && r.kind === 'devdep') {
        if (d.section === 'dependencies') {
          findings.push({ check: 'dev-in-deps', sev: 'warn', line: d.line,
            msg: d.name + (r.mb ? ' (' + mb(r.mb) + ' MB unzipped, ' + r.pkg.replace('/*', '/…') + ' ' + (r.ver || '') + ')' : '') + ' is a build tool listed under "dependencies". ' + r.fix });
          if (r.mb) { total += r.mb; save += r.mb; rows.push({ pkg: d.name, mb: r.mb, line: d.line }); }
        }
        return;
      }
      if (!shipped) return;
      if (!r || r.mb == null) { unmeasured.push(d.name); if (eco === 'py') zipKnown = false; return; }
      total += r.mb; rows.push({ pkg: d.name, mb: r.mb, line: d.line });
      if (eco === 'py') { if (r.zmb != null) zip += r.zmb; else zipKnown = false; }
      var head = d.name + ' ' + (r.ver || '') + ': ' + mb(r.mb) + ' MB unzipped = ' + pct(r.mb) + '% of the 250 MB limit. ';
      if (r.kind === 'runtime') { findings.push({ check: 'in-runtime', sev: 'warn', line: d.line, msg: head + r.fix }); save += r.mb; }
      else if (r.kind === 'container') findings.push({ check: 'container-only', sev: 'error', line: d.line, msg: head + r.fix });
      else if (r.kind === 'swap') {
        var s = r.alt_mb != null ? r.mb - r.alt_mb : 0; save += s;
        findings.push({ check: 'swap', sev: 'warn', line: d.line, msg: head + r.fix + (s > 0 ? ' Saves ' + mb(s) + ' MB.' : '') });
      } else if (r.kind === 'heavy' && r.mb >= HEAVY_MB) findings.push({ check: 'heavy', sev: 'info', line: d.line, msg: head + r.fix });
    });

    rows.sort(function (a, b) { return b.mb - a.mb; });
    var note = unmeasured.length ? ' ' + unmeasured.length + ' listed package(s) are not in the size table and are not counted: ' + unmeasured.slice(0, 5).join(', ') + (unmeasured.length > 5 ? ', …' : '') + '.' : '';
    if (total > budget) {
      var after = total - save;
      findings.unshift({ check: 'over-250', sev: 'error', line: rows.length ? rows[0].line : 1,
        msg: 'Measured dependencies unzip to ' + mb(total) + ' MB: ' + mb(total - budget) + ' MB over the ' + budget + ' MB Lambda limit (layers count toward it). Largest: ' +
          rows.slice(0, 3).map(function (x) { return x.pkg + ' ' + mb(x.mb) + ' MB'; }).join(', ') + '.' +
          (save > 0 ? ' The flagged lines save ' + mb(save) + ' MB: ' + mb(after) + ' MB after the fixes, ' + (after <= budget ? mb(budget - after) + ' MB under.' : mb(after - budget) + ' MB still over: deploy a container image (10 GB limit).') : '') + note });
    }
    if (eco === 'py' && zipKnown && zip > LIMIT_ZIPPED) {
      findings.push({ check: 'over-50-zip', sev: 'warn', line: 1,
        msg: 'The measured wheels download at ' + mb(zip) + ' MB zipped, above the 50 MB limit for a .zip uploaded through the Lambda API or console. Upload the .zip through Amazon S3; the 250 MB unzipped limit still applies.' });
    }
    return { findings: findings, summary: { ecosystem: eco, total_mb: +mb(total), zipped_mb: eco === 'py' && zipKnown ? +mb(zip) : null,
      limit_mb: budget, over_mb: +mb(Math.max(0, total - budget)), savings_mb: +mb(save), rows: rows, unmeasured: unmeasured } };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.LPBENGINE = api;
})();
