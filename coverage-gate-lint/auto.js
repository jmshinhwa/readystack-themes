// auto.js — s159 "the extension speaks" (2026-09-23 s158). Shipped next to extension.js; started by one line in activate().
// [실측 s158] 419 extensions registered commands only: no check on open/save, no status bar ⇒ installs 174 · used 1 · paywall 3 (7 days).
// ★Free = the full answer for the open file (diagnostics + status bar count) · ★paid moment = ONE workspace hint with the customer's own
//   count → the existing checkWorkspace (s158: no free trial — the key is asked with the customer's own count; no refund promise). Broad globs (**/*.md …) speak only on files that are the
//   checker's target (file name carries a product word, or findings are not "everything missing") so a README is never flooded.
// Off switches: settings readystack.autoCheck / readystack.workspaceHint. Telemetry: one anonymous "use" ping per session, respects
//   vscode.env.isTelemetryEnabled, READYSTACK_NO_TELEMETRY and CI.
// s163 2026-09-25 — two free levers so each installed checker advertises itself: ①README badge after a clean result
//   ②one review ask after value. See the block above ping().
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
// ★s162 2026-09-25 — most installers' files are CLEAN, so the old hint said nothing and the product was never felt
//   (installs 296 · used 5). For a regulation checker the clean result IS the value an auditor or client asks for:
//   say it once, dated, with the rule count, and offer the dated all-clear report (the paid sweep). Only when this
//   workspace has files the checker targets (⛔no reassurance about files it never read).
var CLEAR_T = {
  en: ['{t}: 0 issues in {f} file{s} of this workspace, checked against {r} rules on {d}. A dated record is what an auditor or a client asks for.', 'Get the dated all-clear report (${p})', 'Save the dated all-clear report'],
  de: ['{t}: 0 Befunde in {f} Datei(en) dieses Arbeitsbereichs, geprüft gegen {r} Regeln am {d}. Prüfer und Kunden verlangen einen datierten Nachweis.', 'Datierten Prüfbericht holen ({p} $)', 'Datierten Prüfbericht speichern'],
  ja: ['{t}: このワークスペースの {f} ファイルで問題 0 件（{d} 時点・{r} 項目で確認）。監査や取引先が求めるのは日付入りの記録です。', '日付入りの確認レポートを取得（${p}）', '日付入りの確認レポートを保存'],
  es: ['{t}: 0 problemas en {f} archivo(s) de este espacio de trabajo, revisados con {r} reglas el {d}. Un auditor o un cliente pide un registro fechado.', 'Obtener el informe fechado ({p} US$)', 'Guardar el informe fechado'],
  pt: ['{t}: 0 problemas em {f} arquivo(s) deste workspace, verificados com {r} regras em {d}. Auditores e clientes pedem um registro datado.', 'Obter o relatório datado (US$ {p})', 'Salvar o relatório datado']
};
function clearWords(vscode, o) {
  var lang = String((vscode && vscode.env && vscode.env.language) || 'en').slice(0, 2).toLowerCase();
  var T = CLEAR_T[lang] || CLEAR_T.en;
  var fill = function (x) { return x.replace('{t}', o.title).replace('{f}', o.files).replace('{s}', o.files === 1 ? '' : 's').replace('{r}', o.rules).replace('{d}', o.day).replace('{p}', o.price); };
  return { msg: fill(T[0]), buy: fill(T[1]), save: T[2] };
}
// ★s163 2026-09-25 — two free levers: every installed checker advertises itself (the owner has no ad budget).
//   ① README badge after a CLEAN result (the all-clear hint + the clean sweep in extension.js): ONE button copies Markdown →
//      shields.io endpoint https://getreadystack.com/badge/<slug>.json (static · badge_json.py writes it in deploy_hub.sh)
//      with a dated label, linking to the product page (package.json homepage = hub_url.py) + ?ref=badge.
//      Words are true: "<topic> · <date> | checked · ReadyStack" — ⛔never "compliant"/"certified" (no legal promise).
//   ② ONE review ask, only after value: the 3rd day with a clean result, or the first finding the user fixed.
//      Shares 'reviewAsked' with license.js (s152) → never twice across both · marked BEFORE showing (dismiss = done) ·
//      no incentive, nothing gated · silent after "Don't show again" or readystack.reviewAsk=false · VS Code →
//      Marketplace #review-details, any other host (Cursor · VSCodium · Windsurf …) → Open VSX reviews.
var BADGE_T = {
  en: ['Add a badge to your README', 'Badge Markdown copied - paste it into your README. It shows the date of this check and links to the checker.'],
  de: ['Badge zur README hinzufügen', 'Badge-Markdown kopiert - in die README einfügen. Es zeigt das Datum dieser Prüfung und verlinkt auf den Prüfer.'],
  ja: ['README にバッジを追加', 'バッジの Markdown をコピーしました。README に貼り付けてください。今回の確認日とチェッカーへのリンクが表示されます。'],
  es: ['Añadir una insignia al README', 'Markdown de la insignia copiado: pégalo en tu README. Muestra la fecha de esta revisión y enlaza al verificador.'],
  pt: ['Adicionar um selo ao README', 'Markdown do selo copiado: cole no seu README. Ele mostra a data desta verificação e leva ao verificador.']
};
var REVIEW_T = {
  en: ['If this saved you time, a short review helps others find it.', 'Write a review', 'No thanks'],
  de: ['Wenn Ihnen das Zeit gespart hat, hilft eine kurze Bewertung anderen, es zu finden.', 'Bewertung schreiben', 'Nein danke'],
  ja: ['時間の節約になったら、短いレビューがほかの人が見つける助けになります。', 'レビューを書く', '今回はしない'],
  es: ['Si te ahorró tiempo, una reseña breve ayuda a que otros lo encuentren.', 'Escribir una reseña', 'No, gracias'],
  pt: ['Se isso economizou seu tempo, uma avaliação curta ajuda outras pessoas a encontrá-lo.', 'Escrever uma avaliação', 'Não, obrigado']
};
function lang(vscode) { return String((vscode && vscode.env && vscode.env.language) || 'en').slice(0, 2).toLowerCase(); }
function tr(T, vscode) { return T[lang(vscode)] || T.en; }
function today() { return new Date().toISOString().slice(0, 10); }
var TOOLWORD = /(?:[\s-]+(?:lint|linter|lints|gate|check|checker|audit|auditor|guard|prüfer|pruefer|preflight)|\s*(?:チェック|チェッカー|リンター|リント|点検))$/i;   // Latin tool word needs a separator (Kassenprüfer stays)
function badgeTopic(title) {   // ★one source: badge_json.py asks this function for every JSON label (no second copy in Python)
  var full = String(title || '').trim();
  var t = full.split(/\s[—–-]\s|:\s/)[0].replace(/\s+\(.*$|（.*$/, '').trim() || full;   // ' (EU model…)' goes · 'FA(3)' stays
  for (var i = 0; i < 2; i++) { var u = t.replace(TOOLWORD, '').trim(); if (u.length >= 2) t = u; }
  t = t.replace(/[\[\]]/g, '').trim();
  if (t.length > 48) { var cut = t.slice(0, 48), sp = cut.lastIndexOf(' '); t = (sp > 20 ? cut.slice(0, sp) : cut).trim(); }
  return t || 'ReadyStack';
}
function enc(x) { return encodeURIComponent(x).replace(/[()'!*]/g, function (c) { return '%' + c.charCodeAt(0).toString(16).toUpperCase(); }); }
function badgeMarkdown(o) {
  var slug = String(o.slug || ''), topic = badgeTopic(o.title || slug), day = o.day || today();
  var home = String(o.homepage || ('https://getreadystack.com/tools/' + slug)).split('#')[0].split('?')[0];
  var img = 'https://img.shields.io/endpoint?url=https://getreadystack.com/badge/' + slug + '.json&label=' + enc(topic + ' · ' + day);
  return '[![' + topic + ' · checked ' + day + ' · ReadyStack](' + img + ')](' + home + '?ref=badge)';
}
function reviewUrl(vscode, ctx, slug) {
  var id = String((ctx && ctx.extension && ctx.extension.id) || ('readystack.' + slug));
  var name = id.indexOf('.') > 0 ? id.slice(id.indexOf('.') + 1) : String(slug);
  var app = String((vscode && vscode.env && vscode.env.appName) || '');
  return /visual studio code/i.test(app) ? 'https://marketplace.visualstudio.com/items?itemName=ReadyStack.' + name + '&ssr=false#review-details'
    : 'https://open-vsx.org/extension/ReadyStack/' + name + '/reviews';
}
var _toastAt = 0;
function pkgHome() { try { return require(path.join(__dirname, 'package.json')).homepage || null; } catch (e) { return null; } }
async function copyBadge(vscode, h, day) {
  var md = badgeMarkdown({ slug: h.slug, title: h.title, day: day || today(), homepage: h.homepage });
  try { await vscode.env.clipboard.writeText(md); } catch (e) { }
  send(vscode, h.slug, { t: 'use', slug: h.slug, src: 'vsix', why: 'badge_copy', path: '/badge/vsix/' + h.slug });
  _toastAt = Date.now();
  try { vscode.window.showInformationMessage(tr(BADGE_T, vscode)[1]); } catch (e) { }
  return md;
}
function sweptClean(vscode, ctx, o) {   // extension.js checkWorkspace: clean branch hands its message here (badge button + clean day)
  if (!vscode || !vscode.window || !o || !o.msg || !o.slug) return false;
  var h = { vscode: vscode, slug: o.slug, title: o.title || o.slug, PREFIX: o.prefix || '', homepage: o.homepage || pkgHome(), reviewDelayMs: o.reviewDelayMs, quietMs: o.quietMs, today: o.today || null };
  var day = h.today || today(), B = tr(BADGE_T, vscode);
  _toastAt = Date.now();
  Promise.resolve(vscode.window.showInformationMessage(o.msg, B[0])).then(function (pk) { return pk === B[0] ? copyBadge(vscode, h, day) : null; }).catch(function () { });
  reviewTick(ctx, h, 'clean', day);
  return true;
}
async function reviewTick(ctx, h, evt, day) {
  try {
    var st = ctx && ctx.globalState; if (!st || st.get('reviewAsked')) return null;
    day = day || today();
    if (evt === 'clean') {
      if (st.get('readystack.cleanDay') === day) return null;                 // one clean result per day counts
      var n = Number(st.get('readystack.cleanDays') || 0) + 1;
      await st.update('readystack.cleanDay', day); await st.update('readystack.cleanDays', n);
      if (n < 3) return null;                                                   // ⛔never before the 3rd clean day
    } else if (evt === 'resolved') {
      await st.update('readystack.resolved', Number(st.get('readystack.resolved') || 0) + 1);
    } else return null;
    var wait = h.reviewDelayMs == null ? 20000 : h.reviewDelayMs;
    if (!wait) return await askReview(ctx, h);
    return await new Promise(function (res) { var t = setTimeout(function () { askReview(ctx, h).then(res, function () { res(null); }); }, wait); if (t && t.unref) t.unref(); });
  } catch (e) { return null; }
}
async function askReview(ctx, h) {
  var vscode = h.vscode, st = ctx.globalState;
  if (st.get('reviewAsked') || (h.PREFIX && st.get(h.PREFIX + '.noHint'))) return null;
  try { if (vscode.workspace.getConfiguration('readystack').get('reviewAsk', true) === false) return null; } catch (e) { }
  if (h.quietMs !== 0 && Date.now() - _toastAt < (h.quietMs || 60000)) return null;   // another toast just now → a later day
  st.update('reviewAsked', Date.now());          // ★before showing: a dismissed toast counts too → exactly once (shared with license.js)
  _toastAt = Date.now();
  var T = tr(REVIEW_T, vscode), url = reviewUrl(vscode, ctx, h.slug);
  send(vscode, h.slug, { t: 'paywall', slug: h.slug, src: 'vsix_review', why: 'review_ask' });
  var pick = await vscode.window.showInformationMessage(T[0], T[1], T[2]);
  if (pick === T[1]) { send(vscode, h.slug, { t: 'paywall', slug: h.slug, src: 'vsix_review', why: 'review_click' }); try { await vscode.env.openExternal(vscode.Uri.parse(url)); } catch (e) { } }
  else if (pick === T[2]) send(vscode, h.slug, { t: 'paywall', slug: h.slug, src: 'vsix_review', why: 'review_no' });
  return { asked: true, pick: pick || null, url: url };
}
var _pinged = false;
function ping(vscode, slug, why) {
  try {
    if (_pinged) return; _pinged = true;
    send(vscode, slug, { t: 'use', slug: slug, src: 'vsix', why: why || 'auto', path: '/use/vsix/' + slug });   // s163 — [실측] no path → worker 400 {"why":"path"}: 'use' was never counted
  } catch (e) { /* counting never breaks the product */ }
}
function send(vscode, slug, o) {
  try {
    if (process.env.READYSTACK_NO_TELEMETRY || process.env.CI) return;
    if (vscode && vscode.env && vscode.env.isTelemetryEnabled === false) return;
    var body = JSON.stringify(o);
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
  var h = { vscode: vscode, E: E, GLOB: GLOB, PREFIX: PREFIX, title: title, toks: toks, R: R, price: o.price || 29, slug: slug,
    homepage: o.homepage || pkgHome(), reviewDelayMs: o.reviewDelayMs, quietMs: o.quietMs, today: o.today || null };   // s163
  var last = new Map();   // s163 — findings per file: a drop = the user fixed one (review moment)
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
    var k = String((doc.uri && (doc.uri.fsPath || doc.uri.toString())) || doc.fileName), prev = last.get(k); last.set(k, f.length);
    if (prev > f.length) reviewTick(ctx, h, 'resolved', h.today); else if (!f.length) reviewTick(ctx, h, 'clean', h.today);   // s163
    return { n: f.length };
  }
  function show(ed) {
    var r = ed && ed.document ? run(ed.document) : null;
    if (!r || r.skip) { bar.hide(); return r; }
    bar.text = r.n ? ('$(shield) ' + short + ': ' + r.n) : ('$(check) ' + short);
    bar.tooltip = r.n ? (r.n + ' finding' + (r.n === 1 ? '' : 's') + ' in this file against ' + R + ' checks - click for the list') : ('Clean against ' + R + ' checks on ' + new Date().toISOString().slice(0, 10));
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
  if (cfg().get('workspaceHint', true) !== false) { var ht = setTimeout(function () { hint(ctx, h); }, o.hintDelayMs == null ? 8000 : o.hintDelayMs); if (ht && ht.unref) ht.unref(); }
  return { run: run, show: show, hint: function () { return hint(ctx, h); } };
}
async function hint(ctx, h) {
  try {
    var vscode = h.vscode, key = h.PREFIX + '.hinted';
    if (ctx.workspaceState.get(key) || ctx.globalState.get(h.PREFIX + '.noHint')) return null;
    if (!vscode.workspace.workspaceFolders || !vscode.workspace.workspaceFolders.length) return null;
    var uris = await vscode.workspace.findFiles(h.GLOB, '**/{node_modules,.git,dist,build,vendor}/**', 300);
    var files = 0, total = 0, clean = 0, day = new Date().toISOString().slice(0, 10);
    for (var i = 0; i < uris.length; i++) {
      var u = uris[i], text;
      try { var b = await vscode.workspace.fs.readFile(u); if (b.byteLength > 512 * 1024) continue; text = Buffer.from(b).toString('utf8'); } catch (e) { continue; }
      var res; try { res = h.E.engine.check(text, { today: day, path: u.fsPath }); } catch (e) { continue; }
      var n = ((res && res.findings) || []).length;
      if (!n) { if (!isBroad(h.GLOB) || h.toks.some(function (t) { return path.basename(u.fsPath).toLowerCase().indexOf(t) >= 0; })) clean++; continue; }
      if (!relevant({ glob: h.GLOB, slugTokens: h.toks, fileName: u.fsPath, findings: n, rules: h.R })) continue;
      files++; total += n;
    }
    await ctx.workspaceState.update(key, true);
    var st = ctx.globalState, hasKey = !!st.get('licenseKey'), until = Number(st.get('sweepTrialUntil') || 0);
    if (!total) {
      if (!clean) return { files: 0, total: 0, clean: 0 };            // nothing here this checker reads → stay quiet
      var W = clearWords(vscode, { title: h.title, files: clean, rules: h.R, day: day, price: h.price || 29 });
      var lbl = hasKey ? W.save : W.buy;
      ping(vscode, h.slug || h.PREFIX, 'clear');
      var B = tr(BADGE_T, vscode), md = null;   // s163 — ONE badge action, only on a clean result
      _toastAt = Date.now(); reviewTick(ctx, h, 'clean', h.today || day);
      var pk = await vscode.window.showInformationMessage(W.msg, lbl, B[0], "Don't show again");
      if (pk === lbl) await vscode.commands.executeCommand(h.PREFIX + '.checkWorkspace');
      else if (pk === B[0]) md = await copyBadge(vscode, h, h.today || day);
      else if (pk === "Don't show again") await st.update(h.PREFIX + '.noHint', true);
      return { files: 0, total: 0, clean: clean, label: lbl, msg: W.msg, badge: B[0], md: md };
    }
    // s158 — ⚑7일 무료 없음: 버튼이 곧 값이다(손님 숫자 바로 옆) · 이미 시작된 체험만 지킨다
    var label = hasKey ? 'Sweep the workspace' : ((until && Date.now() < until) ? 'Sweep the workspace (trial)' : 'Get the full report ($' + (h.price || 29) + ')');
    var msg = h.title + ': ' + total + ' issue' + (total === 1 ? '' : 's') + ' in ' + files + ' file' + (files === 1 ? '' : 's') + ' of this workspace.';
    _toastAt = Date.now();
    var pick = await vscode.window.showInformationMessage(msg, label, "Don't show again");
    if (pick === label) await vscode.commands.executeCommand(h.PREFIX + '.checkWorkspace');
    else if (pick === "Don't show again") await st.update(h.PREFIX + '.noHint', true);
    return { files: files, total: total, label: label, msg: msg };
  } catch (e) { return null; }
}
module.exports = { start: start, relevant: relevant, tokens: tokens, isBroad: isBroad, clearWords: clearWords,
  sweptClean: sweptClean, badgeTopic: badgeTopic, badgeMarkdown: badgeMarkdown, reviewUrl: reviewUrl, reviewTick: reviewTick };   // s163
