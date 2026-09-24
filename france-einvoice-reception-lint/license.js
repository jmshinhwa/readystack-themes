// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const https = require('https');
const ORG_ID = 'a5cdf664-d8e7-4f87-8895-056717aaba17';
const BUY_URL = 'https://buy.polar.sh/polar_cl_a6x1aVkUPqSGx38DFlJw68NPUQdMdCYBpENCR47YuFw';
const SLUG = 'france-einvoice-reception-lint';   // s151 — 키 판 핑의 익명 이름 (vsix_build._license_js 가 찍는다)
const BENEFIT_ID = '1988f531-03c6-4ba4-95bc-75b3ed932001';   // s140 — 이 상품의 benefit. till.py 가 찍는다 · validate 가 이걸로 묻는다 (⛔조직만 물으면 키 하나로 전부 열린다)
const GRACE_MS = 30 * 24 * 3600 * 1000;   // 검증 성공 뒤 30일은 오프라인에서도 연다
const RECHECK_MS = 7 * 24 * 3600 * 1000;  // 7일마다 다시 묻는다 (환불·해지가 반영되도록)

const ALL_BENEFIT_ID = '22692551-5203-4467-b1a3-e33cdba6589d';   // s149 2026-09-17 — 팀 키(전 린터 한 키 · Polar benefit) · 상품 benefit 다음에 한 번 더 묻는다
const TEAM_URL = 'https://buy.polar.sh/polar_cl_l6iN1uWt0FwWu7tBsczD0jWpP2vxFM54Wdwqb3KPi1G';   // s160 2026-09-24 — 팀 키 결제($149 once · 전 린터 · CI 포함) · 키 판 셋째 버튼 (비면 버튼 없음)
// s160 — 팀 버튼 글은 손님의 VS Code 화면 언어로 (우리 5개국어 · 없으면 영어)
const TEAM_T = { en: 'Team key — $149 once, every linter', de: 'Team-Schlüssel — $149 einmalig, alle Linter', ja: 'チームキー — $149 買い切り・全リンター',
  es: 'Clave de equipo — $149 pago único, todos los linters', pt: 'Chave de equipe — US$ 149 uma vez, todos os linters' };
function teamLabel(vscode) { const l = String((vscode && vscode.env && vscode.env.language) || 'en').slice(0, 2).toLowerCase(); return TEAM_T[l] || TEAM_T.en; }
function validate(key) {
  return validate1(key, BENEFIT_ID).then(function (r) { return (r.ok || r.offline || !/^[0-9a-f-]{36}$/.test(ALL_BENEFIT_ID)) ? r : validate1(key, ALL_BENEFIT_ID); })
    .then(function (r) { return (r.ok || r.offline) ? r : validateHub(key); });   // s153 2026-09-20 — Whop 구독 키: 우리 워커가 Whop 에 묻는다 (키는 워커 비밀)
}
// s153 — Polar 가 모르는 키를 허브 워커(/api/lic)에 한 번 더 묻는다. ★Whop 연간 구독($149.99)의 키가 여기로 열린다. 실패는 그대로 거절.
function validateHub(key) {
  return new Promise(function (resolve) {
    const req = https.request({ hostname: 'getreadystack.com', path: '/api/lic?key=' + encodeURIComponent(key) + '&slug=' + encodeURIComponent(SLUG),
      method: 'GET', timeout: 8000, headers: { 'accept': 'application/json', 'user-agent': 'readystack-vsix/' + SLUG } }, function (res) {
      let buf = '';
      res.on('data', function (d) { buf += d; });
      res.on('end', function () {
        if (res.statusCode !== 200) return resolve({ ok: false, offline: false });
        try { const j = JSON.parse(buf); resolve({ ok: !!(j && j.ok), offline: false }); } catch (e) { resolve({ ok: false, offline: false }); }
      });
    });
    req.on('timeout', function () { req.destroy(); resolve({ ok: false, offline: true }); });
    req.on('error', function () { resolve({ ok: false, offline: true }); });
    req.end();
  });
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

// ★s152 2026-09-20 — 첫 진짜 후기 요청: ★키가 있는 사람이 ★유료 실행을 3번 한 뒤 ★딱 한 번 부탁한다 (인센티브 없음 · 정직 · 가치의 순간). 익명 핑 src=vsix_review (why=review_ask/review_click/review_no).
async function maybeAskReview(vscode, ctx) {
  try {
    const st = ctx.globalState;
    if (!st.get('licenseKey') || st.get('reviewAsked')) return;
    const n = Number(st.get('paidRuns') || 0) + 1; await st.update('paidRuns', n);
    if (n !== 3) return;
    await st.update('reviewAsked', Date.now());
    _pingWhy(vscode, 'vsix_review', 'review_ask');
    const yes = 'Write a review', no = 'No thanks';
    const pick = await vscode.window.showInformationMessage('Three sweeps in. A one-line review on the Marketplace helps a one-person studio more than you would think.', yes, no);
    if (pick === yes) { _pingWhy(vscode, 'vsix_review', 'review_click'); vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=ReadyStack.' + SLUG + '&ssr=false#review-details')); }
    else if (pick === no) { _pingWhy(vscode, 'vsix_review', 'review_no'); }
  } catch (e) { }
}
function _pingWhy(vscode, src, why) {
  try {
    if (process.env.READYSTACK_NO_TELEMETRY) return;
    if (vscode && vscode.env && vscode.env.isTelemetryEnabled === false) return;
    const body = JSON.stringify({ t: 'paywall', slug: SLUG, src: src, why: why });
    const req = https.request({ hostname: 'getreadystack.com', path: '/api/ev', method: 'POST', timeout: 4000,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'user-agent': 'readystack-vsix/' + SLUG } }, function (res) { res.resume(); });
    req.on('timeout', function () { req.destroy(); }); req.on('error', function () {});
    req.write(body); req.end();
  } catch (e) { }
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
  // s160 2026-09-24 — ★팀 키를 키 판에 보인다: 옆의 $149 가 $29 를 작게 만들고(기준점) · 회사 카드를 가진 팀장에게 살 이유를 준다 · 셋을 넘기지 않는다(선택 과부하)
  const TEAM = /^https:\/\//.test(TEAM_URL) ? teamLabel(vscode) : '';
  const pick = await vscode.window.showInformationMessage.apply(vscode.window,
    [S.need_key, S.enter_key || 'Enter licence key', S.buy || 'Get a licence'].concat(TEAM ? [TEAM] : []));
  if (TEAM && pick === TEAM) { _pingWhy(vscode, 'vsix_buy', 'team'); vscode.env.openExternal(vscode.Uri.parse(TEAM_URL)); return false; }
  if (pick === (S.buy || 'Get a licence')) { _pingWhy(vscode, 'vsix_buy', 'one'); vscode.env.openExternal(vscode.Uri.parse(BUY_URL)); return false; }
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

module.exports = { ensure: ensure, validate: validate, maybeAskReview: maybeAskReview, pullFeed: pullFeed };
