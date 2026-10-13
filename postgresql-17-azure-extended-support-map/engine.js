// PostgreSQL 17 upgrade map for Azure Database for PostgreSQL Flexible Server pins in Terraform.
// Dates: learn.microsoft.com/azure/postgresql/configure-maintain/extended-support · price: prices.azure.com (East US retail, 0.07 USD per vCore-hour).
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.PG17_RULES;
  var BY = {}; RULES.forEach(function (r) { BY[r.id] = r; });
  var PRICE = 0.07, HOURS = 730;
  var RES = 'azurerm_postgresql_flexible_server';

  // blank comments char-for-char so offsets and line numbers stay true
  function strip(t) {
    var o = t.split(''), i = 0, n = t.length, inStr = false;
    while (i < n) {
      var c = t[i];
      if (inStr) { if (c === '\\') { i += 2; continue; } if (c === '"') inStr = false; i++; continue; }
      if (c === '"') { inStr = true; i++; continue; }
      if (c === '#' || (c === '/' && t[i + 1] === '/')) { while (i < n && t[i] !== '\n') { o[i] = ' '; i++; } continue; }
      if (c === '/' && t[i + 1] === '*') { while (i < n && !(t[i] === '*' && t[i + 1] === '/')) { if (t[i] !== '\n') o[i] = ' '; i++; } if (i < n) { o[i] = ' '; o[i + 1] = ' '; i += 2; } continue; }
      i++;
    }
    return o.join('');
  }
  function lineAt(t, off) { var l = 1; for (var i = 0; i < off && i < t.length; i++) if (t[i] === '\n') l++; return l; }
  function blockEnd(t, open) { var d = 0, s = false; for (var i = open; i < t.length; i++) { var c = t[i]; if (s) { if (c === '\\') { i++; continue; } if (c === '"') s = false; continue; } if (c === '"') s = true; else if (c === '{' || c === '[') d++; else if (c === '}' || c === ']') { d--; if (d === 0) return i; } } return t.length - 1; }
  function blocks(t, re) { var out = [], m; re.lastIndex = 0; while ((m = re.exec(t))) { var open = t.indexOf('{', m.index + m[0].length - 1); var end = blockEnd(t, open); out.push({ name: m[1], start: open + 1, end: end, body: t.slice(open + 1, end) }); } return out; }
  // attribute at nesting depth 0 of a block body
  function topAttr(b, name) {
    var d = 0, s = false, ls = 0, body = b.body;
    for (var i = 0; i <= body.length; i++) {
      var c = body[i];
      if (i === body.length || c === '\n') {
        if (d === 0) { var line = body.slice(ls, i); var m = line.match(new RegExp('^\\s*' + name + '\\s*=\\s*(.+?)\\s*$')); if (m) return { raw: m[1], off: b.start + ls }; }
        ls = i + 1; continue;
      }
      if (s) { if (c === '\\') { i++; continue; } if (c === '"') s = false; continue; }
      if (c === '"') s = true; else if (c === '{' || c === '[') d++; else if (c === '}' || c === ']') d--;
    }
    return null;
  }
  function lit(raw) { var m = String(raw).match(/^"?(\d+)"?$/); return m ? m[1] : null; }
  function vcores(sku) { var m = String(sku || '').match(/Standard_[A-Za-z]+?(\d+)/); return m ? +m[1] : 0; }
  function money(x) { return x.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function day(s) { var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; }

  function check(text, opts) {
    var raw = String(text || ''), t = strip(raw), findings = [];
    var today = day(opts && opts.today);
    var vars = {};
    blocks(t, /variable\s+"([^"]+)"\s*\{/g).forEach(function (b) { var a = topAttr(b, 'default'); if (a && lit(a.raw)) vars[b.name] = { v: lit(a.raw), off: a.off }; });
    blocks(t, new RegExp('resource\\s+"' + RES + '"\\s+"([^"]+)"\\s*\\{', 'g')).forEach(function (b) {
      var va = topAttr(b, 'version'); if (!va) return;
      var v = lit(va.raw), off = va.off, via = '';
      var vm = va.raw.match(/^var\.([A-Za-z0-9_-]+)$/);
      if (!v && vm && vars[vm[1]]) { v = vars[vm[1]].v; off = vars[vm[1]].off; via = ' (default of var.' + vm[1] + ')'; }
      if (!v) { var u = BY['version-unresolved']; findings.push({ check: u.id, sev: u.sev, line: lineAt(t, va.off), msg: RES + '.' + b.name + ': version = ' + va.raw + ' has no value in this file. Check the .tfvars value; 11, 12 and 13 are billed for Extended Support since 2026-09-01.' }); return; }
      var sku = topAttr(b, 'sku_name'), skuV = sku ? sku.raw.replace(/"/g, '') : '', vc = vcores(skuV);
      var r = RULES.filter(function (x) { return x.version === v; })[0];
      if (r) {
        var bs = day(r.billing_start), cost = vc ? vc + ' vCores (' + skuV + ') x 0.07 USD per vCore-hour x 730 h = ' + money(vc * PRICE * HOURS) + ' USD a month at the East US list price' : 'cost = vCores x 0.07 USD per vCore-hour (East US list price)';
        var tail = '';
        if (!isNaN(today)) {
          var dd = Math.round((today - bs) / 864e5);
          tail = dd < 0 ? ' Billing starts in ' + (-dd) + ' days.' : ' Billed for ' + dd + ' days so far' + (vc ? ' = ' + money(dd * 24 * vc * PRICE) + ' USD' : '') + '.';
        }
        var when = r.sev === 'error' ? 'billed for Extended Support since ' + r.billing_start + ' (Standard Support ended ' + r.standard_end + ')' : 'Standard Support ends ' + r.standard_end + ', Extended Support billing starts ' + r.billing_start;
        findings.push({ check: r.id, sev: r.sev, line: lineAt(t, off), msg: 'PostgreSQL ' + v + ' on ' + RES + '.' + b.name + via + ': ' + when + '; Extended Support ends ' + r.extended_end + '. ' + cost + '.' + tail + ' Fix: ' + r.fix + ' (in-place major upgrade, irreversible: test on a copy, then ALTER EXTENSION ... UPDATE for pgvector/timescaledb).' });
      }
      var st = topAttr(b, 'storage_type');
      if (st && /PremiumV2_LRS/.test(st.raw) && /^(11|12|13)$/.test(v)) { var p = BY['premiumv2-on-legacy-version']; findings.push({ check: p.id, sev: p.sev, line: lineAt(t, st.off), msg: RES + '.' + b.name + ': storage_type = "PremiumV2_LRS" does not support PostgreSQL ' + v + ' (azurerm docs). Fix: ' + p.fix + '.' }); }
      blocks(b.body, /(lifecycle)\s*\{/g).forEach(function (lb) {
        var ig = lb.body.match(/ignore_changes\s*=\s*\[[^\]]*\bversion\b[^\]]*\]/);
        if (ig) { var q = BY['version-in-ignore-changes']; findings.push({ check: q.id, sev: q.sev, line: lineAt(t, b.start + lb.start + ig.index), msg: RES + '.' + b.name + ': lifecycle.ignore_changes lists version, so changing version to "17" never reaches Azure and the server stays on ' + v + '. Fix: ' + q.fix + '.' }); }
      });
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PG17ENGINE = API;
})();
