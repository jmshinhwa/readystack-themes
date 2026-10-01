// composer.json release gate: end-of-life PHP floors + composer validate --strict fields.
// Same file runs in Node (extension, tests) and in the browser (free web page).
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.CRG_RULES;
  var R = {};
  RULES.forEach(function (r) { R[r.id] = r; });
  var BR = R['php-floor-eol'].branches; // [[branch, security-EOL date]]
  var SPDX = {}, SPDX_DEP = {};
  R['license-not-spdx'].ids.forEach(function (i) { SPDX[i.toLowerCase()] = i; });
  R['license-deprecated'].ids.forEach(function (i) { SPDX_DEP[i.toLowerCase()] = i; });
  var NAME_RE = new RegExp(R['name-invalid'].pattern);
  var PLATFORM = /^(php(-64bit|-ipv6|-zts|-debug)?|hhvm|ext-.+|lib-.+|composer(-plugin-api|-runtime-api)?)$/i;

  function iso(d) { return d.toISOString().slice(0, 10); }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
  function cmpVer(a, b) { var x = a.split('.').map(Number), y = b.split('.').map(Number); return (x[0] - y[0]) || ((x[1] || 0) - (y[1] || 0)); }
  function eolOf(branch) {
    for (var i = 0; i < BR.length; i++) if (BR[i][0] === branch) return BR[i][1];
    return cmpVer(branch, BR[0][0]) < 0 ? BR[0][1] : null; // older than 5.6: EOL before that
  }
  // Oldest branch still supported for `days` more days: the replacement floor.
  function safeFloor(today, days) {
    var limit = addDays(today, days);
    for (var i = 0; i < BR.length; i++) if (BR[i][1] > limit) return BR[i][0];
    return BR[BR.length - 1][0];
  }
  // Lowest major.minor a constraint admits; '*' or empty = no floor.
  function floorOf(c) {
    var alts = String(c).split(/\|\|?/), lo = null;
    for (var i = 0; i < alts.length; i++) {
      var a = alts[i].trim();
      if (!a || a === '*' || /^<(?!=?\s*\d)/.test(a) || /^<=?\s*\d/.test(a)) return '0.0';
      var m = a.match(/(\d+)(?:\.(\d+|\*|x))?/);
      if (!m) continue;
      var v = m[1] + '.' + (/^\d+$/.test(m[2] || '') ? m[2] : '0');
      if (lo === null || cmpVer(v, lo) < 0) lo = v;
    }
    return lo;
  }
  function isUnbound(c) {
    return String(c).split(/\|\|?/).some(function (a) {
      a = a.trim();
      return a === '*' || /^(>=?|!=)\s*v?[\d.]+(@\w+)?$/.test(a);
    });
  }
  function lineOf(lines, key, after) {
    var re = new RegExp('"' + key.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '"\\s*:');
    for (var i = after || 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
    return after ? lineOf(lines, key, 0) : 1;
  }
  function spdxFix(id) {
    var base = id.replace(/\+$/, '');
    var cand = /\+$/.test(id) ? base + '-or-later' : base + '-only';
    return SPDX[cand.toLowerCase()] || null;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || iso(new Date());
    var out = [], lines = String(text).split(/\r?\n/), j;
    function add(id, line, msg) { out.push({ check: id, sev: R[id].sev, msg: msg, line: line, source: R[id].source }); }
    try { j = JSON.parse(text); } catch (e) {
      add('json-parse', 1, 'composer.json does not parse: ' + e.message + ' — composer stops here, nothing else can be checked.');
      return { findings: out };
    }
    if (!j || typeof j !== 'object' || Array.isArray(j)) { add('json-parse', 1, 'composer.json must be a JSON object.'); return { findings: out }; }
    var target = safeFloor(today, R['php-floor-eol-soon'].days);
    var req = j.require || {}, reqLine = lineOf(lines, 'require');

    // 1. PHP support window
    if (req.php === undefined) {
      add('php-missing', reqLine, 'No "php" in require: installs are allowed on every PHP branch, including end-of-life ones. Add → "php": "^' + target + '"');
    } else {
      var fl = floorOf(req.php), ln = lineOf(lines, 'php', reqLine - 1);
      var br = fl ? fl : '0.0', eol = eolOf(br);
      if (fl === '0.0' || (eol && eol < today)) {
        add('php-floor-eol', ln, '"php": "' + req.php + '" still admits PHP ' + (fl === '0.0' ? 'of any age' : br) +
          (eol && fl !== '0.0' ? ' (end of life ' + eol + ' per php.net)' : '') + '. Replace → "php": "^' + target + '"');
      } else if (eol && daysBetween(today, eol) <= R['php-floor-eol-soon'].days) {
        add('php-floor-eol-soon', ln, '"php": "' + req.php + '" floor is PHP ' + br + ', security support ends ' + eol +
          ' (php.net). Plan the next major → "php": "^' + target + '"');
      }
    }
    var plat = j.config && j.config.platform && j.config.platform.php;
    if (plat) {
      var pb = floorOf(plat), pe = pb && eolOf(pb);
      if (pe && pe < today) add('platform-php-eol', lineOf(lines, 'php', lineOf(lines, 'platform') - 1),
        'config.platform.php "' + plat + '" makes composer resolve every dependency for PHP ' + pb + ' (end of life ' + pe + '). Replace → "php": "' + target + '.0"');
    }

    // 2. composer validate --strict fields
    if (j.name === undefined) add('name-missing', 1, 'name : The property name is required. Add → "name": "vendor/package"');
    else if (!NAME_RE.test(String(j.name))) {
      var fix = String(j.name).toLowerCase().replace(/[^a-z0-9_.\/-]+/g, '-').replace(/_/g, '-');
      add('name-invalid', lineOf(lines, 'name'), 'name "' + j.name + '" does not match the Composer schema pattern (lowercase vendor/package). Replace → "name": "' + fix + '"');
    }
    if (j.description === undefined) add('description-missing', 1, 'description : The property description is required. Add → "description": "<one sentence>"');
    var lic = j.license;
    if (lic === undefined || lic === null || (Array.isArray(lic) && !lic.length)) {
      add('license-missing', 1, 'No license specified. Add → "license": "MIT" (or "proprietary" for closed source)');
    } else {
      var ll = lineOf(lines, 'license');
      (Array.isArray(lic) ? lic : [lic]).forEach(function (expr) {
        String(expr).replace(/[()]/g, ' ').split(/\s+(?:or|and)\s+/i).forEach(function (part) {
          var id = part.trim().split(/\s+with\s+/i)[0].trim(), k = id.toLowerCase();
          if (!id || k === 'proprietary' || /^licenseref-/i.test(id) || SPDX[k]) return;
          if (SPDX_DEP[k]) {
            var f = spdxFix(SPDX_DEP[k]);
            add('license-deprecated', ll, 'License "' + id + '" is a deprecated SPDX license identifier' + (f ? '. Replace → "' + f + '"' : '.'));
          } else add('license-not-spdx', ll, 'License "' + id + '" is not a valid SPDX license identifier (e.g. "MIT", "GPL-3.0-or-later", or "proprietary").');
        });
      });
    }
    if (j.version !== undefined) add('version-field', lineOf(lines, 'version'), 'The version field is present ("' + j.version + '"); Packagist takes versions from git tags. Delete the line.');
    Object.keys(req).forEach(function (pkg) {
      if (PLATFORM.test(pkg)) return;
      var c = String(req[pkg]), l = lineOf(lines, pkg, reqLine - 1);
      if (isUnbound(c)) add('unbound-constraint', l, 'require.' + pkg + ' : unbound version constraint (' + c + '). ' + (/\d/.test(c) ? 'Replace → "^' + c.match(/\d+(\.\d+)?/)[0] + '"' : 'Replace with the caret range of the version you test against (composer show ' + pkg + ')'));
      else if (/^=?\s*v?\d+\.\d+\.\d+$/.test(c.trim())) add('exact-constraint', l, 'require.' + pkg + ' : exact version constraint (' + c + '). Replace → "^' + c.replace(/^=?\s*v?/, '') + '"');
    });
    return { findings: out };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, safeFloor: safeFloor };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.CRGENGINE = api;
})();
