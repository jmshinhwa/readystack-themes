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
const crypto = require('crypto');   // s163b — SHA-256 of every file in the dated all-clear record
const fs = require('fs');
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
  en: ['{t}: 0 issues in {f} file{s} of this workspace, checked against {r} rules on {d}. A dated record is what an auditor or a client asks for.', 'Get the dated all-clear report — ${p}', 'Save the dated all-clear report'],
  de: ['{t}: 0 Befunde in {f} Datei(en) dieses Arbeitsbereichs, geprüft gegen {r} Regeln am {d}. Prüfer und Kunden verlangen einen datierten Nachweis.', 'Datierten Prüfbericht holen — {p} $', 'Datierten Prüfbericht speichern'],
  ja: ['{t}: このワークスペースの {f} ファイルで問題 0 件（{d} 時点・{r} 項目で確認）。監査や取引先が求めるのは日付入りの記録です。', '日付入りの確認レポートを取得 — ${p}', '日付入りの確認レポートを保存'],
  es: ['{t}: 0 problemas en {f} archivo(s) de este espacio de trabajo, revisados con {r} reglas el {d}. Un auditor o un cliente pide un registro fechado.', 'Obtener el informe fechado — {p} US$', 'Guardar el informe fechado'],
  pt: ['{t}: 0 problemas em {f} arquivo(s) deste workspace, verificados com {r} regras em {d}. Auditores e clientes pedem um registro datado.', 'Obter o relatório datado — US$ {p}', 'Salvar o relatório datado']
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
// ★s164 2026-09-26 — the first minute. [실측 9/26] VS Code installs 349 · used 16: almost every installer's folder has none
//   of the files a checker reads, so hint() stayed silent and the product was never felt (no value seen = no paywall ever met).
//   ⇒ ONCE per install, say so and offer two one-click ways to watch it work: check a file of the user's own (their own data =
//   endowment) or the bundled sample (sample/ in the package, only when present). Free, nothing gated; the first finding is
//   quoted (a concrete loss beats a feature list). Marked before showing, so "Not now" or closing it ends it for good.
var WELCOME_T = {
  en: ['{t} is installed, but this folder has no {k} file for it to check yet. See what it catches in one click:', 'Check a file of mine', 'Show me on a sample', 'Not now',
       '{t} on the sample: {n} issue{s} against {r} checks. First: {m} Your own files get the same check the moment you open them.'],
  de: ['{t} ist installiert, aber dieser Ordner enthält noch keine {k}-Datei zum Prüfen. Mit einem Klick sehen, was es findet:', 'Eine eigene Datei prüfen', 'An einem Beispiel zeigen', 'Später',
       '{t} am Beispiel: {n} Befund(e) bei {r} Prüfungen. Zuerst: {m} Ihre eigenen Dateien werden genauso geprüft, sobald Sie sie öffnen.'],
  ja: ['{t} をインストールしました。このフォルダには確認対象の {k} ファイルがまだありません。ワンクリックで何を見つけるか確認できます:', '自分のファイルを確認', 'サンプルで見る', '後で',
       'サンプルの結果: {r} 項目中 {n} 件の問題。最初の指摘: {m} 自分のファイルも開いた瞬間に同じ確認が行われます。'],
  es: ['{t} está instalado, pero esta carpeta aún no tiene ningún archivo {k} que revisar. Mira lo que detecta con un clic:', 'Revisar un archivo mío', 'Mostrármelo con un ejemplo', 'Ahora no',
       '{t} con el ejemplo: {n} problema(s) en {r} reglas. El primero: {m} Tus archivos reciben la misma revisión en cuanto los abres.'],
  pt: ['{t} está instalado, mas esta pasta ainda não tem nenhum arquivo {k} para verificar. Veja o que ele encontra com um clique:', 'Verificar um arquivo meu', 'Mostrar num exemplo', 'Agora não',
       '{t} no exemplo: {n} problema(s) em {r} regras. O primeiro: {m} Seus arquivos recebem a mesma verificação assim que você os abre.']
};
function kindOf(glob) {   // '**/security.txt' → 'security.txt' · '**/*.{yml,yaml}' → '.yml/.yaml' · '**/*.html' → '.html'
  var g = String(glob || '').replace(/^\*\*\//, '');
  var m = g.match(/^\*\.\{([a-z0-9,]+)\}$/i); if (m) return m[1].split(',').map(function (x) { return '.' + x; }).join('/');
  m = g.match(/^\*\.([a-z0-9]+)$/i); if (m) return '.' + m[1];
  return g;
}
function globExts(glob) {   // the file dialog filter
  var g = String(glob || '').replace(/^\*\*\//, '');
  var m = g.match(/\.\{([a-z0-9,]+)\}$/i); if (m) return m[1].split(',');
  m = g.match(/\.([a-z0-9]+)$/i); if (m) return [m[1]];
  return [];
}
function sampleOf(h) {   // s168 — dot samples (.condarc · .github/workflows/*.yml) were skipped, so the "Show me on a sample" button never appeared
  var JUNK = { '.DS_Store': 1, '.gitkeep': 1, '.keep': 1 };
  function pick(dir, depth) {
    var all = fs.readdirSync(dir).filter(function (x) { return !JUNK[x]; }).sort();
    var files = all.filter(function (x) { try { return fs.statSync(path.join(dir, x)).isFile(); } catch (e) { return false; } });
    var plain = files.filter(function (x) { return x.charAt(0) !== '.'; });
    if (plain.length) return path.join(dir, plain[0]);
    if (files.length) return path.join(dir, files[0]);
    if (depth > 3) return null;
    for (var i = 0; i < all.length; i++) { var q = path.join(dir, all[i]); try { if (fs.statSync(q).isDirectory()) { var r = pick(q, depth + 1); if (r) return r; } } catch (e) { } }
    return null;
  }
  try { return pick(path.join(h.extDir || __dirname, 'sample'), 0); } catch (e) { return null; }
}
function fillW(x, h, o) {
  o = o || {};
  return String(x).replace('{t}', h.title).replace('{k}', kindOf(h.GLOB)).replace('{r}', h.R).replace('{n}', o.n == null ? '' : o.n)
    .replace('{s}', o.n === 1 ? '' : 's').replace('{m}', o.m || '');
}
async function pickMine(ctx, h, T) {
  var vscode = h.vscode, ex = globExts(h.GLOB), opt = { canSelectMany: false, openLabel: T[1] };
  if (ex.length) { opt.filters = {}; opt.filters[kindOf(h.GLOB)] = ex; }
  var picked = vscode.window.showOpenDialog ? await vscode.window.showOpenDialog(opt) : null;
  if (!picked || !picked.length) return { pick: 'cancel' };
  var doc = await vscode.workspace.openTextDocument(picked[0]);
  await vscode.window.showTextDocument(doc);
  send(vscode, h.slug || h.PREFIX, { t: 'use', slug: h.slug || h.PREFIX, src: 'vsix', why: 'welcome_pick', path: '/use/vsix/' + (h.slug || h.PREFIX) });
  return { pick: 'mine', r: h.api && h.api.run ? h.api.run(doc) : null };
}
async function welcome(ctx, h) {
  try {
    var vscode = h.vscode, st = ctx && ctx.globalState, key = h.PREFIX + '.welcomed';
    if (!st || st.get(key) || st.get(h.PREFIX + '.noHint')) return null;
    await st.update(key, today());
    var T = tr(WELCOME_T, vscode), smp = sampleOf(h);
    var btns = [T[1]].concat(smp ? [T[2]] : []).concat([T[3]]);
    _toastAt = Date.now();
    var pk = await vscode.window.showInformationMessage.apply(vscode.window, [fillW(T[0], h)].concat(btns));
    if (pk === T[1]) return Object.assign({ shown: true }, await pickMine(ctx, h, T));
    if (smp && pk === T[2]) {
      var su = vscode.Uri && vscode.Uri.file ? vscode.Uri.file(smp) : { scheme: 'file', fsPath: smp };
      var sd = await vscode.workspace.openTextDocument(su);
      await vscode.window.showTextDocument(sd);
      var res = null; try { res = h.E.engine.check(fs.readFileSync(smp, 'utf8'), { today: today(), path: smp }); } catch (e) { }
      var f = (res && res.findings) || [];
      if (h.api && h.api.run) h.api.run(sd);
      send(vscode, h.slug || h.PREFIX, { t: 'use', slug: h.slug || h.PREFIX, src: 'vsix', why: 'welcome_sample', path: '/use/vsix/' + (h.slug || h.PREFIX) });
      var first = f.length ? String(f[0].msg || f[0].message || f[0].check || '').trim().slice(0, 160) : '';
      if (first && !/[.!?。]$/.test(first)) first += '.';
      var pk2 = await vscode.window.showInformationMessage(fillW(T[4], h, { n: f.length, m: first }), T[1]);
      var more = pk2 === T[1] ? await pickMine(ctx, h, T) : null;
      return { shown: true, pick: 'sample', findings: f.length, then: more };
    }
    return { shown: true, pick: pk ? 'later' : 'dismissed' };
  } catch (e) { return null; }
}
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
  if (_h && ctx && (!o.prefix || o.prefix === _h.PREFIX)) { clearReport(ctx, _h, true, o.msg); return true; }   // s163b — sell/deliver the record
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
// ★s163b 2026-09-25 (boss decision) — the clean-result button SELLS and DELIVERS the dated all-clear report; never a dead toast.
//   no valid key → the existing key panel (license.js ensure: enter key · $29 once · team $149 · Whop annual keys validate via /api/lic)
//     with the customer's own clean numbers, 5 languages + use ping why=clear_report.
//   valid key → the paid sweep's report file (<PREFIX>-report.md, same header + report.js blocks) plus the record: tool + version,
//     rules count + rules date, UTC time, every checked file with its SHA-256, "0 issues", and the not-a-certification line → opened.
var KEY_T = {
  en: ['{t}: 0 issues in {f} file{s}, checked against {r} rules on {d}. The dated all-clear report (tool version, rules date, UTC time and the SHA-256 of every file checked) is the paid part: ${p} once, one licence key per person or CI seat. Enter your licence key, or get one.',
    'Enter licence key', 'Get a licence — ${p}', 'Licence accepted. Thank you.', 'That key did not validate. Check for typos, or get a licence.', 'Dated all-clear report written to {path}.'],
  de: ['{t}: 0 Befunde in {f} Datei(en), geprüft gegen {r} Regeln am {d}. Der datierte Prüfbericht (Tool-Version, Regelstand, UTC-Zeit und SHA-256 jeder geprüften Datei) ist der kostenpflichtige Teil: {p} $ einmalig, ein Lizenzschlüssel pro Person oder CI-Platz. Schlüssel eingeben oder einen holen.',
    'Lizenzschlüssel eingeben', 'Lizenz holen — {p} $', 'Lizenz akzeptiert. Danke.', 'Dieser Schlüssel war nicht gültig. Bitte auf Tippfehler prüfen oder eine Lizenz holen.', 'Datierter Prüfbericht gespeichert: {path}.'],
  ja: ['{t}: {f} ファイルで問題 0 件（{d}・{r} 項目で確認）。日付入りの確認レポート（ツールの版・ルールの日付・UTC 時刻・確認した全ファイルの SHA-256）は有料部分です：${p} 買い切り、1 人または CI 1 席につきライセンスキー 1 つ。キーを入力するか、購入してください。',
    'ライセンスキーを入力', 'ライセンスを購入 — ${p}', 'ライセンスを確認しました。ありがとうございます。', 'このキーは確認できませんでした。入力ミスを確かめるか、ライセンスを購入してください。', '日付入りの確認レポートを保存しました：{path}'],
  es: ['{t}: 0 problemas en {f} archivo(s), revisados con {r} reglas el {d}. El informe fechado (versión de la herramienta, fecha de las reglas, hora UTC y el SHA-256 de cada archivo revisado) es la parte de pago: {p} US$ una vez, una clave de licencia por persona o puesto de CI. Introduce tu clave o consigue una.',
    'Introducir clave de licencia', 'Obtener licencia — {p} US$', 'Licencia aceptada. Gracias.', 'Esa clave no se validó. Revisa si hay errores o consigue una licencia.', 'Informe fechado guardado en {path}.'],
  pt: ['{t}: 0 problemas em {f} arquivo(s), verificados com {r} regras em {d}. O relatório datado (versão da ferramenta, data das regras, hora UTC e o SHA-256 de cada arquivo verificado) é a parte paga: US$ {p} uma vez, uma chave de licença por pessoa ou posto de CI. Insira sua chave ou obtenha uma.',
    'Inserir chave de licença', 'Obter licença — US$ {p}', 'Licença aceita. Obrigado.', 'Essa chave não foi validada. Verifique erros de digitação ou obtenha uma licença.', 'Relatório datado salvo em {path}.']
};
var _h = null;   // the running extension's handle (start() sets it) — the clean branch of checkWorkspace reuses it
function loadMod(h, name) { try { return require(path.join(h.extDir || __dirname, name)); } catch (e) { return null; } }
function rulesDate(h) {
  var p = loadMod(h, 'package.json');
  if (p && p.readystack && p.readystack.rulesDate) return String(p.readystack.rulesDate);   // talk_restamp / scaffold stamp it from the rules file
  var f = globalThis.__yjFeed; if (f && (f.updated || f.date)) return String(f.updated || f.date).slice(0, 10);
  try { return fs.statSync(path.join(h.extDir || __dirname, 'rules.json')).mtime.toISOString().slice(0, 10) + ' (file time)'; } catch (e) { return 'not recorded'; }
}
async function scan(h, limit) {   // one scan for the hint and the record: target files only (broad globs: product word in the name)
  var vscode = h.vscode, day = new Date().toISOString().slice(0, 10), out = { files: 0, total: 0, clean: 0, list: [] };
  var uris = await vscode.workspace.findFiles(h.GLOB, '**/{node_modules,.git,dist,build,vendor}/**', limit || 300);
  for (var i = 0; i < uris.length; i++) {
    var u = uris[i], b, text;
    try { b = await vscode.workspace.fs.readFile(u); if (b.byteLength > 512 * 1024) continue; text = Buffer.from(b).toString('utf8'); } catch (e) { continue; }
    var res; try { res = h.E.engine.check(text, { today: day, path: u.fsPath }); } catch (e) { continue; }
    var n = ((res && res.findings) || []).length;
    if (!n) {
      if (!isBroad(h.GLOB) || h.toks.some(function (t) { return path.basename(u.fsPath).toLowerCase().indexOf(t) >= 0; })) {
        out.clean++; out.list.push({ uri: u, res: res, sha: crypto.createHash('sha256').update(Buffer.from(b)).digest('hex') });
      }
      continue;
    }
    if (!relevant({ glob: h.GLOB, slugTokens: h.toks, fileName: u.fsPath, findings: n, rules: h.R })) continue;
    out.files++; out.total += n;
  }
  return out;
}
async function clearReport(ctx, h, fromSweep, sweptMsg) {
  var vscode = h.vscode, st = ctx.globalState;
  try {
    var folders = vscode.workspace.workspaceFolders; if (!folders || !folders.length) return null;
    var sc = await scan(h, 2000), day = today(), R = ruleCount(h.E) || h.R, n = sc.list.length;
    var rel = function (u) { try { return vscode.workspace.asRelativePath(u); } catch (e) { return path.basename(u.fsPath || String(u)); } };
    if (sc.total || !n) {                                   // not an all-clear at this moment
      if (fromSweep) { _toastAt = Date.now(); vscode.window.showInformationMessage(sweptMsg || (h.title + ': clean.')); return { skipped: true }; }
      await vscode.commands.executeCommand(h.PREFIX + '.checkWorkspace'); return { handed: true };   // findings now → the paid sweep lists them
    }
    var L = tr(KEY_T, vscode);
    var fill = function (x, p2) { return String(x).replace('{t}', h.title).replace('{f}', n).replace('{s}', n === 1 ? '' : 's').replace('{r}', R).replace('{d}', day).replace('{p}', h.price || 29).replace('{path}', p2 || ''); };
    var S = { title: h.title, need_key: fill(L[0]), enter_key: L[1], buy: fill(L[2]), key_ok: L[3], key_bad: L[4] };
    var lic = loadMod(h, 'license.js');
    if (!lic || !lic.ensure) { if (fromSweep) { vscode.window.showInformationMessage(sweptMsg || (h.title + ': clean.')); return { skipped: true }; } await vscode.commands.executeCommand(h.PREFIX + '.checkWorkspace'); return { handed: true }; }   // ⛔never loop back into the sweep
    var had = !!st.get('licenseKey');
    if (!had) send(vscode, h.slug, { t: 'use', slug: h.slug, src: 'vsix', why: 'clear_report', path: '/use/vsix/' + h.slug });
    _toastAt = Date.now();
    var ok = await lic.ensure(vscode, ctx, S);             // ★the same key panel as the paid sweep (Polar $29 · team · Whop via /api/lic)
    if (!ok) { if (had) send(vscode, h.slug, { t: 'use', slug: h.slug, src: 'vsix', why: 'clear_report', path: '/use/vsix/' + h.slug }); return { paywall: true, msg: S.need_key }; }
    var REPORT = loadMod(h, 'report.js'), pkg = loadMod(h, 'package.json') || {};
    var at = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    var lines = ['# ' + h.title + ' — workspace report', '', 'Generated ' + day + ' · ' + n + ' files · ' + R + ' checks each · 0 findings', '',
      '## Dated all-clear record', '',
      '- Tool: ' + h.title + ' v' + (pkg.version || '?') + ' (' + (pkg.publisher || 'readystack') + '.' + (pkg.name || h.slug) + ')',
      '- Rules: ' + R + ' checks · rules file dated ' + rulesDate(h),
      '- Checked at: ' + at + ' (UTC)',
      '- Result: 0 issues', '', '## Files checked (SHA-256)', ''];
    sc.list.forEach(function (x) { lines.push('- `' + rel(x.uri) + '`  sha256:' + x.sha); });
    lines.push('');
    sc.list.forEach(function (x) { lines.push(REPORT && REPORT.toText ? REPORT.toText(x.res, rel(x.uri)) : ('== ' + rel(x.uri) + ' — Clean — no findings.')); });
    lines.push('', 'This record shows which checks were run and when; it is not a legal certification.', '');
    var target = vscode.Uri.joinPath(folders[0].uri, h.PREFIX + '-report.md');
    await vscode.workspace.fs.writeFile(target, Buffer.from(lines.join('\n'), 'utf8'));
    await st.update('lastSweep', { files: n, findings: 0, at: day });
    try { await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(target)); } catch (e) { }
    var B = tr(BADGE_T, vscode); _toastAt = Date.now();
    Promise.resolve(vscode.window.showInformationMessage(fill(L[5], rel(target)), B[0])).then(function (pk) { return pk === B[0] ? copyBadge(vscode, h, day) : null; }).catch(function () { });
    reviewTick(ctx, h, 'clean', h.today || day);
    return { report: target.fsPath, files: n };
  } catch (e) { return null; }
}
var _pinged = false;
var _sent = [];
function ping(vscode, slug, why) {
  try {
    if (_pinged) return; _pinged = true;
    send(vscode, slug, { t: 'use', slug: slug, src: 'vsix', why: why || 'auto', path: '/use/vsix/' + slug });   // s163 — [실측] no path → worker 400 {"why":"path"}: 'use' was never counted
  } catch (e) { /* counting never breaks the product */ }
}
function send(vscode, slug, o) {
  try {
    try { _sent.push((o && o.t ? o.t : '') + ':' + (o && o.why ? o.why : '')); if (_sent.length > 50) _sent.shift(); } catch (e) { }   // s174 — in-memory only (the control reads it) · nothing leaves the machine here
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
  var toks = tokens(slug), R = ruleCount(E);
  var h = { vscode: vscode, E: E, GLOB: GLOB, PREFIX: PREFIX, title: title, toks: toks, R: R, price: o.price || 29, slug: slug,
    fix: o.fix || null, homepage: o.homepage || pkgHome(), reviewDelayMs: o.reviewDelayMs, quietMs: o.quietMs, alertDelayMs: o.alertDelayMs, today: o.today || null, extDir: o.extDir || (ctx && (ctx.extensionPath || (ctx.extension && ctx.extension.extensionPath))) || __dirname };   // s163
  _h = h;   // s163b
  if (cfg().get('autoCheck', true) === false) return null;
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
    alertSoon(ctx, h);   // s182 — the rule-alert door, once per install
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
  h.api = { run: run, show: show };   // s164 — welcome() checks the picked/sample file with the same free run()
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
// s165 2026-09-27 — THE STAKE: at the money moment, say what the vendor bills (a product's own stake.json, copied from the
//   vendor's price list · never estimated). No stake.json = the old message, unchanged. [measured] Oracle JDK License Gate held
//   1/3 of all our VS Code installs with zero promotion while its paywall said only "N issues · $29" — the fear is the payroll bill.
var STAKE_T = { en: 'Estimate for my company', de: 'Für mein Unternehmen berechnen', ja: '自社の金額を試算', es: 'Calcular para mi empresa', pt: 'Calcular para minha empresa' };
// s166 2026-09-28 — THE COMPANY SHAPE: the one who pays is the company, and the vendor bills the whole payroll when ONE build
//   anywhere needs a licence, so a clean folder is not the company's safety. [measured 9/28] Oracle 149 installs · the stake line
//   only showed on DIRTY folders · estimate clicks 0. Now: a product whose stake.json carries clean_line + team_url says the
//   company line on the CLEAN result too, and the estimate result offers the team key (CI on every repo) next to the payer's
//   own number. Team key facts are Polar's product ([measured] $149 once · every linter · 5 seats) — never more than that.
var STAKE_TEAM_T = {
  en: ['CI gate for every repo - team key $149', 'One team key ($149 once, 5 seats) runs this check in GitHub Actions on every repository and pull request, and unlocks every ReadyStack linter.'],
  de: ['CI-Prüfung für jedes Repo - Team-Schlüssel $149', 'Ein Team-Schlüssel ($149 einmalig, 5 Plätze) führt diese Prüfung in GitHub Actions für jedes Repository und jeden Pull Request aus und schaltet alle ReadyStack-Linter frei.'],
  ja: ['全リポジトリの CI チェック - チームキー $149', 'チームキー 1 つ（$149 買い切り・5 席）で、このチェックを GitHub Actions で全リポジトリ・全プルリクエストに実行でき、ReadyStack の全リンターが使えます。'],
  es: ['Control en CI para cada repo - clave de equipo $149', 'Una clave de equipo ($149 pago único, 5 puestos) ejecuta esta revisión en GitHub Actions en cada repositorio y pull request, y desbloquea todos los linters de ReadyStack.'],
  pt: ['Verificação em CI para cada repo - chave de equipe US$ 149', 'Uma chave de equipe (US$ 149, pagamento único, 5 lugares) roda esta verificação no GitHub Actions em todo repositório e pull request, e libera todos os linters da ReadyStack.']
};
// s174 2026-10-01 — THE CLEAN COMPANY LINE for every product (not only stake.json ones). [measured s174 F4] VS Code installs +506
//   since 9/20 but the paid moment almost never fired: the clean toast offered only the $29 dated report for THIS folder, and the one
//   who pays $149 is a team. Now a clean result (no stake clean_line, no key yet) adds ONE honest team line + ONE team button.
//   Facts = the Whop team tier ([measured whop_tiers TEAM_TITLE] $149 one-time · 5 seats · every tool) · the URL = the TEAM_URL this
//   product's license.js already sells through (our /api/buy route -> Whop) · no CI claim (not every product ships a CI runner).
//   Same once-per-workspace toast · "Don't show again" silences it for good · seen = t:paywall why:clean_offer (morning page).
var CLEAN_TEAM_T = {
  en: ['Using this across a team? One team key ($149 once, 5 seats) unlocks the dated report in every repository you open, for every ReadyStack linter.', 'Team key — $149 once, 5 seats'],
  de: ['Im Team im Einsatz? Ein Team-Schlüssel ($149 einmalig, 5 Plätze) schaltet den datierten Bericht in jedem geöffneten Repository frei, für alle ReadyStack-Linter.', 'Team-Schlüssel — $149 einmalig, 5 Plätze'],
  ja: ['チームで使いますか？チームキー 1 つ（$149 買い切り・5 席）で、開いたすべてのリポジトリで日付入りレポートが使え、ReadyStack の全リンターが対象です。', 'チームキー — $149 買い切り・5 席'],
  es: ['¿Lo usa un equipo? Una clave de equipo ($149 pago único, 5 puestos) desbloquea el informe fechado en cada repositorio que abra, para todos los linters de ReadyStack.', 'Clave de equipo — $149 pago único, 5 puestos'],
  pt: ['Usa em equipe? Uma chave de equipe (US$ 149, pagamento único, 5 lugares) libera o relatório datado em todo repositório que você abrir, para todos os linters da ReadyStack.', 'Chave de equipe — US$ 149 uma vez, 5 lugares']
};
function teamUrlOf(h) {   // the team checkout this product already sells through (license.js TEAM_URL) · our domain only · none -> no line
  try { var src = fs.readFileSync(path.join(h.extDir || __dirname, 'license.js'), 'utf8'); var m = src.match(/const TEAM_URL = '(https:\/\/getreadystack\.com\/[^']+)'/); return m ? m[1] : ''; } catch (e) { return ''; }
}
function cleanTeam(h) {
  var url = teamUrlOf(h); if (!url) return null;
  var T = CLEAN_TEAM_T[lang(h.vscode)] || CLEAN_TEAM_T.en;
  return { line: T[0], btn: T[1], url: url };
}
// s168 2026-09-28 — THE CHAMPION NOTE. The one who installs is a developer; the one who pays $149 is a manager.
//   [measured 9 days] pay-screen reach VS Code 4 · MCP 4 — people used the free check and stopped. A developer does not spend
//   company money alone; they forward a reason. ⇒ one button writes a dated, factual note to paste into Slack / email / the ticket:
//   their own count · the vendor line from stake.json (vendor's own price list) · their estimate if they gave headcount · the free
//   fix · the team key. ⛔No invented number: every figure comes from their files, stake.json or their own input.
var NOTE_T = {
  en: ['Copy a note for my manager', '{title} - check result for the team ({day})', '{n} flagged line(s) in {files} file(s) of this workspace, checked against {rules} rules.', 'This workspace: 0 flagged lines in {files} file(s), checked against {rules} rules.', 'Each flagged line comes with its free replacement, shown in the editor.', 'Team key: $149 once, 5 seats - runs this check in CI on every repository and pull request: {url}', 'Copied. The note is also open in a new tab - paste it into Slack, email or the ticket.', 'Source'],
  de: ['Notiz für meine Führungskraft kopieren', '{title} - Prüfergebnis für das Team ({day})', '{n} markierte Zeile(n) in {files} Datei(en) dieses Workspace, geprüft gegen {rules} Regeln.', 'Dieser Workspace: 0 markierte Zeilen in {files} Datei(en), geprüft gegen {rules} Regeln.', 'Zu jeder markierten Zeile zeigt der Editor den kostenlosen Ersatz.', 'Team-Schlüssel: $149 einmalig, 5 Plätze - führt diese Prüfung in der CI für jedes Repository und jeden Pull Request aus: {url}', 'Kopiert. Die Notiz ist auch in einem neuen Tab geöffnet - in Slack, E-Mail oder Ticket einfügen.', 'Quelle'],
  ja: ['上長向けメモをコピー', '{title} - チーム向けチェック結果 ({day})', 'このワークスペースの {files} ファイルで {n} 行を検出（{rules} ルールで確認）。', 'このワークスペース: {files} ファイルで検出 0 行（{rules} ルールで確認）。', '検出した各行には無料の置き換えがエディタに表示されます。', 'チームキー: $149 買い切り・5 席 - このチェックを全リポジトリ・全プルリクエストの CI で実行: {url}', 'コピーしました。メモは新しいタブにも開いています - Slack・メール・チケットに貼り付けてください。', '出典'],
  es: ['Copiar una nota para mi responsable', '{title} - resultado de la revisión para el equipo ({day})', '{n} línea(s) marcada(s) en {files} archivo(s) de este espacio de trabajo, revisado con {rules} reglas.', 'Este espacio de trabajo: 0 líneas marcadas en {files} archivo(s), revisado con {rules} reglas.', 'Cada línea marcada trae su reemplazo gratuito, visible en el editor.', 'Clave de equipo: $149 una vez, 5 puestos - ejecuta esta revisión en CI en cada repositorio y pull request: {url}', 'Copiado. La nota también está abierta en una pestaña nueva - pégala en Slack, correo o el ticket.', 'Fuente'],
  pt: ['Copiar uma nota para meu gestor', '{title} - resultado da verificação para a equipe ({day})', '{n} linha(s) marcada(s) em {files} arquivo(s) deste workspace, verificado com {rules} regras.', 'Este workspace: 0 linhas marcadas em {files} arquivo(s), verificado com {rules} regras.', 'Cada linha marcada vem com a substituição gratuita, mostrada no editor.', 'Chave de equipe: $149 uma vez, 5 lugares - roda esta verificação no CI em cada repositório e pull request: {url}', 'Copiado. A nota também está aberta em uma nova aba - cole no Slack, e-mail ou no ticket.', 'Fonte']
};
function noteText(h, SK, info) {
  var T = NOTE_T[lang(h.vscode)] || NOTE_T.en, i = info || {}, f = function (x) { return String(x).replace('{title}', h.title || '').replace('{day}', i.day || new Date().toISOString().slice(0, 10)).replace('{n}', i.total || 0).replace('{files}', i.files || 0).replace('{rules}', h.R || '').replace('{url}', (SK.team && SK.team.url) || ''); };
  var L = ['**' + f(T[1]) + '**', '', '- ' + f(i.total ? T[2] : T[3])];
  var est = i.estimate ? ((String(i.estimate).match(/^[\s\S]*?[.。](?=\s|$)/) || [String(i.estimate)])[0]) : '';   // s168 — the payer's number only (no sales sentence in a note to the manager)
  if (est) L.push('- ' + est); else L.push('- ' + (i.total ? SK.line : (SK.clean || SK.line)));   // their own number replaces the 500-person example
  if (SK.s && SK.s.source) L.push('- ' + T[7] + ': ' + SK.s.source + (SK.s.source_url ? ' (' + SK.s.source_url + ')' : ''));
  if (i.total) L.push('- ' + T[4]);
  if (SK.team) L.push('- ' + f(T[5]));
  return L.join('\n') + '\n';
}
async function noteFlow(h, SK, info) {
  var vscode = h.vscode, txt = noteText(h, SK, info), T = NOTE_T[lang(vscode)] || NOTE_T.en;
  send(vscode, h.slug || h.PREFIX, { t: 'use', slug: h.slug || h.PREFIX, src: 'vsix', why: 'stake_note', path: '/use/vsix/' + (h.slug || h.PREFIX) });
  try { await vscode.env.clipboard.writeText(txt); } catch (e) { }
  try { var d = await vscode.workspace.openTextDocument({ content: txt, language: 'markdown' }); await vscode.window.showTextDocument(d); } catch (e) { }
  try { vscode.window.showInformationMessage(T[6]); } catch (e) { }
  return txt;
}
var _stake;
function money(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function stakeOf(h) {
  try {
    if (_stake === undefined) { _stake = null; var fp = require('path').join(h.extDir || __dirname, 'stake.json'); if (require('fs').existsSync(fp)) _stake = JSON.parse(require('fs').readFileSync(fp, 'utf8')); }
    var s = _stake; if (!s || !Array.isArray(s.bands) || !s.bands.length || !s.line) return null;
    var L = lang(h.vscode), ex = Number(s.example_heads || 500), r = rateOf(s, ex); if (!r) return null;
    var pick = function (o) { return o ? (o[L] || o.en || '') : ''; };
    var line = pick(s.line).replace('{ex}', money(ex)).replace('{exy}', money(ex * r * Number(s.months || 12)));
    var clean = pick(s.clean_line).replace('{ex}', money(ex)).replace('{exy}', money(ex * r * Number(s.months || 12)));   // s166
    var TT = STAKE_TEAM_T[L] || STAKE_TEAM_T.en, team = /^https:\/\//.test(String(s.team_url || '')) ? { url: s.team_url, label: TT[0], pitch: TT[1] } : null;   // s166
    return { s: s, line: line, btn: STAKE_T[L] || STAKE_T.en, ask: pick(s.ask), result: pick(s.result), above: pick(s.above), clean: clean, team: team, note: (NOTE_T[L] || NOTE_T.en)[0] };   // s168 note
  } catch (e) { return null; }
}
function rateOf(s, n) { for (var i = 0; i < s.bands.length; i++) { var b = s.bands[i]; if (n >= b[0] && n <= b[1]) return Number(b[2]); } return null; }
async function stakeEstimate(h, SK, label, info) {
  var vscode = h.vscode;
  var v = await vscode.window.showInputBox({ prompt: SK.ask, placeHolder: '500', validateInput: function (x) { return /^\s*[\d,.\s]+\s*$/.test(String(x || '')) ? null : '123'; } });
  var n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10); if (!n || n < 1) return null;
  send(vscode, h.slug || h.PREFIX, { t: 'use', slug: h.slug || h.PREFIX, src: 'vsix', why: 'stake_estimate', path: '/use/vsix/' + (h.slug || h.PREFIX) });
  var r = rateOf(SK.s, n), msg;
  if (!r) msg = SK.above || SK.line;
  else msg = SK.result.replace('{heads}', money(n)).replace('{rate}', r.toFixed(2)).replace('{year}', money(n * r * Number(SK.s.months || 12))).replace('{src}', SK.s.source || '');
  var estLine = msg;   // s168 — the payer's own number goes into the manager note
  if (SK.team) msg = msg + ' ' + SK.team.pitch;   // s166 — the team key next to the payer's own number
  var pk = SK.team ? await vscode.window.showInformationMessage(msg, SK.team.label, SK.note, label) : await vscode.window.showInformationMessage(msg, SK.note, label);
  if (pk === SK.note) { await noteFlow(h, SK, Object.assign({}, info || {}, { estimate: estLine })); pk = undefined; }   // s168 — handled here, so the caller does not write a second note without the estimate
  if (SK.team && pk === SK.team.label) {
    send(vscode, h.slug || h.PREFIX, { t: 'paywall', slug: h.slug || h.PREFIX, src: 'vsix_buy', why: 'stake_team', path: '/paywall/vsix_buy/' + (h.slug || h.PREFIX) });
    await vscode.env.openExternal(vscode.Uri.parse(SK.team.url));
  }
  return { n: n, rate: r, msg: msg, pick: pk };
}
async function hint(ctx, h) {
  try {
    var vscode = h.vscode, key = h.PREFIX + '.hinted', fixKey = h.PREFIX + '.fixHinted', reoffer = false;
    if (ctx.globalState.get(h.PREFIX + '.noHint')) return null;
    // s186 E6 — A DATED VENDOR EVENT re-opens the conversation ONCE per install. [실측 10/10] Oracle JDK 21 updates turn OTN
    //   (not free for production) at the 2026-10-20 CPU, but every existing user had already been hinted once, so the one
    //   moment that makes the company pay could never reach them. stake.json `event` {id, from, until} (a product's own data,
    //   dates copied from the vendor) ⇒ inside [from, until] the result toast speaks one more time, with the dated clean/dirty line.
    var EV = null;
    try {
      var SKv = stakeOf(h), ev = SKv && SKv.s && SKv.s.event, dv = h.today || new Date().toISOString().slice(0, 10);
      if (ev && ev.id && ev.from && ev.until && dv >= ev.from && dv <= ev.until && !ctx.globalState.get(h.PREFIX + '.event.' + ev.id)) EV = ev;
    } catch (e) { EV = null; }
    if (ctx.workspaceState.get(key) && EV) {
      await ctx.globalState.update(h.PREFIX + '.event.' + EV.id, true);
      send(vscode, h.slug || h.PREFIX, { t: 'use', slug: h.slug || h.PREFIX, src: 'vsix', why: 'event_' + EV.id, path: '/use/vsix/' + (h.slug || h.PREFIX) });
    } else if (ctx.workspaceState.get(key)) {
      // s185 D4 — [실측 10/10] "Fix all" shipped 10/9 to workspaces that had ALREADY been hinted once (key above) ⇒ the offer could never
      //   reach an existing user. ONE re-offer per workspace, only when this version can really fix lines there; otherwise stay quiet.
      if (!h.fix || !h.fix.count || ctx.workspaceState.get(fixKey)) return null;
      await ctx.workspaceState.update(fixKey, true);
      var fc = null; try { fc = await h.fix.count(); } catch (e) { fc = null; }
      if (!fc || !fc.lines) return null;
      reoffer = true;
    }
    if (!vscode.workspace.workspaceFolders || !vscode.workspace.workspaceFolders.length) return await welcome(ctx, h);   // s164 — no folder open: the first minute still speaks (once)
    var sc = await scan(h, 300), files = sc.files, total = sc.total, clean = sc.clean, day = new Date().toISOString().slice(0, 10);   // s163b — one scan
    await ctx.workspaceState.update(key, true);
    if (EV) await ctx.globalState.update(h.PREFIX + '.event.' + EV.id, true);   // s186 E6 — a first hint inside the window already carries the dated line
    if (h.fix) await ctx.workspaceState.update(fixKey, true);
    if (reoffer && !total) return null;   // the re-offer speaks only about lines it can fix
    var st = ctx.globalState, hasKey = !!st.get('licenseKey'), until = Number(st.get('sweepTrialUntil') || 0);
    if (!total) {
      if (!clean) return { files: 0, total: 0, clean: 0, welcome: await welcome(ctx, h) };   // s164 — nothing here it reads → ONE first-minute offer, then quiet
      var W = clearWords(vscode, { title: h.title, files: clean, rules: h.R, day: day, price: h.price || 29 });
      var lbl = hasKey ? W.save : W.buy;
      ping(vscode, h.slug || h.PREFIX, 'clear');
      var B = tr(BADGE_T, vscode), md = null;   // s163 — ONE badge action, only on a clean result
      _toastAt = Date.now(); reviewTick(ctx, h, 'clean', h.today || day);
      var SKc = stakeOf(h), estc = null;   // s166 — a clean folder is not the company's safety: say the company line on the clean result too
      var TMc = (!(SKc && SKc.clean) && !hasKey) ? cleanTeam(h) : null;   // s174 — the company line for every product
      if (TMc) send(vscode, h.slug || h.PREFIX, { t: 'paywall', slug: h.slug || h.PREFIX, src: 'vsix', why: 'clean_offer' });
      else if (SKc && SKc.clean && !hasKey) send(vscode, h.slug || h.PREFIX, { t: 'paywall', slug: h.slug || h.PREFIX, src: 'vsix', why: 'clean_stake', path: '/paywall/vsix/' + (h.slug || h.PREFIX) });   // s185 D4 — the company line on a clean result IS a money screen; it was never counted (oracle 61 clean results → money screen 0)
      var pk = (SKc && SKc.clean) ? await vscode.window.showInformationMessage(W.msg + ' ' + SKc.clean, SKc.btn, SKc.note, lbl, B[0], "Don't show again")
        : TMc ? await vscode.window.showInformationMessage(W.msg + ' ' + TMc.line, lbl, TMc.btn, B[0], "Don't show again")
        : await vscode.window.showInformationMessage(W.msg, lbl, B[0], "Don't show again");
      if (TMc && pk === TMc.btn) { send(vscode, h.slug || h.PREFIX, { t: 'paywall', slug: h.slug || h.PREFIX, src: 'vsix_buy', why: 'clean_team' }); try { await vscode.env.openExternal(vscode.Uri.parse(TMc.url)); } catch (e) { } pk = undefined; }
      if (SKc && SKc.clean && pk === SKc.btn) { estc = await stakeEstimate(h, SKc, lbl, { total: 0, files: clean, day: day }); pk = estc ? estc.pick : undefined; }
      if (SKc && SKc.clean && pk === SKc.note) { await noteFlow(h, SKc, { total: 0, files: clean, day: day }); pk = undefined; }   // s168
      var rep = null;
      if (pk === lbl) rep = await clearReport(ctx, h, false);   // s163b — sells (key panel) or delivers (dated record)
      else if (pk === B[0]) md = await copyBadge(vscode, h, h.today || day);
      else if (pk === "Don't show again") await st.update(h.PREFIX + '.noHint', true);
      return { files: 0, total: 0, clean: clean, label: lbl, msg: W.msg, badge: B[0], md: md, report: rep, team: TMc ? TMc.line : null };
    }
    // s158 — ⚑7일 무료 없음: 버튼이 곧 값이다(손님 숫자 바로 옆) · 이미 시작된 체험만 지킨다
    var label = hasKey ? 'Sweep the workspace' : ((until && Date.now() < until) ? 'Sweep the workspace (trial)' : 'Get the full report ($' + (h.price || 29) + ')');
    var msg = h.title + ': ' + total + ' issue' + (total === 1 ? '' : 's') + ' in ' + files + ' file' + (files === 1 ? '' : 's') + ' of this workspace.';
    // s184 W1 — a product that ships fixmap.js sells THE WORK: the button names it ("Fix all N lines in M files — $29 once") and runs fixAll
    //   (preview → apply → dated record). The open file stays free (Quick Fix). fix_offer = the money moment, counted.
    var FX = null; try { FX = (h.fix && h.fix.count) ? await h.fix.count() : null; } catch (e) { FX = null; }
    if (FX && FX.lines) {
      var FW = require('./fixall.js'), FT = FW.words(vscode);
      label = hasKey ? FW.fill(FT.apply, { n: FX.lines }) : FW.fill(FT.all, { n: FX.lines, f: FX.files, p: h.price || 29 });
      msg = FW.fill(FT.hint, { t: h.title, n: total, f: files, a: FX.lines });
      send(vscode, h.slug || h.PREFIX, { t: 'paywall', slug: h.slug || h.PREFIX, src: 'vsix', why: reoffer ? 'fix_reoffer' : 'fix_offer', path: '/paywall/vsix/' + (h.slug || h.PREFIX) });
    } else if (!hasKey) send(vscode, h.slug || h.PREFIX, { t: 'paywall', slug: h.slug || h.PREFIX, src: 'vsix', why: 'issue_offer', path: '/paywall/vsix/' + (h.slug || h.PREFIX) });   // s185 D4 — findings + "Get the full report ($29)" = a money screen, uncounted until now
    _toastAt = Date.now();
    var SK = stakeOf(h), est = null;   // s165 — the stake line + one estimate button, only when the product ships stake.json
    if (SK) msg = msg + ' ' + SK.line;
    var pick = SK ? await vscode.window.showInformationMessage(msg, SK.btn, SK.note, label, "Don't show again") : await vscode.window.showInformationMessage(msg, label, "Don't show again");
    if (SK && pick === SK.btn) { est = await stakeEstimate(h, SK, label, { total: total, files: files, day: day }); pick = est ? est.pick : undefined; }
    if (SK && pick === SK.note) { await noteFlow(h, SK, { total: total, files: files, day: day }); pick = undefined; }   // s168
    if (pick === label) await vscode.commands.executeCommand(h.PREFIX + ((FX && FX.lines) ? '.fixAll' : '.checkWorkspace'));
    else if (pick === "Don't show again") await st.update(h.PREFIX + '.noHint', true);
    return { files: files, total: total, label: label, msg: msg, stake: SK ? SK.line : null, estimate: est };
  } catch (e) { return null; }
}
// s182 2026-10-07 — THE EMAIL DOOR WHERE PEOPLE ACTUALLY USE US. [measured s182 T1] "used 103" in 7 days was mostly
//   extension runs (oracle-jdk-license-gate 271 · pypdf 106) while the web tools saw ~12 real uses, and no extension ever
//   asked for an address. A dated rule checker's user is exactly who needs ONE mail when that rule changes.
//   ONE toast per install, ~15 s after the first file this extension really checks (existing users included — hint() is
//   once per workspace and most of them were already hinted). It only OPENS a link: the hub page's rule-alert box
//   (package.json readystack.alertUrl, stamped by talk_restamp only when the live page carries the box). Nothing is sent
//   from here (no ping) · no result is gated · "Not now" is final for this install.
var ALERT_T = {
  en: ['Get one email when the {t} rules change{d}. Nothing else.', 'Email me when it changes', 'Not now', ' — next date: {x}'],
  de: ['Eine E-Mail, wenn sich die {t}-Regeln ändern{d}. Sonst nichts.', 'Bei Änderung mailen', 'Nicht jetzt', ' — nächstes Datum: {x}'],
  ja: ['{t} のルールが変わったときだけメールを 1 通{d}。それ以外は送りません。', '変わったらメールで知らせる', '今はしない', '（次の日付: {x}）'],
  es: ['Reciba un solo correo cuando cambien las reglas de {t}{d}. Nada más.', 'Avisarme por correo', 'Ahora no', ' — próxima fecha: {x}'],
  pt: ['Receba um único e-mail quando as regras de {t} mudarem{d}. Nada mais.', 'Avise-me por e-mail', 'Agora não', ' — próxima data: {x}']
};
function nextRuleDate(h, today) {   // the earliest date in this product's own rules.json that is today or later · none -> ''
  try {
    var src = fs.readFileSync(path.join(h.extDir || __dirname, 'rules.json'), 'utf8'), d = today || new Date().toISOString().slice(0, 10);
    var all = (src.match(/\b20\d\d-[01]\d-[0-3]\d\b/g) || []).filter(function (x) { return x >= d; }).sort();
    return all[0] || '';
  } catch (e) { return ''; }
}
function alertOf(h) {
  var p = loadMod(h, 'package.json'), rs = (p && p.readystack) || {};
  var url = String(rs.alertUrl || '');
  if (!/^https:\/\/getreadystack\.com\/[^\s'"<>]+$/.test(url)) return null;   // our domain only · not stamped -> no line
  var T = ALERT_T[lang(h.vscode)] || ALERT_T.en, nd = nextRuleDate(h, h.today);
  var topic = String(rs.alertTopic || badgeTopic(h.title));
  var line = T[0].replace('{t}', topic).replace('{d}', nd ? T[3].replace('{x}', nd) : '');
  return { line: line, btn: T[1], no: T[2], url: url, date: nd };
}
async function alertAsk(ctx, h) {
  try {
    var vscode = h.vscode, st = ctx.globalState, key = h.PREFIX + '.alertAsked';
    if (st.get(key) || st.get(h.PREFIX + '.noHint')) return null;
    var A = alertOf(h); if (!A) return null;
    await st.update(key, true);
    _toastAt = Date.now();
    var pk = await vscode.window.showInformationMessage(A.line, A.btn, A.no);
    if (pk === A.btn) await vscode.env.openExternal(vscode.Uri.parse(A.url));
    return { line: A.line, pick: pk || null, url: A.url };
  } catch (e) { return null; }
}
var _alertTimer = null;
function alertSoon(ctx, h) {
  if (_alertTimer || !ctx || !ctx.globalState || ctx.globalState.get(h.PREFIX + '.alertAsked')) return;
  _alertTimer = setTimeout(function () { alertAsk(ctx, h); }, h.alertDelayMs == null ? 15000 : h.alertDelayMs);
  if (_alertTimer && _alertTimer.unref) _alertTimer.unref();
}
module.exports = { start: start, relevant: relevant, tokens: tokens, isBroad: isBroad, clearWords: clearWords,
  sweptClean: sweptClean, badgeTopic: badgeTopic, badgeMarkdown: badgeMarkdown, reviewUrl: reviewUrl, reviewTick: reviewTick, clearReport: clearReport, scan: scan,   // s163
  welcome: welcome, kindOf: kindOf, globExts: globExts, sampleOf: sampleOf,   // s164
  send: send, _hintForTest: function (ctx, h) { return hint(ctx, h); }, stakeOf: stakeOf, rateOf: rateOf, noteText: noteText, cleanTeam: cleanTeam, alertOf: alertOf, alertAsk: alertAsk, nextRuleDate: nextRuleDate, sent: function () { return _sent.slice(); } };   // s174   // s165 · s168 noteText
