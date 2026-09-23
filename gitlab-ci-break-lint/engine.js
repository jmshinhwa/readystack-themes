/* GitLab CI Break Lint - engine. Same file runs in Node (extension) and in the browser (web page). */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : window.GLCI_RULES;

  var BY_ID = {};
  for (var r = 0; r < RULES.length; r++) BY_ID[RULES[r].id] = RULES[r];

  var RESERVED = {
    stages: 1, types: 1, variables: 1, include: 1, default: 1, workflow: 1,
    image: 1, services: 1, before_script: 1, after_script: 1, script: 1,
    cache: 1, on: 1, jobs: 1, run: 1, name: 1
  };

  function strip(line) {
    var m = /^(\s*)([\s\S]*)$/.exec(line);
    var body = m[2].replace(/(^|\s)#.*$/, '$1');
    return m[1] + body.replace(/\s+$/, '');
  }

  function indentOf(line) { return /^(\s*)/.exec(line)[1].length; }

  function unquote(v) {
    return String(v).trim().replace(/^['"]|['"]$/g, '').trim();
  }

  function parse(text) {
    var lines = String(text == null ? '' : text).split(/\r?\n/).map(strip);
    var tops = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (!l.trim() || indentOf(l) !== 0) continue;
      var m = /^([A-Za-z_.][A-Za-z0-9_.\-]*):(\s[\s\S]*)?$/.exec(l);
      if (m) tops.push({ name: m[1], inline: (m[2] || '').trim(), start: i });
    }
    for (var j = 0; j < tops.length; j++) {
      tops[j].end = (j + 1 < tops.length) ? tops[j + 1].start : lines.length;
    }
    return { lines: lines, tops: tops };
  }

  function listUnder(lines, start, end, baseIndent) {
    var out = [];
    for (var i = start; i < end; i++) {
      if (!lines[i].trim()) continue;
      if (indentOf(lines[i]) <= baseIndent) break;
      var m = /^\s*-\s*(.+)$/.exec(lines[i]);
      if (!m) break;
      out.push({ value: unquote(m[1]), line: i });
    }
    return out;
  }

  function inlineList(raw) {
    var m = /^\[([\s\S]*)\]$/.exec(raw.trim());
    if (!m) return null;
    return m[1].split(',').map(unquote).filter(function (s) { return s; });
  }

  function check(text, opts) {
    opts = opts || {};
    var p = parse(text);
    var lines = p.lines, tops = p.tops;
    var findings = [];
    var seen = {};

    function add(id, line, extra) {
      var rule = BY_ID[id] || { sev: 'error', title: id, fix: '' };
      var key = id + '@' + line;
      if (seen[key]) return;
      seen[key] = 1;
      findings.push({
        check: id,
        sev: rule.sev,
        msg: rule.title + (extra ? ' (' + extra + ')' : '') + ' - ' + rule.fix,
        line: line + 1
      });
    }

    /* ---- stages declared at the top of the file ---- */
    var stages = [];
    var definedKeys = {};
    for (var t = 0; t < tops.length; t++) {
      definedKeys[tops[t].name] = 1;
      if (tops[t].name === 'stages') {
        var inl = inlineList(tops[t].inline);
        if (inl) { for (var q = 0; q < inl.length; q++) stages.push(inl[q]); }
        else {
          var items = listUnder(lines, tops[t].start + 1, tops[t].end, 0);
          for (var s = 0; s < items.length; s++) stages.push(items[s].value);
        }
      }
      if (tops[t].name === 'on' || tops[t].name === 'jobs') {
        add('github_top_level_key', tops[t].start, tops[t].name + ':');
      }
    }

    /* ---- line scans ---- */
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (!l.trim()) continue;
      var mv = /\bCI_BUILD_[A-Z0-9_]+/.exec(l);
      if (mv) add('removed_ci_build_vars', i, mv[0]);
      var mj = /\bCI_JOB_JWT(_V[12])?\b/.exec(l);
      if (mj) add('removed_ci_job_jwt', i, mj[0]);
      if (/\$\{\{/.test(l)) add('github_expression', i, null);
      if (/^\s*runs-on\s*:/.test(l)) add('github_runs_on', i, null);
      if (/^\s*(steps\s*:|-\s*uses\s*:|uses\s*:)/.test(l)) add('github_uses_steps', i, null);
      if (/^\s*cobertura\s*:/.test(l)) add('removed_cobertura_report', i, null);
      if (indentOf(l) === 0 && /^types\s*:/.test(l)) add('removed_type_keyword', i, 'types:');
      if (indentOf(l) > 0 && /^\s+type\s*:\s*\S/.test(l)) add('removed_type_keyword', i, 'type:');
      if (indentOf(l) > 0 && /^\s+(only|except)\s*:/.test(l)) add('retired_only_except', i, null);
    }

    /* ---- per job ---- */
    for (var k = 0; k < tops.length; k++) {
      var job = tops[k];
      if (RESERVED[job.name] || job.inline) continue;
      var hidden = job.name.charAt(0) === '.';
      var hasScript = false, hasOnly = false, hasRules = false;
      var startIn = -1, whenDelayed = false;

      for (var n = job.start + 1; n < job.end; n++) {
        var jl = lines[n];
        if (!jl.trim()) continue;

        if (/^\s+(script|trigger|extends|run)\s*:/.test(jl)) hasScript = true;
        if (/^\s+(only|except)\s*:/.test(jl)) hasOnly = true;
        if (/^\s+rules\s*:/.test(jl)) hasRules = true;
        if (/^\s+start_in\s*:/.test(jl)) startIn = n;
        if (/^\s+when\s*:\s*delayed\b/.test(jl)) whenDelayed = true;

        var ms = /^\s+stage\s*:\s*(\S.*)$/.exec(jl);
        if (ms && stages.length) {
          var st = unquote(ms[1]);
          if (st !== '.pre' && st !== '.post' && stages.indexOf(st) < 0) {
            add('stage_not_declared', n, st);
          }
        }

        var mp = /^\s+parallel\s*:\s*(\d+)\s*$/.exec(jl);
        if (mp) {
          var num = parseInt(mp[1], 10);
          if (num < 2 || num > 200) add('parallel_out_of_range', n, String(num));
        }

        var me = /^\s+extends\s*:\s*(\S.*)$/.exec(jl);
        if (me) {
          var ex = inlineList(me[1]) || [unquote(me[1])];
          for (var e = 0; e < ex.length; e++) {
            if (ex[e] && !definedKeys[ex[e]]) add('extends_undefined_key', n, ex[e]);
          }
        } else if (/^\s+extends\s*:\s*$/.test(jl)) {
          var exl = listUnder(lines, n + 1, job.end, indentOf(jl));
          for (var e2 = 0; e2 < exl.length; e2++) {
            if (!definedKeys[exl[e2].value]) add('extends_undefined_key', exl[e2].line, exl[e2].value);
          }
        }

        var mn = /^\s+needs\s*:\s*(\S.*)?$/.exec(jl);
        if (mn) {
          var needs = [];
          if (mn[1]) {
            var il = inlineList(mn[1]);
            if (il) { for (var y = 0; y < il.length; y++) needs.push({ value: il[y], line: n }); }
          } else {
            needs = listUnder(lines, n + 1, job.end, indentOf(jl));
          }
          for (var d = 0; d < needs.length; d++) {
            var nm = needs[d].value.replace(/^job\s*:\s*/, '');
            nm = unquote(nm.split(/\s*,\s*/)[0]);
            if (!nm || /[:{]/.test(nm)) continue;
            if (!definedKeys[nm]) add('needs_undefined_job', needs[d].line, nm);
          }
        }
      }

      if (hasOnly && hasRules) add('only_and_rules_conflict', job.start, job.name);
      if (startIn >= 0 && !whenDelayed) add('start_in_without_delayed', startIn, job.name);
      if (!hidden && !hasScript) add('job_without_script', job.start, job.name);
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, today: opts.today || '' };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.GLCIENGINE = api;
})();
