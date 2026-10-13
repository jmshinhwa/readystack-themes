// Shouldly Migration Check: maps FluentAssertions lines to Shouldly lines.
// Same file runs in VS Code (node) and in the free web page (browser).
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.SHM_RULES;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });
  var SEV_RANK = { info: 0, warn: 1, error: 2 };
  var SHOULDLY = '4.3.0';
  var V7_SAFE = '[7.2.2,8.0.0)';
  var PKG_RE = /<(PackageReference|PackageVersion|package)\b[^>]*?\b(?:Include|Update|id)\s*=\s*"(FluentAssertions(?:\.[\w.]+)?)"/i;
  var USING_MSBUILD_RE = /<Using\s+Include\s*=\s*"FluentAssertions(\.[\w.]+)?"/i;
  var USING_CS_RE = /^(\s*)(global\s+)?using\s+(static\s+)?FluentAssertions(\.[\w.]+)?\s*;/;

  function daysTail(today) {
    var m = String(today == null ? '' : today).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    var d = Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(2025, 0, 14)) / 864e5);
    return d >= 0 ? ' FluentAssertions 8.0.0 (NuGet 2025-01-14) changed the licence ' + d + ' days before ' + m[0] + '.' : '';
  }
  function major(v) { var m = String(v).match(/^\s*(\d+)/); return m ? +m[1] : null; }
  function classify(v) {
    if (v == null || !String(v).trim()) return 'central';
    v = String(v).trim();
    if (/^\*/.test(v)) return 'float';
    if (/^[\[(]/.test(v)) {
      var inner = v.replace(/^[\[(]|[\])]$/g, '').split(',');
      if (inner.length === 1) return major(inner[0]) >= 8 ? 'v8' : 'v7';
      var up = inner[1].trim();
      if (!up) return 'float';
      var um = major(up);
      if (um < 8) return 'v7';
      if (um === 8 && /\)$/.test(v) && /^8(\.0)*$/.test(up)) return 'v7';
      return major(inner[0]) >= 8 ? 'v8' : 'float';
    }
    return major(v) >= 8 ? 'v8' : 'v7';
  }
  function versionOf(lines, i) {
    var m = lines[i].match(/\b(?:Version|version|VersionOverride)\s*=\s*"([^"]*)"/);
    if (m) return m[1];
    if (/\/>\s*$/.test(lines[i])) return '';
    for (var j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      var t = lines[j].match(/<Version>\s*([^<]+?)\s*<\/Version>/i);
      if (t) return t[1];
      if (/<\/(PackageReference|PackageVersion)>/i.test(lines[j])) break;
    }
    return '';
  }
  function shouldlyLine(line, v) {
    var out = line.replace(/"FluentAssertions"/i, '"Shouldly"');
    if (v) out = out.split('"' + v + '"').join('"' + SHOULDLY + '"');
    return out.trim();
  }
  function add(out, id, line, msg, fix, sev) {
    out.push({ check: id, sev: sev || BY_ID[id].sev, msg: msg, line: line, fix: fix || '' });
  }

  function check(text, opts) {
    opts = opts || {};
    var tail = daysTail(opts.today);
    var lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
    var findings = [];
    var csRules = RULES.filter(function (r) { return r.scope === 'cs' && r.pairs; });
    var inBlock = false;
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i], ln = i + 1, t = raw.trim();
      if (inBlock) { if (t.indexOf('*/') >= 0 || t.indexOf('-->') >= 0) inBlock = false; continue; }
      if (/^(\/\*|<!--)/.test(t) && t.indexOf('*/') < 0 && t.indexOf('-->') < 0) { inBlock = true; continue; }
      if (/^(\/\/|\*|<!--)/.test(t)) continue;

      var pm = raw.match(PKG_RE);
      if (pm) {
        var name = pm[2], v = versionOf(lines, i);
        if (name.toLowerCase() !== 'fluentassertions') {
          add(findings, 'fa-extension-package', ln, name + ' extends FluentAssertions and goes with it. Shouldly has no add-on to install: delete this line when the core package is replaced.', '(delete this line)');
          continue;
        }
        var kind = classify(v), fix = shouldlyLine(raw, v);
        if (kind === 'v8') add(findings, 'fa-v8-package', ln, 'FluentAssertions ' + v + ': free only for open-source and non-commercial use; commercial use needs a paid Xceed licence.' + tail + ' Replace with Shouldly ' + SHOULDLY + ' (BSD-3-Clause): ' + fix + ' , or keep the syntax with AwesomeAssertions 9.6.0 (Apache-2.0).', fix);
        else if (kind === 'float') add(findings, 'fa-floating-version', ln, 'FluentAssertions Version="' + v + '" can resolve to 8.x (commercial licence) on the next restore.' + tail + ' Pin Version="' + V7_SAFE + '" to stay on Apache-2.0, or switch: ' + fix, fix);
        else if (kind === 'v7') add(findings, 'fa-v7-apache', ln, 'FluentAssertions ' + v + ' is Apache-2.0; a bump to 8.x changes the licence. Pin Version="' + V7_SAFE + '" and ignore 8.x in Dependabot, or switch: ' + fix, fix);
        else add(findings, 'fa-central-version', ln, 'FluentAssertions version is not on this line (Directory.Packages.props or a <Version> element sets it). Check that file for 8.x; the Shouldly line here is: ' + fix, fix);
        continue;
      }
      var um = raw.match(USING_MSBUILD_RE);
      if (um) {
        var fx = um[1] ? '(delete this line)' : raw.replace(/"FluentAssertions"/i, '"Shouldly"').trim();
        add(findings, 'fa-msbuild-using', ln, 'Global using for FluentAssertions' + (um[1] || '') + ' in the project file. Shouldly: ' + fx, fx);
        continue;
      }
      var cu = raw.match(USING_CS_RE);
      if (cu) {
        var fu = cu[4] ? '(delete this line; using Shouldly; covers it)' : ((cu[2] || '') + 'using Shouldly;');
        add(findings, 'fa-using', ln, 'using FluentAssertions' + (cu[4] || '') + ';' + tail + ' Shouldly ' + SHOULDLY + ' (BSD-3-Clause): ' + fu + ' , or AwesomeAssertions 9.6.0 (Apache-2.0): using AwesomeAssertions;', fu);
        continue;
      }
      if (/\bAssertionScope\b/.test(raw)) {
        add(findings, 'fa-assertion-scope', ln, 'AssertionScope: ' + BY_ID['fa-assertion-scope'].note + '.', BY_ID['fa-assertion-scope'].note);
        continue;
      }
      if (raw.indexOf('.Should()') < 0 && raw.indexOf('.WithMessage(') < 0) continue;

      var cur = raw, hit = [], notes = [], sev = 'info';
      csRules.forEach(function (r) {
        if (r.id === 'fa-withmessage' && /ThrowAsync/.test(cur)) return;
        var matched = false;
        r.pairs.forEach(function (p) {
          var re = new RegExp(p[0], 'g');
          if (re.test(cur)) { matched = true; cur = cur.replace(new RegExp(p[0], 'g'), p[1]); }
        });
        if (matched) {
          hit.push(r);
          if (r.note && (r.id !== 'fa-withmessage' || /WithMessage\("[^"]*\*/.test(raw))) notes.push(r.note);
          if (SEV_RANK[r.sev] > SEV_RANK[sev]) sev = r.sev;
        }
      });
      if (/\.WithMessage\(/.test(cur) && /ThrowAsync/.test(cur)) notes.push('async: write (await Should.ThrowAsync<T>(act)).Message.ShouldBe(...)');
      if (/ShouldBeEquivalentTo\([^)]*=>/.test(cur)) notes.push('the options lambda has no Shouldly equivalent');
      var left = cur.indexOf('.Should()') >= 0 || /\.WithMessage\(/.test(cur);
      if (!hit.length) { add(findings, 'fa-unmapped', ln, 'Should() call with no 1:1 Shouldly method: ' + t + ' , rewrite this assertion by hand.', ''); continue; }
      if (left) notes.push('part of this line has no 1:1 Shouldly method; finish it by hand');
      var fixed = cur.trim();
      add(findings, hit[0].id, ln, hit.map(function (r) { return r.title; }).join(' + ') + ' → Shouldly: ' + fixed + (notes.length ? ' (' + notes.join('; ') + ')' : ''), fixed, left ? 'warn' : sev);
    }
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.SHMENGINE = API;
})();
