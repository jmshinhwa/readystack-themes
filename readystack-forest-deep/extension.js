// extension.js - ReadyStack theme: a one-time pack offer (s152 2026-09-19).
// Shows once, and only after this theme is the active colour theme. Anonymous count only (slug + shown/clicked). Honours the VS Code telemetry setting.
const vscode = require('vscode');
const https = require('https');
const SLUG = 'readystack-forest-deep';
const LABEL = 'ReadyStack Forest Deep';
const PACK_URL = 'https://buy.polar.sh/polar_cl_XLCKUkI8aRMShyOFKFccELfmuQBHQ8Dwuy6rH2WiR0e';
const KEY = 'readystack.packOffer.' + SLUG;
function ping(why) {
  try {
    if (process.env.READYSTACK_NO_TELEMETRY) return;
    if (vscode.env && vscode.env.isTelemetryEnabled === false) return;
    const body = JSON.stringify({ t: 'paywall', slug: SLUG, src: 'vsix_theme', why: why });
    const req = https.request({ hostname: 'getreadystack.com', path: '/api/ev', method: 'POST', timeout: 4000,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'user-agent': 'readystack-vsix_theme/' + SLUG } },
      function (res) { res.resume(); });
    req.on('timeout', function () { req.destroy(); }); req.on('error', function () {});
    req.write(body); req.end();
  } catch (e) { /* counting may fail; the theme still works */ }
}
function isOurs() {
  try { return vscode.workspace.getConfiguration('workbench').get('colorTheme') === LABEL; } catch (e) { return false; }
}
async function offer(ctx) {
  try {
    if (ctx.globalState.get(KEY)) return;
    await ctx.globalState.update(KEY, Date.now());
    ping('pack_offer');
    const yes = 'Get the pack', no = 'No thanks';
    const pick = await vscode.window.showInformationMessage(
      'You are using ' + LABEL + '. The same palette for your terminal (iTerm2, Windows Terminal, Alacritty, kitty) and Obsidian is $14.99 once, with a 7-day refund.', yes, no);
    if (pick === yes) { ping('pack_click'); vscode.env.openExternal(vscode.Uri.parse(PACK_URL)); }
    else if (pick === no) { ping('pack_no'); }
  } catch (e) { }
}
function activate(ctx) {
  try {
    if (ctx.globalState.get(KEY)) return;
    if (isOurs()) { offer(ctx); return; }
    const d = vscode.window.onDidChangeActiveColorTheme(function () { if (isOurs()) { offer(ctx); try { d.dispose(); } catch (e) {} } });
    ctx.subscriptions.push(d);
  } catch (e) { }
}
function deactivate() {}
module.exports = { activate: activate, deactivate: deactivate };
