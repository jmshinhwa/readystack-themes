// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "検査する対象を選んでください", "done": "指摘が見つかりました。結果パネルを確認してください", "nothing_found": "この範囲に指摘はありません", "paste": "請求・仕入の計算コードをここに貼り付け", "check": "24規則で検査する", "need_key": "製品版では、リポジトリ全体の走査・証跡ファイルの書き出し・保存時の自動再チェック・CI 用の機械可読出力ができます", "buy": "製品版を入手 — $29", "key_ok": "ライセンスキーを確認しました", "key_bad": "このキーは確認できませんでした", "extra_rules": "社内ルールの追加（既定の24規則と一緒に検査します）", "enter_key": "Enter licence key"};
const PAID = ["workspace_scan", "export_report", "watch_on_save", "ci_json"];
const NEED_KEY = S.need_key;   // ⛔원문 — 체험이 끝난 뒤 앞에 손님의 숫자를 붙여 쓴다
const TRIAL_NOTE = ' The full sweep is free for 7 days from your first sweep.';

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('JCT 経過措置リンター 2026');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('jct-transition-lint-2026').get('min_severity')
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
const RULES = [{"pattern": "(?:経過措置|keika|transitional|免税事業者|menzei|shiire|仕入).*0?\\.8\\b", "flags": "i", "message": "経過措置80%は2026年9月30日で終了。2026年10月1日以降は70%（令和8年度税制改正）", "sev": "error", "fix": "0.8 → 2026-10-01 以降は 0.7。日付で切り替える"}, {"pattern": "0?\\.8\\b.*(?:経過措置|keika|免税事業者|menzei|仕入税額|shiire)", "flags": "i", "message": "80%控除の定数が残っている。2026年10月1日から70%", "sev": "error", "fix": "施行日で分岐する（〜2026-09-30: 0.8 / 2026-10-01〜: 0.7）"}, {"pattern": "(?:経過措置|keika|免税事業者|menzei|transitional|shiire|仕入).*0?\\.5\\b", "flags": "i", "message": "50%は改正前の予定値。令和8年度税制改正で2026年10月からは70%", "sev": "error", "fix": "0.5 → 0.7（50%になるのは2028年10月以降）"}, {"pattern": "0?\\.5\\b.*(?:経過措置|keika|免税事業者|menzei|仕入税額|shiire)", "flags": "i", "message": "50%控除は2026年10月時点では誤り。改正後は70%", "sev": "error", "fix": "0.5 → 0.7"}, {"pattern": "(?:deduct|kojo|kojyo|控除)_?(?:rate|ritsu|割合|RATE).*[:=]\\s*0?\\.(?:8|5)\\b", "flags": "i", "message": "控除割合がハードコードされている。2026-10-01 をまたぐと値が変わる", "sev": "error", "fix": "施行日テーブルから引く（0.8→0.7→0.5→0.3→0）"}, {"pattern": "(?:80|８０)\\s*[%％].*(?:控除|deduct|仕入税額)", "flags": "i", "message": "「80%控除」の記述。2026年9月30日で終了する", "sev": "warn", "fix": "70%（2026-10-01〜）に更新"}, {"pattern": "(?:50|５０)\\s*[%％].*(?:控除|deduct|仕入税額)", "flags": "i", "message": "「50%控除」は改正前スケジュール。2026年10月からは70%", "sev": "warn", "fix": "70% に更新"}, {"pattern": "令和11年9月30日|2029[-/]0?9[-/]30|2029年9月30日", "flags": "i", "message": "経過措置の終了日が改正前のまま。適用期限は2031年9月30日まで延長された", "sev": "warn", "fix": "終了日を 2031-09-30 に更新"}, {"pattern": "(?:2割特例|niwari|20\\s*%\\s*特例)", "flags": "i", "message": "2割特例は法人は2026年9月30日で終了。個人事業者は2027年10月から3割特例", "sev": "warn", "fix": "法人向けの分岐を落とし、個人は3割に切り替える"}, {"pattern": "\\.map\\(.*(?:Math\\.)?(?:round|floor|ceil)\\(.*(?:0?\\.1\\b|0?\\.08\\b|tax|zei|消費税)", "flags": "i", "message": "明細ごとの端数処理。適格請求書では税率ごとに1回しか認められない", "sev": "error", "fix": "明細は端数処理せず合計し、税率ごとの合計額に1回だけ丸める"}, {"pattern": "(?:for|forEach|foreach|each).*(?:round|floor|ceil)\\(.*\\*\\s*0?\\.(?:1|08)\\b", "flags": "i", "message": "ループ内で1行ずつ税額を丸めている（明細ごとの端数処理）", "sev": "error", "fix": "ループの外で税率ごとに1回だけ端数処理する"}, {"pattern": "(?:item|line|meisai|明細|detail).*(?:Math\\.)?(?:round|floor|ceil)\\(.*0?\\.(?:1|08)\\b", "flags": "i", "message": "明細行の税額を丸めている。税率ごとに1回のルールに反する", "sev": "error", "fix": "税率ごとの合計に対して1回だけ丸める"}, {"pattern": "(?:tax|zei|消費税|shohizei).*toFixed\\(\\s*0\\s*\\)", "flags": "i", "message": "toFixed(0) による行単位の丸め。切捨/切上/四捨五入は自由だが回数は税率ごとに1回", "sev": "error", "fix": "税率ごとの合計に対して1回だけ適用する"}, {"pattern": "\\*\\s*1\\.05\\b", "flags": "i", "message": "旧税率5%（2014年3月31日まで）が残っている", "sev": "error", "fix": "標準10% / 軽減8%"}, {"pattern": "(?:tax|zei|税率|rate).*0?\\.05\\b", "flags": "i", "message": "税率5%の定数。現行は標準10%・軽減8%", "sev": "error", "fix": "0.1 または 0.08"}, {"pattern": "\\*\\s*1\\.08\\b", "flags": "i", "message": "1.08 が軽減税率8%か旧標準税率8%（2019年9月30日まで）か区別されていない", "sev": "warn", "fix": "軽減税率であることを名前と区分記載で明示する"}, {"pattern": "(?:軽減税率|軽減|keigen|reduced).*(?:\\*\\s*1\\.1\\b|0?\\.1\\b)", "flags": "i", "message": "軽減税率の対象に10%が当たっている", "sev": "error", "fix": "軽減税率は8%（0.08 / 1.08）"}, {"pattern": "0\\.0624|0\\.078\\b|0\\.0176|0\\.022\\b", "flags": "i", "message": "国税分・地方消費税分の内訳税率を直接計算に使用している", "sev": "warn", "fix": "請求書の税額は税率（10% / 8%）で計算する"}, {"pattern": "T(?:\\\\d|\\[0-9\\])\\{12\\}", "flags": "i", "message": "登録番号の正規表現が12桁。T のあとは13桁（法人番号）", "sev": "error", "fix": "T[0-9]{13} に修正"}, {"pattern": "\\bT\\d{12}(?!\\d)", "flags": "", "message": "登録番号のサンプルが T+12桁。正しくは T+13桁", "sev": "error", "fix": "桁数を13に"}, {"pattern": "(?:登録番号|touroku|toroku|registration_?(?:no|number)).*(?<!T)(?:\\\\d|\\[0-9\\])\\{13\\}", "flags": "i", "message": "13桁のみの検証。先頭の \"T\" と法人番号のチェックディジットも確認が必要", "sev": "warn", "fix": "^T[0-9]{13}$ にし、チェックディジットも検証する"}, {"pattern": "(?:unlink|fs\\.rm|os\\.remove|rmdir|shutil\\.rmtree|DELETE\\s+FROM).*(?:invoice|請求|領収|receipt|denshi|電子取引)", "flags": "i", "message": "電子取引データの削除。電帳法は訂正・削除の履歴の保存を求める", "sev": "error", "fix": "物理削除せず、訂正削除履歴を残す（論理削除）"}, {"pattern": "(?:小計|subtotal|税込|zeikomi).*\\*\\s*(?:1\\.1\\b|0?\\.1\\b)", "flags": "i", "message": "税込金額にさらに税率を掛けている疑い（内税・外税の二重課税）", "sev": "error", "fix": "税抜の合計に対して計算する"}, {"pattern": "Math\\.round\\(.*\\*\\s*1\\.1\\b", "flags": "i", "message": "税込価格を行単位で丸めている。端数処理は税率ごとの合計に1回", "sev": "warn", "fix": "税抜合計 → 税率ごとの税額 → 1回だけ丸める"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('jct-transition-lint-2026');
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

// ★무료 — ★고른 줄만 본다 (⛔파일 전체가 아니다. 명세가 그렇게 약속하면 ★이것을 찍는다)
async function runSelection() {
  const ed = vscode.window.activeTextEditor;
  if (!ed || ed.selection.isEmpty) { vscode.window.showInformationMessage(S.nothing_found); return null; }
  const text = ed.document.getText(ed.selection);
  const base = ed.selection.start.line;
  const hits = scan(text, ed.document.fileName).map(function (h) {
    return { line: h.line + base, msg: h.msg, fix: h.fix };
  });
  report([{ file: ed.document.fileName, hits: hits }]);
  vscode.window.showInformationMessage(hits.length ? S.done : S.nothing_found);
  return hits;
}

// ★무료 — ★마지막 결과 패널을 다시 연다
async function showReport() { out().show(true); }

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

// ★유료 — ★역방향 체험(paid taste): ★첫 스윕부터 7일간 ★전체 스윕과 보고서를 ★키 없이 그대로 준다. 그 뒤에 키를 묻는다.
//   [내 판단 + 검색 2026-09-12] 무료→유료 평균 2~4% ↔ 역방향 체험 8~12%(개발자 도구 체험 중앙값 24%).
//   손님이 돈 낼지 정하는 순간은 ★자기 폴더에서 결과를 본 뒤다 ⇒ 그 순간에 자기 숫자로 묻는다.
//   ⛔무료 경로(열린 파일·선택 범위 검사)에는 어떤 제한도 두지 않는다 (8% 법).
async function sweepTrial(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + 7 * 24 * 3600 * 1000; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found ' + last.findings + ' findings. ') : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return null;
  }
  return { st: st, inTrial: inTrial, until: until };
}

async function scanWorkspace(ctx) {
  const tr = await sweepTrial(ctx);
  if (!tr) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('jct-transition-lint-2026');
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
  const n = report(rows);
  // ★손님의 숫자를 남긴다 — 체험이 끝난 뒤 키를 물을 때 이 숫자로 묻는다 (endowment)
  await tr.st.update('lastSweep', { files: files.length, findings: n,
                                    at: new Date().toISOString().slice(0, 10) });
  vscode.window.showInformationMessage((n ? S.done : S.nothing_found)
    + '（' + files.length + ' \u30d5\u30a1\u30a4\u30eb / ' + n + ' \u4ef6）'
    + (tr.inTrial ? TRIAL_NOTE : ''));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const tr = await sweepTrial(ctx);
  if (!tr) return;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('jct-transition-lint-2026').get('reportFormat')
    || vscode.workspace.getConfiguration('jct-transition-lint-2026').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'jct-transition-lint-2026-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath
    + (tr.inTrial ? TRIAL_NOTE : ''));
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

async function ciJson(ctx) {
  const tr = await sweepTrial(ctx);
  if (!tr) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'jct-transition-lint-2026-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath
    + (tr.inTrial ? TRIAL_NOTE : ''));
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "jct-transition-lint-2026").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('jct-transition-lint-2026.audit_file', runCurrent);
  reg('jct-transition-lint-2026.audit_selection', runSelection);
  reg('jct-transition-lint-2026.show_report', showReport);
  reg('jct-transition-lint-2026.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('jct-transition-lint-2026.export_report', function () { return exportReport(ctx); });
  reg('jct-transition-lint-2026.watch_on_save', function () { return watchOnSave(ctx); });
  reg('jct-transition-lint-2026.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('jct-transition-lint-2026').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
