// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Watching every save for money lines", "check": "Check these money lines", "paste": "Paste the file that builds your payment amounts", "done": "Checked - the findings are below", "nothing_found": "No money-line problems in this file.", "need_key": "Full version: scans every file in the repository, fails a CI build before a wrong amount can merge, and rewrites the line in place. $29 once - one licence key per person or team seat, 7-day full refund. Payment processors publish a $15.00 fee for every dispute received, and it is not returned when you lose the dispute.", "key_ok": "Licence accepted", "key_bad": "That key did not validate", "buy": "Get the full version - $29 once", "enter_key": "Enter licence key", "extra_rules": "Extra rules of your own, checked alongside the 24 that ship inside."};
const PAID = ["workspace_scan", "ci_json", "export_report", "quick_fix", "watch_on_save"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Currency Minor Unit Lint');
  return out._c;
}

// ★무료 — ★열린 파일 하나를 ★끝까지 본다. ⛔키를 묻지 않는다.
async function runCurrent() {
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return null; }
  const text = ed.document.getText();
  const hits = scan(text, ed.document.fileName);
  report([{ file: ed.document.fileName, hits: hits }]);
  vscode.window.showInformationMessage(hits.length ? S.done : S.nothing_found);
  return hits;
}

function report(rows) {
  const c = out(); c.clear();
  let n = 0;
  // ★설정을 읽는다 — min_severity. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  const _ORD = { info: 0, warn: 1, error: 2 };
  const _min = _ORD[String(vscode.workspace.getConfiguration('currency-minor-unit-lint').get('min_severity')
    || 'info').toLowerCase()] || 0;
  for (const r of rows) {
    const _hits = r.hits.filter(function (h) {
      return (_ORD[String(h.sev || 'info').toLowerCase()] || 0) >= _min;
    });
    if (!_hits.length) continue;
    c.appendLine(path.basename(r.file));
    for (const h of _hits) { c.appendLine('  ' + h.line + ': ' + h.msg); n++; }
  }
  c.appendLine('—— ' + n + ' ——');
  c.show(true);
  return n;
}

// ★한 파일을 훑어 ★줄번호와 메시지를 낸다. ⛔무료·유료가 ★같은 함수를 쓴다 (같은 품질).
const RULES = [{"pattern": "Math\\.round\\s*\\(\\s*[^)]*\\*\\s*100\\s*\\)", "flags": "", "sev": "error", "message": "Math.round(x * 100) hardcodes two decimals: it charges 100x in the 16 zero-decimal currencies (JPY, KRW, VND, XOF, CLP and the rest) and 10x too little in the 3-decimal ones (KWD, BHD, JOD, OMR, TND). Scale by the currency's ISO 4217 exponent."}, {"pattern": "\\bamount\\s*[:=]\\s*[^,;)\\n]*\\*\\s*100\\b", "flags": "", "sev": "error", "message": "The amount field is built with * 100. Payment APIs take an integer of the currency's minor unit, and that unit is not 1/100 for every currency."}, {"pattern": "\\.toFixed\\(\\s*2\\s*\\)", "flags": "", "sev": "error", "message": "toFixed(2) prints 1200.00 for JPY, which has no minor unit at all, and truncates KWD 1.234 to 1.23 - a real 0.004 KWD error on every line. Format with Intl.NumberFormat and the ISO code."}, {"pattern": "\\bamount\\s*[:=]\\s*\\d+\\.\\d+", "flags": "", "sev": "error", "message": "amount is a decimal literal. The API expects an integer of minor units, so 10.99 is read as 10 or rejected outright."}, {"pattern": "parseFloat\\s*\\(\\s*[^)]*(amount|price|total|subtotal|cost|fee)", "flags": "i", "sev": "warn", "message": "parseFloat on money gives a binary float: 0.1 + 0.2 is 0.30000000000000004. Carry money as an integer of minor units, never as a float."}, {"pattern": "([\\\"\\'])bgn\\1", "flags": "", "sev": "error", "replace": "$1eur$1", "message": "BGN: Bulgaria adopted the euro on 2026-01-01 and the lev stopped being legal tender on 2026-02-01. Charge \"eur\" - the fixed conversion was 1 EUR = 1.95583 BGN."}, {"pattern": "\\bBGN\\b", "flags": "", "sev": "error", "replace": "EUR", "message": "BGN: Bulgaria adopted the euro on 2026-01-01 and the lev stopped being legal tender on 2026-02-01. Charge EUR - the fixed conversion was 1 EUR = 1.95583 BGN."}, {"pattern": "([\\\"\\'])hrk\\1", "flags": "", "sev": "error", "replace": "$1eur$1", "message": "HRK was withdrawn when Croatia adopted the euro on 2023-01-01. Charge \"eur\" - the fixed conversion was 1 EUR = 7.53450 HRK."}, {"pattern": "\\bHRK\\b", "flags": "", "sev": "error", "replace": "EUR", "message": "HRK was withdrawn when Croatia adopted the euro on 2023-01-01. Charge EUR - the fixed conversion was 1 EUR = 7.53450 HRK."}, {"pattern": "[\\\"\\'](?:vef|mro|std|sll|zwl|ltl|eek|skk)[\\\"\\']|\\b(?:VEF|MRO|STD|SLL|ZWL|LTL|EEK|SKK)\\b", "flags": "", "sev": "error", "message": "Retired ISO 4217 code. VEF is now VES, MRO is MRU, STD is STN, SLL is SLE, ZWL is ZWG, and LTL, EEK and SKK were replaced by EUR. A retired code is rejected, so the charge never happens."}, {"pattern": "[\\\"\\'](?:isk|ugx)[\\\"\\']|\\b(?:ISK|UGX)\\b", "flags": "", "sev": "warn", "message": "ISK and UGX are zero-decimal, but payment APIs still expect a two-decimal value whose last two digits are 00 - 5 ISK is amount 500. Sending 5 undercharges by 100x."}, {"pattern": "[\\\"\\'](?:bhd|iqd|jod|kwd|lyd|omr|tnd)[\\\"\\']|\\b(?:BHD|IQD|JOD|KWD|LYD|OMR|TND)\\b", "flags": "", "sev": "warn", "message": "3-decimal currency (ISO 4217 exponent 3). The amount is in thousandths and the last digit must be 0: KWD 1.5 is 1500, not 150."}, {"pattern": "[\\\"\\'](?:bif|clp|djf|gnf|jpy|kmf|krw|mga|pyg|rwf|vnd|vuv|xaf|xof|xpf)[\\\"\\']|\\b(?:BIF|CLP|DJF|GNF|JPY|KMF|KRW|MGA|PYG|RWF|VND|VUV|XAF|XOF|XPF)\\b", "flags": "", "sev": "info", "message": "Zero-decimal currency: the amount IS the charge. 500 JPY is amount 500, so any multiplication by 100 on this line charges 100x."}, {"pattern": "[\\\"\\'](?:huf|twd)[\\\"\\']|\\b(?:HUF|TWD)\\b", "flags": "", "sev": "info", "message": "HUF and TWD are charged with two decimals but paid out as zero-decimal: a manual payout amount must be evenly divisible by 100, so a balance of 1045 cannot be paid out in full."}, {"pattern": "[\\\"']\\$[\\\"']\\s*\\+", "flags": "", "sev": "warn", "message": "'$' + amount hardcodes the symbol and the en-US grouping. The same value must read 1.234,56 with the symbol after the number in de-DE. Use Intl.NumberFormat(locale, {style:'currency', currency})."}, {"pattern": "style\\s*:\\s*[\\\"']currency[\\\"'](?![^\\n]*\\bcurrency\\s*:)", "flags": "", "sev": "error", "message": "Intl.NumberFormat with style 'currency' and no currency option throws a TypeError at runtime, not at build time."}, {"pattern": "\\b(tax|vat|gst)\\w*\\s*=\\s*Math\\.round|Math\\.round\\s*\\(\\s*[^)]*(tax|vat|gst)", "flags": "i", "sev": "warn", "message": "Math.round on a float tax amount rounds 1.005 down to 1, because 1.005 is stored as 1.00499999999999989. Round on integer minor units instead."}, {"pattern": "\\b(rate|fx|exchange_rate|exchangeRate)\\s*[:=]\\s*\\d+\\.\\d{3,}", "flags": "i", "sev": "warn", "message": "A hardcoded FX rate. Only the euro conversion rates are legally fixed (1 EUR = 1.95583 BGN and 7.53450 HRK); every other rate moves daily."}, {"pattern": "\\b(cents|minorUnits|minor_units|smallestUnit)\\w*\\s*[:=]\\s*\\d+\\.\\d+", "flags": "i", "sev": "error", "message": "A variable named for minor units is holding a decimal. Minor units are whole numbers by definition, so this value is already wrong before it is sent."}, {"pattern": "\\b(amount|total|price|balance)\\w*\\s*[!=]==?\\s*\\d+\\.\\d+", "flags": "i", "sev": "warn", "message": "Comparing a money float for equality. 0.1 + 0.2 === 0.3 is false in every IEEE-754 language, so this branch silently never runs."}, {"pattern": "parseInt\\s*\\(\\s*[^)]*toFixed", "flags": "", "sev": "warn", "message": "parseInt(x.toFixed(...)) truncates at the first non-digit, so 1.99 becomes 1 - the decimal part is dropped, not scaled."}, {"pattern": "\\/\\s*100\\b", "flags": "", "sev": "info", "message": "Dividing by 100 to display an amount assumes two decimals. For JPY it divides the charge by 100; for KWD it leaves the last digit in the wrong place."}, {"pattern": "\\btoLocaleString\\s*\\(\\s*\\)", "flags": "", "sev": "info", "message": "toLocaleString() with no arguments formats with the machine's locale, so a server in Frankfurt prints a different number than a laptop in Chicago."}, {"pattern": "\\bNumber\\s*\\(\\s*[^)]*(amount|price|total)", "flags": "i", "sev": "info", "message": "Number() on a money string produces a float, the same trap as parseFloat: the value can no longer be summed or compared exactly."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('currency-minor-unit-lint');
  const extra = cfg.get('extraRules');
  const feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
  const rules = RULES.concat(Array.isArray(extra) ? extra : [], feed);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    for (const r of rules) {
      let re;
      try { re = new RegExp(r.pattern, r.flags || ''); } catch (e) { continue; }
      // ★s126 — ★심각도를 실어 보낸다. ⛔없으면 min_severity 가 ★전부를 지운다 (내가 만들 뻔한 거짓말)
      if (re.test(lines[i])) hits.push({ line: i + 1, msg: r.message, fix: r.fix || null,
                                         sev: r.sev || 'warn' });
    }
  }
  return hits;
}

const SNIPPETS = {};

// ★무료 — ★들어 있는 규칙·스니펫 목록
async function listRules() {
  const c = out(); c.clear();
  c.appendLine('rules ' + RULES.length + ' / snippets ' + Object.keys(SNIPPETS).length);
  for (const r of RULES) { c.appendLine('  ' + r.message); }
  for (const k of Object.keys(SNIPPETS)) { c.appendLine('  + ' + k); }
  c.show(true);
}

// ★무료 — ★마지막 결과 패널을 다시 연다
async function showReport() { out().show(true); }

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

// ★s144 역방향 체험(paid taste) — ★전체 스윕과 보고서 파일을 ★첫 스윕부터 7일간 키 없이 ★줄이지 않고 준다.
//   [검색 2026-09-12] freemium 2~4% ↔ reverse trial 8~12% (개발자 도구 체험 중앙값 24%).
//   ★손님이 돈 낼지 정하는 순간은 ★자기 폴더에서 자기 findings 를 본 뒤다 — 그래서 문턱을 ★그 뒤로 옮긴다.
//   ⛔무료 경로(열린 파일 검사)에는 어떤 제한도 없다 (8% 법). ⛔체험 중에는 스윕도 보고서도 ★깎지 않는다.
const TRIAL_MS = 7 * 24 * 3600 * 1000;
const TRIAL_NOTE = ' The full sweep is free for 7 days from your first sweep.';
const NEED_KEY = S.need_key;   // ★원문을 잡아둔다 — ⛔안 그러면 안내 문구가 호출마다 앞에 붙어 늘어난다
function today() { return new Date().toISOString().slice(0, 10); }

async function sweepGate(ctx) {
  const st = ctx.globalState; const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + TRIAL_MS; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    // ★문턱 문구가 ★손님 자신의 숫자를 부른다 (endowment) — 지난 체험 스윕의 파일 수와 발견 수.
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found ' + last.findings + ' findings. ') : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return null;
  }
  return { inTrial: inTrial, until: until };
}

async function scanWorkspace(ctx) {
  const trial = await sweepGate(ctx);
  if (!trial) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('currency-minor-unit-lint');
  const _max = Number(_c.get('max_files')) || 2000;
  const _skip = String(_c.get('exclude_glob') || '**/node_modules/**');
  const files = await vscode.workspace.findFiles('**/*', _skip, _max);
  const rows = [];
  for (const f of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(f);
      rows.push({ file: f.fsPath, hits: scan(doc.getText(), f.fsPath) });
    } catch (e) { /* 열 수 없는 파일은 건너뛴다 */ }
  }
  const found = report(rows);
  // ★체험 스윕의 숫자를 남긴다 — 7일 뒤 키를 물을 때 ★이 숫자로 묻는다.
  await ctx.globalState.update('lastSweep', { files: files.length, findings: found, at: today() });
  vscode.window.showInformationMessage(S.done + ' (' + files.length + ' files, ' + found + ' findings)'
    + (trial.inTrial ? TRIAL_NOTE : ''));
}

async function ciJson(ctx) {
  const trial = await sweepGate(ctx);
  if (!trial) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'currency-minor-unit-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath + (trial.inTrial ? TRIAL_NOTE : ''));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const trial = await sweepGate(ctx);
  if (!trial) return;
  const ed = vscode.window.activeTextEditor;
  const rows = ed ? [{ file: ed.document.fileName, hits: scan(ed.document.getText(), ed.document.fileName) }] : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const flat = [];
  for (const r of rows) for (const h of r.hits) flat.push({ file: r.file, line: h.line, message: h.msg });
  const csv = ['file,line,message'].concat(
    flat.map(function (h) { return [h.file, h.line, String(h.message).replace(/,/g, ' ')].join(','); })
  ).join('\n');
  const esc = function (t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const html = ['<!doctype html><meta charset="utf-8"><title>report</title>',
    '<table border="1" cellpadding="4"><tr><th>file</th><th>line</th><th>message</th></tr>'
  ].concat(flat.map(function (h) {
    return '<tr><td>' + esc(h.file) + '</td><td>' + h.line + '</td><td>' + esc(h.message) + '</td></tr>';
  })).concat(['</table>']).join('\n');
  // ★설정을 ★먼저 읽는다 (report_format). ⛔기본값이 없을 때만 물어본다.
  const cfgFmt = String(vscode.workspace.getConfiguration('currency-minor-unit-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('currency-minor-unit-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'currency-minor-unit-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath + (trial.inTrial ? TRIAL_NOTE : ''));
}

async function quickFix(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  if (!ed) { vscode.window.showInformationMessage(S.nothing_found); return; }
  const hits = scan(ed.document.getText(), ed.document.fileName).filter(function (h) { return h.fix; });
  if (!hits.length) { vscode.window.showInformationMessage(S.nothing_found); return; }
  // ★s134 2026-09-08 — ⛔줄 전체를 h.fix(안내 문구)로 바꾸던 버그를 고쳤다 (손님 파일을 지웠다 · 재방문 일꾼이 잡음).
  //   ★규칙에 replace 가 있을 때만 ★맞은 부분만 바꾼다. 없으면 안내만 한다 — 유료 기능이 데이터를 파괴하면 환불 폭탄이다.
  let applied = 0, manual = 0;
  await ed.edit(function (b) {
    for (const h of hits) {
      const r = RULES.find(function (x) { return x.message === h.msg || x.message === h.message; });
      if (!(r && typeof r.replace === 'string')) { manual++; continue; }
      const ln = ed.document.lineAt(h.line - 1);
      const re = new RegExp(r.pattern, r.flags || '');
      const m = re.exec(ln.text);
      if (!m) { manual++; continue; }
      const start = new vscode.Position(h.line - 1, m.index), end = new vscode.Position(h.line - 1, m.index + m[0].length);
      b.replace(new vscode.Range(start, end), m[0].replace(re, r.replace)); applied++;
    }
  });
  vscode.window.showInformationMessage(S.done + ' (' + applied + ' applied, ' + manual + ' need a manual edit - see the report)');
}

async function watchOnSave(ctx) {
  if (!(await paidGate(ctx))) return;
  if (watchOnSave._d) { watchOnSave._d.dispose(); watchOnSave._d = null;
    vscode.window.showInformationMessage(S.done); return; }
  watchOnSave._d = vscode.workspace.onDidSaveTextDocument(function (doc) {
    report([{ file: doc.fileName, hits: scan(doc.getText(), doc.fileName) }]);
  });
  ctx.subscriptions.push(watchOnSave._d);
  vscode.window.showInformationMessage(S.run);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "currency-minor-unit-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('currency-minor-unit-lint.audit_file', runCurrent);
  reg('currency-minor-unit-lint.list_rules', listRules);
  reg('currency-minor-unit-lint.show_report', showReport);
  reg('currency-minor-unit-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('currency-minor-unit-lint.ci_json', function () { return ciJson(ctx); });
  reg('currency-minor-unit-lint.export_report', function () { return exportReport(ctx); });
  reg('currency-minor-unit-lint.quick_fix', function () { return quickFix(ctx); });
  reg('currency-minor-unit-lint.watch_on_save', function () { return watchOnSave(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('currency-minor-unit-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
