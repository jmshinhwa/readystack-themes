// s184 W1 2026-10-09 — THE WORK IS THE PRODUCT. Free = fix the file you have open (Quick Fix · light bulb).
//   Paid = the next job on the scale axis: "Fix all N lines in M files" in one click, with a preview and a dated record.
//   [실측 10/9] our two most used extensions (oracle 268 · pypdf 226 uses/week) sold a dated compliance report — 0 bought.
//   Money moves for time saved (JetBrains paid downloads: time-saving 73% · compliance 3.2%).
// Product side = <ext>/fixmap.js (pure): kind 'line' (fixLine(line, rule) · fixText(text, findings)) or kind 'file' (fixText(text, findings)
//   rewrites a whole file only inside a closed set · fixReq(line) for dependency lines, applied only when every importing file migrated).
// ⛔Never a broken edit: a line/file outside the safe set is never touched — it is listed as "by hand" with the how-to.
// ⛔Only facts in the words · no CI promise. Pings: paywall why fixall_offer (key asked at the fix moment) · use why fixall_preview / fixall_done.
'use strict';
var crypto = require('crypto');
var W = {
  en: { all: 'Fix all {n} lines in {f} files — ${p} once', one: 'Fix this line: {a}', file: 'Migrate this file ({n} lines)', none: '{t}: nothing in this workspace can be fixed automatically. {m} line(s) need a human — the list says how.',
        need: '{t}: {n} line(s) in {f} file(s) can be fixed automatically{m}. Fixing them all at once — with a preview and a dated record of every change — is the paid part: ${p} once, one licence key. The file you have open is free: use the light bulb (Quick Fix).',
        more: ' ({m} more need a human — listed with the how-to)', apply: 'Apply {n} changes', cancel: 'Cancel', done: 'Fixed {n} line(s) in {f} file(s). Record written to {r}.', hand: 'By hand', hint: '{t}: {n} issue(s) in {f} file(s) — {a} of them can be fixed automatically.' },
  de: { all: 'Alle {n} Zeilen in {f} Dateien korrigieren — ${p} einmalig', one: 'Diese Zeile korrigieren: {a}', file: 'Diese Datei migrieren ({n} Zeilen)', none: '{t}: In diesem Workspace lässt sich nichts automatisch korrigieren. {m} Zeile(n) brauchen Handarbeit — die Liste sagt wie.',
        need: '{t}: {n} Zeile(n) in {f} Datei(en) lassen sich automatisch korrigieren{m}. Alle auf einmal korrigieren — mit Vorschau und datiertem Protokoll jeder Änderung — ist der bezahlte Teil: ${p} einmalig, ein Lizenzschlüssel. Die geöffnete Datei ist kostenlos: Glühbirne (Schnellkorrektur).',
        more: ' ({m} weitere brauchen Handarbeit — mit Anleitung aufgelistet)', apply: '{n} Änderungen anwenden', cancel: 'Abbrechen', done: '{n} Zeile(n) in {f} Datei(en) korrigiert. Protokoll: {r}.', hand: 'Von Hand', hint: '{t}: {n} Befund(e) in {f} Datei(en) — {a} davon automatisch korrigierbar.' },
  ja: { all: '{f} ファイルの {n} 行をまとめて修正 — ${p} 買い切り', one: 'この行を修正: {a}', file: 'このファイルを移行（{n} 行）', none: '{t}: このワークスペースで自動修正できる行はありません。{m} 行は手作業です（一覧に方法があります）。',
        need: '{t}: {f} ファイルの {n} 行を自動修正できます{m}。まとめて修正（プレビューと全変更の日付入り記録つき）が有料部分です：${p} 買い切り・ライセンスキー 1 つ。開いているファイルは無料です：電球（クイック修正）を使ってください。',
        more: '（ほか {m} 行は手作業 — 方法つきで一覧化）', apply: '{n} 件を適用', cancel: 'キャンセル', done: '{f} ファイルの {n} 行を修正しました。記録: {r}', hand: '手作業', hint: '{t}: {f} ファイルに {n} 件 — うち {a} 件は自動修正できます。' },
  es: { all: 'Corregir las {n} líneas en {f} archivos — ${p} pago único', one: 'Corregir esta línea: {a}', file: 'Migrar este archivo ({n} líneas)', none: '{t}: nada en este espacio de trabajo se puede corregir automáticamente. {m} línea(s) requieren una persona — la lista dice cómo.',
        need: '{t}: {n} línea(s) en {f} archivo(s) se pueden corregir automáticamente{m}. Corregirlas todas a la vez — con vista previa y un registro fechado de cada cambio — es la parte de pago: ${p} pago único, una clave de licencia. El archivo abierto es gratis: use la bombilla (Corrección rápida).',
        more: ' ({m} más requieren una persona — listadas con el cómo)', apply: 'Aplicar {n} cambios', cancel: 'Cancelar', done: 'Corregidas {n} línea(s) en {f} archivo(s). Registro en {r}.', hand: 'A mano', hint: '{t}: {n} hallazgo(s) en {f} archivo(s) — {a} se corrigen automáticamente.' },
  pt: { all: 'Corrigir todas as {n} linhas em {f} arquivos — US$ {p} uma vez', one: 'Corrigir esta linha: {a}', file: 'Migrar este arquivo ({n} linhas)', none: '{t}: nada neste workspace pode ser corrigido automaticamente. {m} linha(s) precisam de uma pessoa — a lista diz como.',
        need: '{t}: {n} linha(s) em {f} arquivo(s) podem ser corrigidas automaticamente{m}. Corrigir todas de uma vez — com prévia e um registro datado de cada mudança — é a parte paga: US$ {p} uma vez, uma chave de licença. O arquivo aberto é grátis: use a lâmpada (Correção rápida).',
        more: ' ({m} outras precisam de uma pessoa — listadas com o como)', apply: 'Aplicar {n} mudanças', cancel: 'Cancelar', done: '{n} linha(s) corrigidas em {f} arquivo(s). Registro em {r}.', hand: 'À mão', hint: '{t}: {n} achado(s) em {f} arquivo(s) — {a} corrigíveis automaticamente.' }
};
function lang(vscode) { var l = String((vscode && vscode.env && vscode.env.language) || 'en').slice(0, 2).toLowerCase(); return W[l] ? l : 'en'; }
function words(vscode) { return W[lang(vscode)]; }
function fill(s, o) { return String(s).replace(/\{(\w)\}/g, function (_, k) { return o[k] == null ? '' : String(o[k]); }); }

// pure: one document's text -> {applied[], manual[], text, status} through the product's fixmap
function planText(FIX, ENGINE, text, opts) {
  var res = ENGINE.engine.check(text, opts || {}), f = (res && res.findings) || [];
  if (!f.length) return { applied: [], manual: [], text: text, status: 'none', findings: 0 };
  var r = FIX.fixText(text, f) || { applied: [], manual: [], text: text };
  if (FIX.kind === 'file' && FIX.fixReq) {   // dependency lines are planned separately (workspace decision)
    r.manual = (r.manual || []).filter(function (m) { return String(m.rule).indexOf('req-') !== 0; });
    r.req = f.filter(function (x) { return String(x.check).indexOf('req-') === 0; });
  }
  r.findings = f.length;
  return r;
}
// pure: whole workspace plan from [{rel, text}] -> {files:[{rel, text, after, applied, manual}], lines, nfiles, manualN}
function planWorkspace(FIX, ENGINE, docs, opts) {
  var out = [], blocked = false, reqDocs = [];
  docs.forEach(function (d) {
    var p = planText(FIX, ENGINE, d.text, opts);
    if (FIX.kind === 'file' && p.status === 'unsupported') blocked = true;   // one importing file left by hand ⇒ keep the dependency
    if (p.req && p.req.length) reqDocs.push({ d: d, p: p });
    out.push({ rel: d.rel, uri: d.uri, end: d.end, text: d.text, after: p.text, applied: p.applied || [], manual: p.manual || [] });
  });
  reqDocs.forEach(function (x) {
    var row = out.filter(function (o) { return o.rel === x.d.rel; })[0], lines = row.after.split(/\r?\n/), nl = /\r\n/.test(row.after) ? '\r\n' : '\n';
    x.p.req.forEach(function (f) {
      var i = f.line - 1, r = blocked ? null : FIX.fixReq(lines[i]);
      if (r && r.after != null) { row.applied.push({ line: f.line, rule: f.check, before: lines[i], after: r.after }); lines[i] = r.after; }
      else row.manual.push({ line: f.line, rule: f.check, how: blocked ? 'Keep this dependency until every file that imports PyMuPDF is migrated (some need a human — see the list), then swap it to pypdf>=6.19.' : ((FIX.HOW || {})[f.check] || 'Change this dependency by hand.') });
    });
    row.after = lines.join(nl);
  });
  var lines = 0, nfiles = 0, manualN = 0;
  out.forEach(function (o) { if (o.applied.length) { nfiles++; lines += o.applied.length; } manualN += o.manual.length; });
  return { files: out, lines: lines, nfiles: nfiles, manualN: manualN };
}
function sha(s) { return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex'); }
function previewText(o, plan, day) {
  var L = ['# ' + o.title + ' — Fix all (preview · ' + day + ')', '', plan.lines + ' line(s) in ' + plan.nfiles + ' file(s) will change. ' + plan.manualN + ' line(s) stay as they are and need a human (how-to below).', ''];
  plan.files.forEach(function (f) {
    if (!f.applied.length && !f.manual.length) return;
    L.push('## ' + f.rel);
    f.applied.forEach(function (a) { L.push('- line ' + a.line + ':', '  - before: `' + String(a.before).trim() + '`', '  - after:  `' + String(a.after).trim() + '`'); });
    f.manual.forEach(function (m) { L.push('- line ' + m.line + ' (by hand · ' + m.rule + '): ' + m.how); });
    L.push('');
  });
  return L.join('\n');
}
function recordText(o, plan, day) {
  var L = ['# ' + o.title + ' — fix record', '', 'Date (UTC): ' + new Date().toISOString(), 'Rules: ' + (o.R || '') + ' · tool ' + (o.version || ''), ''];
  plan.files.forEach(function (f) {
    if (!f.applied.length) return;
    L.push('## ' + f.rel + ' — ' + f.applied.length + ' line(s) · SHA-256 after: ' + sha(f.after));
    f.applied.forEach(function (a) { L.push('- line ' + a.line + ': `' + String(a.before).trim() + '` → `' + String(a.after).trim() + '`'); });
    L.push('');
  });
  var man = plan.files.filter(function (f) { return f.manual.length; });
  if (man.length) { L.push('## Still by hand'); man.forEach(function (f) { f.manual.forEach(function (m) { L.push('- ' + f.rel + ':' + m.line + ' — ' + m.how); }); }); }
  return L.join('\n') + '\n';
}
async function scanDocs(vscode, GLOB, cap) {
  var uris = await vscode.workspace.findFiles(GLOB, '**/{node_modules,.git,.venv,venv}/**', cap || 2000), docs = [];
  for (var i = 0; i < uris.length; i++) {
    try { var d = await vscode.workspace.openTextDocument(uris[i]); var t = d.getText(); if (t.length > 1024 * 1024) continue; docs.push({ uri: uris[i], rel: vscode.workspace.asRelativePath(uris[i]), text: t, end: d.lineAt(Math.max(0, d.lineCount - 1)).range.end }); } catch (e) { }
  }
  return docs;
}
function today() { return new Date().toISOString().slice(0, 10); }

function register(ctx, o) {
  var vscode = o.vscode, FIX = o.FIX, ENGINE = o.ENGINE;
  if (!vscode || !FIX || !ENGINE) return null;
  var ping = function (ev) { try { var A = require('./auto.js'); if (A && A.send) A.send(vscode, o.slug, ev); } catch (e) { } };
  // ── free: Quick Fix on the open file
  var provider = {
    provideCodeActions: function (doc, range) {
      try {
        if (vscode.languages.match({ pattern: o.GLOB }, doc) <= 0) return [];
        var T = words(vscode), text = doc.getText(), acts = [];
        if (FIX.kind === 'line') {
          var res = ENGINE.engine.check(text, { today: today(), path: doc.fileName }), f = (res && res.findings) || [];
          f.forEach(function (x) {
            var i = (x.line || 1) - 1; if (i < range.start.line || i > range.end.line) return;
            var r = FIX.fixLine(doc.lineAt(i).text, x.check); if (!r || r.after == null) return;
            var a = new vscode.CodeAction(fill(T.one, { a: r.after.trim().slice(0, 60) }), vscode.CodeActionKind.QuickFix);
            a.edit = new vscode.WorkspaceEdit(); a.edit.replace(doc.uri, doc.lineAt(i).range, r.after); a.isPreferred = true;
            acts.push(a);
          });
        } else {
          var p = planText(FIX, ENGINE, text, { today: today(), path: doc.fileName });
          if (p.status === 'migrated' && p.applied.length) {
            var a2 = new vscode.CodeAction(fill(T.file, { n: p.applied.length }), vscode.CodeActionKind.QuickFix);
            a2.edit = new vscode.WorkspaceEdit();
            a2.edit.replace(doc.uri, new vscode.Range(new vscode.Position(0, 0), doc.lineAt(doc.lineCount - 1).range.end), p.text);
            a2.isPreferred = true; acts.push(a2);
          }
        }
        return acts;
      } catch (e) { return []; }
    }
  };
  try { ctx.subscriptions.push(vscode.languages.registerCodeActionsProvider({ pattern: o.GLOB }, provider, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] })); } catch (e) { }
  // ── paid: Fix all in this workspace
  async function fixAll() {
    var T = words(vscode), day = today();
    var docs = await scanDocs(vscode, o.GLOB, 2000);
    var plan = planWorkspace(FIX, ENGINE, docs, { today: day });
    if (!plan.lines) { vscode.window.showInformationMessage(fill(T.none, { t: o.title, m: plan.manualN })); return { plan: plan, applied: 0 }; }
    if (!ctx.globalState.get('licenseKey')) ping({ t: 'paywall', slug: o.slug, src: 'vsix', why: 'fixall_offer', path: '/paywall/vsix/' + o.slug });   // the money moment, named by the work
    var S2 = Object.assign({}, o.S, { need_key: fill(T.need, { t: o.title, n: plan.lines, f: plan.nfiles, p: o.price || 29, m: plan.manualN ? fill(T.more, { m: plan.manualN }) : '' }) });
    if (!(await o.lic.ensure(vscode, ctx, S2))) return { plan: plan, applied: 0, gated: true };
    try { var pd = await vscode.workspace.openTextDocument({ content: previewText(o, plan, day), language: 'markdown' }); await vscode.window.showTextDocument(pd, { preview: true }); } catch (e) { }
    ping({ t: 'use', slug: o.slug, src: 'vsix', why: 'fixall_preview', path: '/use/vsix/' + o.slug });
    var go = fill(T.apply, { n: plan.lines });
    var pick = await vscode.window.showInformationMessage(fill(T.all, { n: plan.lines, f: plan.nfiles, p: o.price || 29 }).replace(/ — .*$/, '') + '?', { modal: true }, go);
    if (pick !== go) return { plan: plan, applied: 0 };
    var edit = new vscode.WorkspaceEdit();
    plan.files.forEach(function (f) {
      if (!f.applied.length || !f.uri) return;
      edit.replace(f.uri, new vscode.Range(new vscode.Position(0, 0), f.end || new vscode.Position(f.text.split(/\r?\n/).length, 0)), f.after);
    });
    await vscode.workspace.applyEdit(edit);
    try { await vscode.workspace.saveAll(false); } catch (e) { }
    var folders = vscode.workspace.workspaceFolders, rel = o.PREFIX + '-fix-record.md';
    if (folders && folders.length) { try { await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folders[0].uri, rel), Buffer.from(recordText(o, plan, day), 'utf8')); } catch (e) { } }
    ping({ t: 'use', slug: o.slug, src: 'vsix', why: 'fixall_done', path: '/use/vsix/' + o.slug });
    vscode.window.showInformationMessage(fill(T.done, { n: plan.lines, f: plan.nfiles, r: rel }));
    return { plan: plan, applied: plan.lines };
  }
  ctx.subscriptions.push(vscode.commands.registerCommand(o.PREFIX + '.fixAll', function () { return fixAll(); }));
  return { fixAll: fixAll, provider: provider, count: async function () { var p = planWorkspace(FIX, ENGINE, await scanDocs(vscode, o.GLOB, 300), { today: today() }); return { lines: p.lines, files: p.nfiles, manual: p.manualN }; } };
}
module.exports = { register: register, planText: planText, planWorkspace: planWorkspace, previewText: previewText, recordText: recordText, words: words, W: W, fill: fill };
