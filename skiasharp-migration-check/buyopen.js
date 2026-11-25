// buyopen.js — s195 K2 · s227 MM · s232 VSB: the money press says WHAT and HOW MUCH, then opens the checkout honestly.
//   Call open(vscode, url, slug[, info]) INSTEAD of vscode.env.openExternal on every buy press (licence · personal · team · pack).
//   s232 VSB 2026-11-22 — owner 11/22: "vs코드 안내도 고쳐야 할것 같고..." · [실측 s230] 14 days 7 presses → 0 paid; people cancelled
//   VS Code's own "open external website?" dialog within 2-3 s (it shows a bare link: no product, no price). ⇒ ONE modal first, in the
//   VS Code display language (en de ja es pt):
//     title   = the product name (buyinfo.json `product` · else package.json displayName)
//     detail  = what the paid key unlocks — the paywall's own line (info.what from the caller, else buyinfo.json `what`; dropped when it
//               carries refund/trial words or a price that is not the checkout price) ·
//               the price exactly as the checkout has it (buyinfo.json door = the Whop plan this URL redirects to, read by
//               buyopen_stamp.py at stamp/push time; no record → no price line, never a guess) ·
//               the s227 NOTE (opens the hub, forwards to the secure Whop checkout, VS Code asks once — choose Open).
//     buttons = [Continue to checkout] [Copy checkout link] (+ VS Code's own Cancel).
//   Cancel → nothing opens · ping why=modal_cancel.  Copy → clipboard · ping why=modal_copy.  Continue → openExternal →
//   ping opened | declined | error; declined/error keep the s195 MISS offer (Copy checkout link / Open again → copied | reopened | redeclined).
//   Anonymous pings (src=vsix_open · slug only · no key, path, name) honour vscode.env.isTelemetryEnabled and READYSTACK_NO_TELEMETRY.
//   No urgency, no countdown, no refund or trial words. Never throws: a host without modal support goes straight to openExternal.
'use strict';
const https = require('https');
// s227 MM — the NOTE names the HOST VS Code will ask about (read from the URL), that it forwards to Whop, that the price is shown there
//   before paying, and which button to press. s232: shown inside the modal (the product name is the modal title, so '{p}: ' is dropped there).
const NOTE = {
  en: '{p}: opens {h} in your browser, which forwards to the secure Whop checkout. The price is shown there before you pay. VS Code will ask once whether to open {h} — choose Open.',
  de: '{p}: öffnet {h} in Ihrem Browser und leitet zum sicheren Whop-Checkout weiter. Der Preis steht dort, bevor Sie bezahlen. VS Code fragt einmal, ob {h} geöffnet werden darf — wählen Sie „Öffnen“.',
  ja: '{p}：ブラウザで {h} を開き、安全な Whop の決済ページへ移動します。お支払いの前に、そのページに価格が表示されます。VS Code が {h} を開くか一度だけ確認します —「開く」を選んでください。',
  es: '{p}: abre {h} en tu navegador y te lleva al pago seguro de Whop. El precio aparece ahí antes de pagar. VS Code te preguntará una vez si abrir {h}: elige «Abrir».',
  pt: '{p}: abre {h} no seu navegador e leva ao checkout seguro da Whop. O preço aparece lá antes de pagar. O VS Code vai perguntar uma vez se pode abrir {h} — escolha «Abrir».' };
// s232 — the modal's own words (buttons · price line). The amount comes from buyinfo.json only.
const CONT = { en: 'Continue to checkout', de: 'Weiter zum Checkout', ja: '決済へ進む', es: 'Continuar al pago', pt: 'Continuar para o checkout' };
const PRICE_T = {
  en: ['Price: {a} one-time payment', 'Price: {a} per month', 'Price: {a} per year'],
  de: ['Preis: {a} einmalig', 'Preis: {a} pro Monat', 'Preis: {a} pro Jahr'],
  ja: ['価格: {a}（買い切り）', '価格: {a}／月', '価格: {a}／年'],
  es: ['Precio: {a}, pago único', 'Precio: {a} al mes', 'Precio: {a} al año'],
  pt: ['Preço: {a}, pagamento único', 'Preço: {a} por mês', 'Preço: {a} por ano'] };
const MISS = {
  en: ['The checkout did not open. You can copy the link or try once more.', 'Copy checkout link', 'Open again'],
  de: ['Der Checkout wurde nicht geöffnet. Sie können den Link kopieren oder es erneut versuchen.', 'Checkout-Link kopieren', 'Erneut öffnen'],
  ja: ['決済ページが開きませんでした。リンクをコピーするか、もう一度お試しください。', '決済リンクをコピー', 'もう一度開く'],
  es: ['El pago no se abrió. Puedes copiar el enlace o intentarlo otra vez.', 'Copiar enlace de pago', 'Abrir de nuevo'],
  pt: ['O checkout não abriu. Você pode copiar o link ou tentar de novo.', 'Copiar link do checkout', 'Abrir de novo'] };
const COPIED = { en: 'Checkout link copied — paste it into your browser.', de: 'Checkout-Link kopiert — fügen Sie ihn in Ihren Browser ein.',
  ja: '決済リンクをコピーしました — ブラウザに貼り付けてください。', es: 'Enlace copiado — pégalo en tu navegador.', pt: 'Link copiado — cole no seu navegador.' };
// a paywall line that promises a refund or a trial never goes into the modal (rule 3: no refund promise · no trial words)
const BAD = /refund|money[- ]?back|trial|free until|erstatt|testphase|kostenlos bis|返金|試用|無料期間|reembols|devoluci|prueba gratuita|gratis hasta|teste grátis|período de teste|grátis até/i;
const _sent = [];
function lang(vscode) { const l = String((vscode && vscode.env && vscode.env.language) || 'en').slice(0, 2).toLowerCase(); return NOTE[l] ? l : 'en'; }
function _host(url) { try { return new URL(String(url)).hostname || 'getreadystack.com'; } catch (e) { return 'getreadystack.com'; } }
let _bi;
function _buyinfo() {   // the extension's own buyinfo.json (written by buyopen_stamp.py: url → checkout plan, amount, currency, type, what)
  if (_bi !== undefined) return _bi;
  _bi = null;
  try { _bi = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, 'buyinfo.json'), 'utf8')); } catch (e) { _bi = null; }
  return _bi;
}
function door(url) { const j = _buyinfo(); const d = j && j.doors && j.doors[String(url)]; return d && typeof d === 'object' ? d : null; }
function _product(vscode, slug) {
  const j = _buyinfo(); if (j && j.product) return String(j.product);
  try {
    const all = (vscode && vscode.extensions && vscode.extensions.all) || [];
    for (const x of all) { const pj = x && x.packageJSON; if (pj && pj.name === slug && pj.displayName) return String(pj.displayName); }
  } catch (e) { }
  return String(slug || 'ReadyStack').replace(/[-_]+/g, ' ');
}
function _fill(t, vscode, url, slug) { return t.split('{h}').join(_host(url)).split('{p}').join(_product(vscode, slug)); }
function note(vscode, url, slug) { return _fill(NOTE[lang(vscode)], vscode, url || 'https://getreadystack.com/', slug); }
function _amount(d, l) {
  const n = Number(d && d.amount); if (!(n > 0)) return '';
  const c = String((d && d.currency) || 'usd').toLowerCase(), num = n === Math.round(n) ? String(n) : n.toFixed(2);
  if (c === 'usd') return (l === 'pt' ? 'US$ ' : '$') + num;   // the same symbol the paywall uses ($29 · US$ 149)
  if (c === 'eur') return (l === 'en' || l === 'ja' ? '€' + num : num.replace('.', ',') + ' €');
  return num + ' ' + c.toUpperCase();
}
// price line = the checkout plan in buyinfo.json · one_time | 30/31-day | 365-day plans only · anything else → '' (never a guess)
function priceLine(d, l) {
  const a = _amount(d, l); if (!a) return '';
  const p = Number(d.period_days || 0), k = d.type === 'one_time' ? 0 : (p === 30 || p === 31) ? 1 : (p === 365 || p === 366) ? 2 : -1;
  return k < 0 ? '' : (PRICE_T[l] || PRICE_T.en)[k].replace('{a}', a);
}
function _amounts(w) { return (String(w).match(/(?:US)?\$\s?\d[\d,]*(?:\.\d+)?|\d[\d.,]*\s?€/g) || []).map(function (x) { return Number(x.replace(/[^\d.]/g, '')); }); }
// what = the paywall's own line (never invented) · dropped when it promises a refund/trial or names a price that is not the checkout price
function whatLine(d, info, l) {
  let w = (info && info.what) || (d && ((d.what_t && (d.what_t[l] || d.what_t.en)) || d.what)) || '';
  w = String(w).replace(/\s+/g, ' ').trim();
  if (!w || BAD.test(w)) return '';
  const am = _amounts(w);
  if (am.length && !(d && Number(d.amount) > 0 && am.every(function (a) { return Math.abs(a - Number(d.amount)) < 0.005; }))) return '';
  return w.length > 400 ? w.slice(0, 397) + '…' : w;
}
// the modal text (exported for the controls and the checker): { title, detail, price, what, buttons }
function modal(vscode, url, slug, info) {
  const l = lang(vscode), d = door(url), what = whatLine(d, info, l), price = priceLine(d, l);
  let nt = _fill(NOTE[l].replace(/^\{p\}[:：]\s*/, ''), vscode, url || 'https://getreadystack.com/', slug);
  nt = nt.charAt(0).toUpperCase() + nt.slice(1);   // the note starts the paragraph ("Opens getreadystack.com …")
  return { title: _product(vscode, slug), what: what, price: price, detail: [what, price, nt].filter(Boolean).join('\n\n'), buttons: [CONT[l], MISS[l][1]] };
}
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
async function _copy(vscode, url, slug, l, why) {
  try { await vscode.env.clipboard.writeText(url); } catch (e) { }
  ping(vscode, slug, why);
  try { vscode.window.showInformationMessage(COPIED[l]); } catch (e) { }
}
// open(vscode, url, slug[, info]) → true when the browser was opened. info = { what: '<the paywall line the buyer just read>' } (optional).
async function open(vscode, url, slug, info) {
  const l = lang(vscode), M = MISS[l];
  const m = modal(vscode, url, slug, info);
  let pick;
  try { pick = await vscode.window.showInformationMessage(m.title, { modal: true, detail: m.detail }, m.buttons[0], m.buttons[1]); }
  catch (e) { pick = m.buttons[0]; }   // a host without modal support: the old path (straight to the browser)
  if (pick === m.buttons[1]) { await _copy(vscode, url, slug, l, 'modal_copy'); return false; }
  if (pick !== m.buttons[0]) { ping(vscode, slug, 'modal_cancel'); return false; }   // Cancel / Escape: nothing opens
  try { if (vscode.window.setStatusBarMessage) vscode.window.setStatusBarMessage('$(lock) ' + note(vscode, url, slug), 15000); } catch (e) { }
  let ok = await _try(vscode, url);
  ping(vscode, slug, ok === true ? 'opened' : ok === null ? 'error' : 'declined');
  if (ok === true) return true;
  try {
    const p2 = await vscode.window.showInformationMessage(M[0], M[1], M[2]);
    if (p2 === M[1]) { await _copy(vscode, url, slug, l, 'copied'); return false; }
    if (p2 === M[2]) { ok = await _try(vscode, url); ping(vscode, slug, ok === true ? 'reopened' : 'redeclined'); return ok === true; }
  } catch (e) { }
  return false;
}
module.exports = { open: open, note: note, modal: modal, door: door, priceLine: priceLine, whatLine: whatLine, sent: function () { return _sent.slice(); } };
