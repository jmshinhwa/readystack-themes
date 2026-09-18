// Actions Expiry Lint — the brain. One file, runs in Node (extension) and in the browser (free web check).
'use strict';
var D = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.AXL_RULES;

var RULES = D.checks;
var RULE_COUNT = RULES.length;

function days(from, to) { return Math.floor((Date.parse(to) - Date.parse(from)) / 86400000); }
function ago(n) { return n === 1 ? '1 day ago' : n + ' days ago'; }
function within(n) { return n === 1 ? 'in 1 day' : 'in ' + n + ' days'; }
function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function token(line, label) { return new RegExp('(^|[^A-Za-z0-9._-])' + esc(label) + '([^A-Za-z0-9._/-]|$)').test(line); }

var USES = /uses\s*:\s*['"]?([A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+?)@([^\s'"#]+)/;
var NODEV = /node-version\s*:\s*(.+)$/;
var SHA = /^[0-9a-f]{40}$/i;

function check(text, opts) {
  opts = opts || {};
  var today = String(opts.today || new Date().toISOString().slice(0, 10)).slice(0, 10);
  var out = [];
  var lines = String(text == null ? '' : text).split(/\r?\n/);

  function add(id, msg, ln) {
    for (var i = 0; i < RULES.length; i++) {
      if (RULES[i].id === id) { out.push({ check: id, sev: RULES[i].sev, msg: msg, line: ln }); return; }
    }
  }

  for (var i = 0; i < lines.length; i++) {
    var ln = i + 1;
    var raw = lines[i];
    if (/^\s*#/.test(raw)) continue;
    var line = raw.replace(/#.*$/, '');
    if (!line.trim()) continue;

    // --- runner images -------------------------------------------------
    if (!/uses\s*:/.test(line)) {
      for (var r = 0; r < D.runners.length; r++) {
        var im = D.runners[r];
        if (!token(line, im.label)) continue;
        var d = days(im.retired, today);
        if (d >= 0) add('runner-retired', 'Runner image ' + im.label + ' was removed on ' + im.retired + ' (' + ago(d) + '). Jobs asking for it fail to start. Move to ' + im.use + '.', ln);
        else add('runner-retiring', 'Runner image ' + im.label + ' is scheduled for removal on ' + im.retired + ' (' + within(-d) + ' from ' + today + '). Move to ' + im.use + ' before then.', ln);
      }
      for (var f = 0; f < D.floating.length; f++) {
        if (token(line, D.floating[f])) add('runner-floating', D.floating[f] + ' is a moving label — GitHub repoints it to a newer image without changing your file. Pin the image if the build depends on it.', ln);
      }
    }

    // --- uses: action@ref ----------------------------------------------
    var mu = line.match(USES);
    if (mu) {
      var repo = mu[1], ref = mu[2], a, k;
      for (k = 0; k < D.archived.length; k++) {
        a = D.archived[k];
        if (repo === a.name || repo.indexOf(a.name + '/') === 0) add('action-archived', repo + ' is an archived repository — it is read-only and gets no fixes or runtime updates. Use ' + a.use + ' instead.', ln);
      }
      var mver = ref.match(/^v?(\d+)/);
      if (!mver && !SHA.test(ref)) add('action-unpinned', 'uses: ' + repo + '@' + ref + ' follows a moving ref. Whatever is on that branch runs with your repository token on the next push. Pin a release tag or a full commit SHA.', ln);
      if (mver) {
        var major = parseInt(mver[1], 10);
        for (k = 0; k < D.actions.length; k++) {
          a = D.actions[k];
          if (repo !== a.name) continue;
          if (a.shutdown_below && major < a.shutdown_below) {
            var sd = days(a.shutdown_on, today);
            if (sd >= 0) add('action-shutdown', repo + '@v' + major + ' was switched off on ' + a.shutdown_on + ' (' + ago(sd) + ') — the service behind it no longer answers, so the step errors out. Use ' + a.use + '.', ln);
            else add('action-runtime-old', repo + '@v' + major + ' is scheduled for shutdown on ' + a.shutdown_on + ' (' + within(-sd) + ' from ' + today + '). Move to ' + a.use + ' before then.', ln);
          } else if (a.old_below && major < a.old_below) {
            add('action-runtime-old', repo + '@v' + major + ' runs on a Node runtime the current runner images no longer ship. Use ' + a.use + '.', ln);
          }
        }
      }
    }

    // --- node-version ---------------------------------------------------
    var mn = line.match(NODEV);
    var majors = [];
    if (mn) {
      var toks = mn[1].replace(/[\[\]'",]/g, ' ').split(/\s+/);
      for (k = 0; k < toks.length; k++) {
        var mt = toks[k].match(/^(\d+)(\.|$)/);
        if (mt && majors.indexOf(mt[1]) < 0) majors.push(mt[1]);
      }
    }
    for (var mi = 0; mi < majors.length; mi++) {
      var maj = majors[mi];
      for (k = 0; k < D.node.length; k++) {
        var nv = D.node[k];
        if (nv.major !== maj) continue;
        var nd = days(nv.eol, today);
        if (nd >= 0) add('node-eol', 'Node ' + maj + ' left maintenance on ' + nv.eol + ' (' + ago(nd) + '). It gets no more security patches, and setup-node keeps installing it anyway.', ln);
        else if (-nd <= D.soon_days) add('node-eol-soon', 'Node ' + maj + ' reaches end-of-life on ' + nv.eol + ' (' + within(-nd) + ' from ' + today + '). Plan the bump inside this window.', ln);
        if (nv.odd) add('node-odd-release', 'Node ' + maj + ' is an odd-numbered line — odd lines never become LTS, so this one was short-lived by design. Pick an even line.', ln);
      }
    }

    // --- retired workflow commands ---------------------------------------
    if (/::\s*set-output/.test(line)) add('cmd-set-output', 'The ::set-output:: command was disabled by the runner; the value never reaches the next step. Append to the $GITHUB_OUTPUT file instead.', ln);
    if (/::\s*save-state/.test(line)) add('cmd-save-state', 'The ::save-state:: command was disabled by the runner. Append to the $GITHUB_STATE file instead.', ln);
    if (/::\s*set-env/.test(line) || /::\s*add-path/.test(line)) add('cmd-set-env', 'The ::set-env:: and ::add-path:: commands were disabled in November 2020 after a command-injection advisory. Append to $GITHUB_ENV or $GITHUB_PATH instead.', ln);
  }

  out.sort(function (x, y) { return (x.line - y.line) || (x.check < y.check ? -1 : 1); });
  return { findings: out, revision: D.revision, revised: D.revised, checked_as_of: today, rule_count: RULE_COUNT };
}

var AXLENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULE_COUNT };
if (typeof module !== 'undefined' && module.exports) module.exports = AXLENGINE;
else window.AXLENGINE = AXLENGINE;
