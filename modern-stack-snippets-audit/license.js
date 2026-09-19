// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const https = require('https');
const ORG_ID = 'a5cdf664-d8e7-4f87-8895-056717aaba17';
const BUY_URL = 'https://getreadystack.com';
const SLUG = 'modern-stack-snippets-audit';   // s151 — 키 판 핑의 익명 이름 (vsix_build._license_js 가 찍는다)
const BENEFIT_ID = '';   // s140 — 이 상품의 benefit. till.py 가 찍는다 · validate 가 이걸로 묻는다 (⛔조직만 물으면 키 하나로 전부 열린다)
const GRACE_MS = 30 * 24 * 3600 * 1000;   // 검증 성공 뒤 30일은 오프라인에서도 연다
const RECHECK_MS = 7 * 24 * 3600 * 1000;  // 7일마다 다시 묻는다 (환불·해지가 반영되도록)

const ALL_BENEFIT_ID = '22692551-5203-4467-b1a3-e33cdba6589d';   // s149 2026-09-17 — 팀 키(전 린터 한 키 · Polar benefit) · 상품 benefit 다음에 한 번 더 묻는다
function validate(key) {
  return validate1(key, BENEFIT_ID).then(function (r) { return (r.ok || r.offline || !/^[0-9a-f-]{36}$/.test(ALL_BENEFIT_ID)) ? r : validate1(key, ALL_BENEFIT_ID); });
}
function validate1(key, ben) {
  return new Promise(function (resolve) {
    const body = JSON.stringify(/^[0-9a-f-]{36}$/.test(ben) ? { key: key, organization_id: ORG_ID, benefit_id: ben } : { key: key, organization_id: ORG_ID });
    const req = https.request({
      hostname: 'api.polar.sh', path: '/v1/customer-portal/license-keys/validate',
      method: 'POST', timeout: 8000,
      headers: { 'content-type': 'application/json', 'polar-version': '2026-04', 'content-length': Buffer.byteLength(body) }
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

// ★s151 2026-09-19 — ★키 판을 본 순간을 익명으로 센다 (슬러그·출처·이유만 · 키·경로·이름·워크스페이스 없음).
//   VS Code 의 텔레메트리 설정(vscode.env.isTelemetryEnabled) 과 READYSTACK_NO_TELEMETRY 를 따른다 · 실패는 조용히 · 세션당 한 번.
//   왜: [실측 s150] 설치 101 · 주문 0 인데 "돈 내는 순간까지 온 사람"이 몇인지 아무도 몰랐다 ⇒ 문(도달) 문제인지 판(가격·문구) 문제인지 못 갈랐다.
let _pinged = false;
function pingPaywall(vscode, why) {
  try {
    if (_pinged) return; _pinged = true;
    if (process.env.READYSTACK_NO_TELEMETRY) return;
    if (vscode && vscode.env && vscode.env.isTelemetryEnabled === false) return;
    const body = JSON.stringify({ t: 'paywall', slug: SLUG, src: 'vsix', why: why || 'panel' });
    const req = https.request({ hostname: 'getreadystack.com', path: '/api/ev', method: 'POST', timeout: 4000,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'user-agent': 'readystack-vsix/' + SLUG } },
      function (res) { res.resume(); });
    req.on('timeout', function () { req.destroy(); }); req.on('error', function () {});
    req.write(body); req.end();
  } catch (e) { /* 세는 것이 실패해도 상품은 돈다 */ }
}

async function ensure(vscode, ctx, S) {
  const st = ctx.globalState;
  const key = st.get('licenseKey');
  const okAt = st.get('licenseOkAt') || 0;
  const age = Date.now() - okAt;
  if (key && age < RECHECK_MS) return true;              // 최근에 통과했다
  if (key) {
    const r = await validate(key);
    if (r.ok) { await st.update('licenseOkAt', Date.now()); return true; }
    if (r.offline && age < GRACE_MS) return true;        // 네트워크만 죽은 경우
    if (!r.offline) { await st.update('licenseKey', undefined); }
  }
  pingPaywall(vscode, key ? 'invalid' : 'no_key');   // s151 — 키 판이 뜨는 순간
  const pick = await vscode.window.showInformationMessage(
    S.need_key, S.enter_key || 'Enter licence key', S.buy || 'Get a licence');
  if (pick === (S.buy || 'Get a licence')) { vscode.env.openExternal(vscode.Uri.parse(BUY_URL)); return false; }
  if (pick !== (S.enter_key || 'Enter licence key')) return false;
  const typed = await vscode.window.showInputBox({ prompt: S.need_key, password: false, ignoreFocusOut: true });
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

module.exports = { ensure: ensure, validate: validate, pullFeed: pullFeed };
