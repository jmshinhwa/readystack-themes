// buyopen.js — s195 K2: the money press opens the checkout HONESTLY and counts when it does not open.
//   Before openExternal: one line in the VS Code display language ("opens the secure Whop checkout in your browser —
//   VS Code will ask once to open the link"). openExternal returns false when that VS Code dialog is cancelled
//   [실측 s195: 5 of 8 presses in 7 days never reached /api/buy] ⇒ we offer "Copy checkout link" / "Open again".
//   Anonymous ping src=vsix_open why=opened|declined|error|reopened|redeclined|copied (slug only · no key, path, name).
//   Honours vscode.env.isTelemetryEnabled and READYSTACK_NO_TELEMETRY. Never throws: worst case = plain openExternal.
'use strict';
const https = require('https');
const NOTE = {
  en: 'Opens the secure Whop checkout in your browser — VS Code will ask once to open the link.',
  de: 'Öffnet den sicheren Whop-Checkout in Ihrem Browser — VS Code fragt einmal, ob der Link geöffnet werden darf.',
  ja: '安全な Whop の決済ページをブラウザで開きます — VS Code がリンクを開くか一度だけ確認します。',
  es: 'Abre el pago seguro de Whop en tu navegador — VS Code te preguntará una vez si abrir el enlace.',
  pt: 'Abre o checkout seguro da Whop no seu navegador — o VS Code vai perguntar uma vez se pode abrir o link.' };
const MISS = {
  en: ['The checkout did not open. You can copy the link or try once more.', 'Copy checkout link', 'Open again'],
  de: ['Der Checkout wurde nicht geöffnet. Sie können den Link kopieren oder es erneut versuchen.', 'Checkout-Link kopieren', 'Erneut öffnen'],
  ja: ['決済ページが開きませんでした。リンクをコピーするか、もう一度お試しください。', '決済リンクをコピー', 'もう一度開く'],
  es: ['El pago no se abrió. Puedes copiar el enlace o intentarlo otra vez.', 'Copiar enlace de pago', 'Abrir de nuevo'],
  pt: ['O checkout não abriu. Você pode copiar o link ou tentar de novo.', 'Copiar link do checkout', 'Abrir de novo'] };
const COPIED = { en: 'Checkout link copied — paste it into your browser.', de: 'Checkout-Link kopiert — fügen Sie ihn in Ihren Browser ein.',
  ja: '決済リンクをコピーしました — ブラウザに貼り付けてください。', es: 'Enlace copiado — pégalo en tu navegador.', pt: 'Link copiado — cole no seu navegador.' };
const _sent = [];
function lang(vscode) { const l = String((vscode && vscode.env && vscode.env.language) || 'en').slice(0, 2).toLowerCase(); return NOTE[l] ? l : 'en'; }
function note(vscode) { return NOTE[lang(vscode)]; }
function ping(vscode, slug, why) {
  try {
    _sent.push(why);
    if (process.env.READYSTACK_NO_TELEMETRY) return;
    if (vscode && vscode.env && vscode.env.isTelemetryEnabled === false) return;
    const body = JSON.stringify({ t: 'paywall', slug: slug, src: 'vsix_open', why: why });
    const req = https.request({ hostname: 'getreadystack.com', path: '/api/ev', method: 'POST', timeout: 4000,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'user-agent': 'readystack-vsix/' + slug } }, function (res) { res.resume(); });
    req.on('timeout', function () { req.destroy(); }); req.on('error', function () {});
    req.write(body); req.end();
  } catch (e) { }
}
async function _try(vscode, url) { try { return (await vscode.env.openExternal(vscode.Uri.parse(url))) !== false; } catch (e) { return null; } }
// open(vscode, url, slug) → true when the browser was opened. Call it INSTEAD of vscode.env.openExternal on a buy press.
async function open(vscode, url, slug) {
  const l = lang(vscode);
  try { if (vscode.window.setStatusBarMessage) vscode.window.setStatusBarMessage('$(lock) ' + NOTE[l], 15000); } catch (e) { }
  try { vscode.window.showInformationMessage(NOTE[l]); } catch (e) { }   // not awaited: the line sits beside VS Code's own "open external website?" dialog
  let ok = await _try(vscode, url);
  ping(vscode, slug, ok === true ? 'opened' : ok === null ? 'error' : 'declined');
  if (ok === true) return true;
  try {
    const m = MISS[l];
    const pick = await vscode.window.showInformationMessage(m[0], m[1], m[2]);
    if (pick === m[1]) { await vscode.env.clipboard.writeText(url); ping(vscode, slug, 'copied'); vscode.window.showInformationMessage(COPIED[l]); return false; }
    if (pick === m[2]) { ok = await _try(vscode, url); ping(vscode, slug, ok === true ? 'reopened' : 'redeclined'); return ok === true; }
  } catch (e) { }
  return false;
}
module.exports = { open: open, note: note, sent: function () { return _sent.slice(); } };
