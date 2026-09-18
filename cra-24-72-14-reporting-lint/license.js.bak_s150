'use strict';
// Licence gate. Shape copied from lib/content/vsix_build.py _license_js — do not reinvent it.
const https = require('https');
const BUY_URL = 'https://buy.polar.sh/polar_cl_zmN08yKAf6Qz5WMiSQO9V9MxIRQN87VQEfurn03M3KT';
const POLAR_ORG_ID = 'a5cdf664-d8e7-4f87-8895-056717aaba17';
const ORG_ID = POLAR_ORG_ID;
const BENEFIT_ID = '';
const GRACE_MS = 30 * 24 * 3600 * 1000;   // 30 offline days after a successful check
const RECHECK_MS = 7 * 24 * 3600 * 1000;  // ask again weekly so refunds land

function validate(key) {
  return new Promise(function (resolve) {
    const body = JSON.stringify(/^[0-9a-f-]{36}$/.test(BENEFIT_ID)
      ? { key: key, organization_id: ORG_ID, benefit_id: BENEFIT_ID }
      : { key: key, organization_id: ORG_ID });
    const req = https.request({
      hostname: 'api.polar.sh', path: '/v1/customer-portal/license-keys/validate',
      method: 'POST', timeout: 8000,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }
    }, function (res) {
      let buf = '';
      res.on('data', function (d) { buf += d; });
      res.on('end', function () {
        if (res.statusCode !== 200) return resolve({ ok: false, offline: false });
        try {
          const j = JSON.parse(buf);
          resolve({ ok: j && (j.status === 'granted' || j.valid === true || !!j.id), offline: false });
        } catch (e) { resolve({ ok: false, offline: false }); }
      });
    });
    req.on('timeout', function () { req.destroy(); resolve({ ok: false, offline: true }); });
    req.on('error', function () { resolve({ ok: false, offline: true }); });
    req.write(body); req.end();
  });
}

async function ensure(vscode, ctx, S) {
  const st = ctx.globalState;
  const key = st.get('licenseKey');
  const okAt = st.get('licenseOkAt') || 0;
  const age = Date.now() - okAt;
  if (key && age < RECHECK_MS) return true;
  if (key) {
    const r = await validate(key);
    if (r.ok) { await st.update('licenseOkAt', Date.now()); return true; }
    if (r.offline && age < GRACE_MS) return true;
    if (!r.offline) { await st.update('licenseKey', undefined); }
  }
  const pick = await vscode.window.showInformationMessage(
    S.need_key + '  ' + S.terms, S.enter_key, S.buy);
  if (pick === S.buy) { vscode.env.openExternal(vscode.Uri.parse(BUY_URL)); return false; }
  if (pick !== S.enter_key) return false;
  const typed = await vscode.window.showInputBox({
    prompt: S.need_key + '  ' + S.terms, password: false, ignoreFocusOut: true,
    placeHolder: 'Paste the licence key from your receipt'
  });
  if (!typed) return false;
  const r2 = await validate(typed.trim());
  if (r2.ok) {
    await st.update('licenseKey', typed.trim());
    await st.update('licenseOkAt', Date.now());
    vscode.window.showInformationMessage(S.key_ok);
    return true;
  }
  vscode.window.showWarningMessage(S.key_bad);
  return false;
}


// ★s134 — ★구독 피드: 키 있는 손님만 · 7일마다 · 오프라인은 캐시 (규칙 피드 = 층3 "바뀌면 업데이트"의 배송)
const FEED_URL = 'https://getreadystack.com/api/rules/';
function pullFeed(ctx, slug) {
  const st = ctx.globalState;
  const key = st.get('licenseKey');
  const cached = st.get('feedRules') || null;
  if (!key) return Promise.resolve(cached);
  if (cached && (Date.now() - (st.get('feedAt') || 0)) < RECHECK_MS) return Promise.resolve(cached);
  return new Promise(function (resolve) {
    let req;
    try {
      req = https.get(FEED_URL + encodeURIComponent(slug) + '?key=' + encodeURIComponent(key), { timeout: 8000, headers: { 'user-agent': 'readystack-vsix' } }, function (res) {
        let buf = ''; res.on('data', function (d) { buf += d; });
        res.on('end', function () {
          if (res.statusCode !== 200) return resolve(cached);
          try {
            const j = JSON.parse(buf);
            if (!j || !Array.isArray(j.rules)) return resolve(cached);
            Promise.resolve(st.update('feedRules', j)).then(function () { return st.update('feedAt', Date.now()); }).then(function () { resolve(j); }, function () { resolve(j); });
          } catch (e) { resolve(cached); }
        });
      });
    } catch (e) { return resolve(cached); }
    req.on('timeout', function () { req.destroy(); resolve(cached); });
    req.on('error', function () { resolve(cached); });
  });
}

module.exports = { ensure: ensure, validate: validate, BUY_URL: BUY_URL, ORG_ID: ORG_ID, pullFeed: pullFeed };
