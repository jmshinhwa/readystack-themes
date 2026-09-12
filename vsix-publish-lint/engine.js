/* VSIX Publish Lint — one brain, used by the VS Code extension and by the web page. */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.VSX_RULES;

  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

  var CATEGORIES = ['AI', 'Azure', 'Chat', 'Data Science', 'Debuggers', 'Education',
    'Extension Packs', 'Formatters', 'Keymaps', 'Language Packs', 'Linters',
    'Machine Learning', 'Notebooks', 'Other', 'Programming Languages',
    'SCM Providers', 'Snippets', 'Testing', 'Themes', 'Visualization'];

  var BADGE_HOSTS = ['api.travis-ci.com', 'api.travis-ci.org', 'badge.fury.io',
    'badgen.net', 'flat.badgen.net', 'badges.gitter.im', 'ci.appveyor.com',
    'circleci.com', 'codacy.com', 'codeclimate.com', 'codecov.io', 'coveralls.io',
    'deepscan.io', 'dev.azure.com', 'gitlab.com', 'goreportcard.com',
    'img.shields.io', 'isitmaintained.com', 'marketplace.visualstudio.com',
    'opencollective.com', 'shields.io', 'snyk.io', 'travis-ci.com', 'visualstudio.com'];

  // 1-based line of the first occurrence of a top-level-ish "key"
  function lineOf(text, key) {
    var lines = String(text).split(/\r?\n/);
    var needle = '"' + key + '"';
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(needle) !== -1) return i + 1;
    }
    return 1;
  }

  function lineOfValue(text, value) {
    var lines = String(text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(value) !== -1) return i + 1;
    }
    return 1;
  }

  function minVersion(range) {
    var m = String(range || '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
    if (!m) return null;
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3] || '0', 10)];
  }

  function cmp(a, b) {
    for (var i = 0; i < 3; i++) {
      if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    }
    return 0;
  }

  function hostOf(url) {
    var m = String(url || '').match(/^https?:\/\/([^\/?#]+)/i);
    return m ? m[1].toLowerCase() : '';
  }

  function hit(out, id, line, detail) {
    var r = BY_ID[id];
    if (!r) return;
    out.push({
      check: id,
      sev: r.sev,
      msg: (detail ? detail + ' — ' : '') + r.msg + '  Fix: ' + r.fix,
      line: line || 1
    });
  }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    var src = String(text == null ? '' : text);

    if (!src.trim()) return { findings: findings };

    var pkg;
    try {
      pkg = JSON.parse(src);
    } catch (e) {
      hit(findings, 'manifest_unparseable', 1, String(e.message).slice(0, 90));
      return { findings: findings };
    }
    if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
      hit(findings, 'manifest_unparseable', 1, 'top level is not an object');
      return { findings: findings };
    }

    var engines = pkg.engines || {};
    var eng = engines.vscode;

    if (eng === undefined || eng === null || String(eng).trim() === '') {
      hit(findings, 'engines_vscode_missing', lineOf(src, 'engines'));
    } else if (String(eng).trim() === '*') {
      hit(findings, 'engines_vscode_star', lineOf(src, 'vscode'));
    } else {
      var dev = pkg.devDependencies || {};
      var types = dev['@types/vscode'];
      var a = minVersion(types);
      var b = minVersion(eng);
      if (a && b && cmp(a, b) > 0) {
        hit(findings, 'types_vscode_ahead', lineOf(src, '@types/vscode'),
          '@types/vscode ' + types + ' vs engines.vscode ' + eng);
      }
    }

    if (!pkg.publisher || !String(pkg.publisher).trim()) {
      hit(findings, 'publisher_missing', lineOf(src, 'name'));
    }

    var nm = String(pkg.name == null ? '' : pkg.name);
    if (!nm || !/^[a-z0-9][a-z0-9_-]*$/.test(nm)) {
      hit(findings, 'name_invalid', lineOf(src, 'name'), 'name = ' + JSON.stringify(pkg.name));
    }

    var ver = String(pkg.version == null ? '' : pkg.version);
    if (!/^\d+\.\d+\.\d+$/.test(ver)) {
      hit(findings, 'version_invalid', lineOf(src, 'version'), 'version = ' + JSON.stringify(pkg.version));
    }

    var cats = pkg.categories;
    if (Array.isArray(cats)) {
      for (var c = 0; c < cats.length; c++) {
        if (CATEGORIES.indexOf(cats[c]) === -1) {
          hit(findings, 'invalid_category', lineOfValue(src, String(cats[c])),
            '"' + cats[c] + '" is not an allowed category');
        }
      }
    }

    var badges = pkg.badges;
    if (Array.isArray(badges)) {
      for (var d = 0; d < badges.length; d++) {
        var url = badges[d] && badges[d].url;
        var h = hostOf(url);
        if (!h || BADGE_HOSTS.indexOf(h) === -1) {
          hit(findings, 'badge_host_unapproved', lineOfValue(src, String(url || 'badges')),
            (h || 'that URL') + ' is not an approved badge host');
        }
      }
    }

    if (!pkg.main && !pkg.browser && !pkg.contributes) {
      hit(findings, 'entrypoint_missing', 1);
    }

    var repo = pkg.repository;
    var repoUrl = repo && (typeof repo === 'string' ? repo : repo.url);
    if (!repoUrl || !String(repoUrl).trim()) {
      hit(findings, 'repository_missing', lineOf(src, 'name'));
    }

    if (!pkg.license || !String(pkg.license).trim()) {
      hit(findings, 'license_field_missing', lineOf(src, 'version'));
    }

    if (!pkg.icon || !String(pkg.icon).trim()) {
      hit(findings, 'icon_missing', lineOf(src, 'displayName'));
    }

    var acts = Array.isArray(pkg.activationEvents) ? pkg.activationEvents : [];
    var declared = {};
    var contributed = (pkg.contributes && Array.isArray(pkg.contributes.commands))
      ? pkg.contributes.commands : [];
    for (var k = 0; k < contributed.length; k++) {
      if (contributed[k] && contributed[k].command) declared[contributed[k].command] = true;
    }
    for (var j = 0; j < acts.length; j++) {
      var ev = String(acts[j]);
      if (ev === '*') {
        hit(findings, 'wildcard_activation', lineOfValue(src, '"*"'));
      } else if (ev.indexOf('onCommand:') === 0 && declared[ev.slice(10)]) {
        hit(findings, 'redundant_oncommand', lineOfValue(src, ev), ev);
      }
    }

    var desc = String(pkg.description == null ? '' : pkg.description);
    if (desc.length > 200) {
      hit(findings, 'description_too_long', lineOf(src, 'description'),
        desc.length + ' characters, ' + (desc.length - 200) + ' over');
    }

    findings.sort(function (x, y) {
      if (x.sev !== y.sev) return x.sev === 'error' ? -1 : 1;
      return x.line - y.line;
    });
    return { findings: findings };
  }

  var api = {
    engine: { check: check },
    RULES: RULES,
    RULE_COUNT: RULES.length,
    CATEGORIES: CATEGORIES,
    BADGE_HOSTS: BADGE_HOSTS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.VSXLINT = api;
})(typeof window !== 'undefined' ? window : globalThis);
