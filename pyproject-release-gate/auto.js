// auto.js — s159 "the extension speaks" (2026-09-23 s158). Shipped next to extension.js; started by one line in activate().
// [실측 s158] 419 extensions registered commands only: no check on open/save, no status bar ⇒ installs 174 · used 1 · paywall 3 (7 days).
// ★Free = the full answer for the open file (diagnostics + status bar count) · ★paid moment = ONE workspace hint with the customer's own
//   count → the existing checkWorkspace (reverse trial 7 days, then the key). Broad globs (**/*.md …) speak only on files that are the
//   checker's target (file name carries a product word, or findings are not "everything missing") so a README is never flooded.
// Off switches: settings readystack.autoCheck / readystack.workspaceHint. Telemetry: one anonymous "use" ping per session, respects
//   vscode.env.isTelemetryEnabled, READYSTACK_NO_TELEMETRY and CI.
'use strict';
const path = require('path');
const https = require('https');
const STOP = new Set(['lint', 'linter', 'check', 'checker', 'audit', 'auditor', 'gate', 'guard', 'pruefer', 'prufer', 'kit', 'pack', 'snippets',
  'clock', 'the', 'and', 'for', 'with', 'tool', 'tools', 'report', 'config', 'rules', 'rule', 'lints']);
function tokens(slug) { return String(slug || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4 && !STOP.has(w) && !/^\d+$/.test(w); }); }
function isBroad(glob) { return /^\*\*\/\*\.(\{[a-z0-9,]+\}|[a-z0-9]+)$/i.test(String(glob || '').trim()); }
function ruleCount(E) { return (E && (E.RULE_COUNT || (Array.isArray(E.RULES) ? E.RULES.length : 0))) || 0; }
function relevant(o) {
  if (!isBroad(o.glob)) return true;
  var base = path.basename(String(o.fileName || '')).toLowerCase();
  if ((o.slugTokens || []).some(function (t) { return base.indexOf(t) >= 0; })) return true;
  return o.findings > 0 && o.rules > 0 && o.findings <= Math.floor(o.rules * 0.6);
}
var _pinged = false;
function ping(vscode, slug) {
  try {
    if (_pinged) return; _pinged = true;
    if (process.env.READYSTACK_NO_TELEMETRY || process.env.CI) return;
    if (vscode && vscode.env && vscode.env.isTelemetryEnabled === false) return;
    var body = JSON.stringify({ t: 'use', slug: slug, src: 'vsix', why: 'auto' });
    var req = https.request({ hostname: 'getreadystack.com', path: '/api/ev', method: 'POST', timeout: 4000,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'user-agent': 'readystack-vsix/' + slug } },
      function (res) { res.resume(); });
    req.on('timeout', function () { req.destroy(); }); req.on('error', function () {});
    req.write(body); req.end();
  } catch (e) { /* counting never breaks the product */ }
}
function start(ctx, o) {
  var vscode = o.vscode, E = o.ENGINE, GLOB = o.GLOB, PREFIX = o.PREFIX, title = o.title || PREFIX, slug = o.slug || PREFIX;
  if (!vscode || !E || !E.engine || !GLOB || !PREFIX) return null;
  var cfg = function () { return vscode.workspace.getConfiguration('readystack'); };
  if (cfg().get('autoCheck', true) === false) return null;
  var toks = tokens(slug), R = ruleCount(E);
  var short = (String(title).split(/\s[—:(-]\s?|:\s/)[0] || title).trim().slice(0, 32);
  var diags = vscode.languages.createDiagnosticCollection(PREFIX + '.auto');
  var bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  bar.command = PREFIX + '.checkFile';
  ctx.subscriptions.push(diags, bar);
  function matches(doc) { try { return !!doc && doc.uri && doc.uri.scheme === 'file' && vscode.languages.match({ pattern: GLOB }, doc) > 0; } catch (e) { return false; } }
  function sevOf(f) { var s = String(f.sev || f.severity || 'warn').toLowerCase(); return s.indexOf('err') === 0 ? vscode.DiagnosticSeverity.Error : s.indexOf('info') === 0 ? vscode.DiagnosticSeverity.Information : vscode.DiagnosticSeverity.Warning; }
  function run(doc) {
    if (!matches(doc)) return null;
    var text = doc.getText(); if (text.length > 1024 * 1024) return null;
    var res; try { res = E.engine.check(text, { today: new Date().toISOString().slice(0, 10), path: doc.fileName }); } catch (e) { return null; }
    var f = (res && res.findings) || [];
    if (!relevant({ glob: GLOB, slugTokens: toks, fileName: doc.fileName, findings: f.length, rules: R })) { diags.delete(doc.uri); return { skip: true }; }
    diags.set(doc.uri, f.map(function (x) {
      var ln = Math.max(0, Math.min(doc.lineCount - 1, (parseInt(x.line, 10) || 1) - 1));
      var d = new vscode.Diagnostic(doc.lineAt(ln).range, String(x.msg || x.message || x.check || ''), sevOf(x)); d.source = short; return d;
    }));
    ping(vscode, slug);
    return { n: f.length };
  }
  function show(ed) {
    var r = ed && ed.document ? run(ed.document) : null;
    if (!r || r.skip) { bar.hide(); return r; }
    bar.text = r.n ? ('$(shield) ' + short + ': ' + r.n) : ('$(check) ' + short);
    bar.tooltip = r.n ? (r.n + ' finding' + (r.n === 1 ? '' : 's') + ' in this file against ' + R + ' checks - click for the list') : ('Clean against ' + R + ' checks');
    bar.show(); return r;
  }
  var t = null;
  function later(ed) { clearTimeout(t); t = setTimeout(function () { show(ed); }, 400); if (t && t.unref) t.unref(); }
  ctx.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(function (ed) { later(ed); }),
    vscode.workspace.onDidSaveTextDocument(function (doc) { var ed = vscode.window.activeTextEditor; if (ed && ed.document === doc) later(ed); else run(doc); }),
    vscode.workspace.onDidOpenTextDocument(function (doc) { var ed = vscode.window.activeTextEditor; if (!ed || ed.document !== doc) run(doc); })
  );
  later(vscode.window.activeTextEditor);
  var h = { vscode: vscode, E: E, GLOB: GLOB, PREFIX: PREFIX, title: title, toks: toks, R: R };
  if (cfg().get('workspaceHint', true) !== false) { var ht = setTimeout(function () { hint(ctx, h); }, o.hintDelayMs == null ? 8000 : o.hintDelayMs); if (ht && ht.unref) ht.unref(); }
  return { run: run, show: show, hint: function () { return hint(ctx, h); } };
}
async function hint(ctx, h) {
  try {
    var vscode = h.vscode, key = h.PREFIX + '.hinted';
    if (ctx.workspaceState.get(key) || ctx.globalState.get(h.PREFIX + '.noHint')) return null;
    if (!vscode.workspace.workspaceFolders || !vscode.workspace.workspaceFolders.length) return null;
    var uris = await vscode.workspace.findFiles(h.GLOB, '**/{node_modules,.git,dist,build,vendor}/**', 300);
    var files = 0, total = 0, day = new Date().toISOString().slice(0, 10);
    for (var i = 0; i < uris.length; i++) {
      var u = uris[i], text;
      try { var b = await vscode.workspace.fs.readFile(u); if (b.byteLength > 512 * 1024) continue; text = Buffer.from(b).toString('utf8'); } catch (e) { continue; }
      var res; try { res = h.E.engine.check(text, { today: day, path: u.fsPath }); } catch (e) { continue; }
      var n = ((res && res.findings) || []).length;
      if (!n || !relevant({ glob: h.GLOB, slugTokens: h.toks, fileName: u.fsPath, findings: n, rules: h.R })) continue;
      files++; total += n;
    }
    await ctx.workspaceState.update(key, true);
    if (!total) return { files: 0, total: 0 };
    var st = ctx.globalState, hasKey = !!st.get('licenseKey'), until = Number(st.get('sweepTrialUntil') || 0);
    var label = hasKey ? 'Sweep the workspace' : ((!until || Date.now() < until) ? 'Sweep the workspace (free for 7 days)' : 'Sweep the workspace (licence)');
    var msg = h.title + ': ' + total + ' issue' + (total === 1 ? '' : 's') + ' in ' + files + ' file' + (files === 1 ? '' : 's') + ' of this workspace.';
    var pick = await vscode.window.showInformationMessage(msg, label, "Don't show again");
    if (pick === label) await vscode.commands.executeCommand(h.PREFIX + '.checkWorkspace');
    else if (pick === "Don't show again") await st.update(h.PREFIX + '.noHint', true);
    return { files: files, total: total, label: label, msg: msg };
  } catch (e) { return null; }
}
module.exports = { start: start, relevant: relevant, tokens: tokens, isBroad: isBroad };
