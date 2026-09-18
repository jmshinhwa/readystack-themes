// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Re-checking on every save. Run the command again to stop.", "done": "Done.", "nothing_found": "No year-bound constants found here.", "need_key": "This is a licensed feature. The free file checks stay open either way.", "key_ok": "Licence key accepted.", "key_bad": "That licence key did not validate.", "paste": "Paste a file here - payroll, invoicing, tax or config code.", "check": "Check this code", "extra_rules": "Your own extra rules, checked alongside the 26 that ship inside.", "enter_key": "Enter licence key", "buy": "Get a licence"};
const PAID = ["workspace_scan", "watch_on_save", "export_report", "ci_json", "custom_rules"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Tax Year Constant Drift');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('tax-year-constant-drift-lint').get('min_severity')
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
const RULES = [{"pattern":"(?:^|[^A-Za-z0-9])(tax|fiscal|filing|plan|benefit|assessment)[ _-]?year(?![A-Za-z0-9])\\s*[:=]\\s*['\\\"]?(19|20)\\d{2}","flags":"i","sev":"error","message":"Tax/fiscal year pinned to a literal. This is the constant that must roll over on a date, and it is the one an assistant completes with the year it was trained on. Drive it from the transaction date or a configured year."},{"pattern":"\\bFY[ _-]?(19|20)\\d{2}\\b","flags":"i","sev":"warn","message":"Fiscal-year label hardcoded (FYnnnn). Anything keyed to a fiscal year needs a year-keyed lookup; a literal silently reports last year from January onward."},{"pattern":"(?:^|[^A-Za-z0-9])(wage[ _-]?base|contribution[ _-]?limit|deferral[ _-]?limit|elective[ _-]?deferral|standard[ _-]?deduction|personal[ _-]?exemption|annual[ _-]?exclusion|estate[ _-]?exclusion|gift[ _-]?exclusion)(?![A-Za-z0-9])[^\\n]{0,40}[:=]\\s*['\\\"]?[\\d_][\\d_,.]*","flags":"i","sev":"error","message":"Inflation-indexed statutory limit stored as a bare number with no effective year. The IRS and SSA re-publish these every autumn for the following year. Key it by year and record where the figure came from."},{"pattern":"(?:^|[^A-Za-z0-9])(401[ _-]?k|403[ _-]?b|457[ _-]?b|simple[ _-]?ira|sep[ _-]?ira|ira|hsa|fsa|hdhp)(?![A-Za-z0-9])[^\\n]{0,40}(limit|max|cap|contrib\\w*)[^\\n]{0,20}[:=]","flags":"i","sev":"error","message":"Retirement or health-account limit assigned inline. The IRS announces a fresh set of these limits each year in a numbered Notice, so a value that is right today is wrong in January."},{"pattern":"(?:^|[^A-Za-z0-9])1099[ _-]?(k|nec|misc|int|div|r)?(?![A-Za-z0-9])[^\\n]{0,60}\\b\\d{3,6}\\b","flags":"i","sev":"error","message":"A 1099 reporting threshold appears as a literal. Both moved in the same statute: the One Big Beautiful Bill Act (P.L. 119-21, signed 4 July 2025) restored the 1099-K threshold to $20,000 and 200 transactions, and raises the 1099-NEC and 1099-MISC threshold from $600 to $2,000 for payments made after 31 December 2025, indexed thereafter. Pin the figure to a tax year with a citation, never to a bare number."},{"pattern":"(?:^|[^A-Za-z0-9])(fica|oasdi|social[ _-]?security|medicare|futa|suta|sui)(?![A-Za-z0-9])[^\\n]{0,40}[:=]","flags":"i","sev":"warn","message":"Payroll tax constant assigned in code. The federal wage base moves every autumn - the SSA announcement of 24 October 2025 took it from $176,100 for 2025 to $184,500 for 2026 - and state unemployment bases move independently of it, so this needs a year-and-jurisdiction table."},{"pattern":"(?:^|[^A-Za-z0-9])(mileage|per[ _-]?diem|standard[ _-]?rate|reimbursement[ _-]?rate|lodging[ _-]?rate)(?![A-Za-z0-9])[^\\n]{0,30}[:=]","flags":"i","sev":"warn","message":"Mileage or per-diem rate hardcoded. The IRS reissues the mileage rate annually and has changed it mid-year; GSA per-diem rates change with the federal fiscal year on 1 October."},{"pattern":"(?:^|[^A-Za-z0-9])(vat|gst|hst|pst|qst|sales[ _-]?tax|withhold\\w*|surcharge|levy)[ _-]?(rate|pct|percent|percentage)?(?![A-Za-z0-9])\\s*[:=]\\s*['\\\"]?0?[.\\d]","flags":"i","sev":"error","message":"Tax rate constant with no jurisdiction and no effective date beside it. Rates differ by country and by state and change on an announced day, so one global rate is wrong for somebody the day you ship it."},{"pattern":"(?:^|[^A-Za-z0-9])(vat|gst)[ _-]?(registration[ _-]?|reg[ _-]?)?threshold(?![A-Za-z0-9])","flags":"i","sev":"error","message":"VAT or GST registration threshold as a constant. Every country sets its own and revises it, so this needs a country-keyed table with the date each figure took effect."},{"pattern":"(?:^|[^A-Za-z0-9])min(imum)?[ _-]?wage(?![A-Za-z0-9])","flags":"i","sev":"warn","message":"Minimum wage referenced. It differs by country, state and city, and most jurisdictions step it on 1 January or 1 July, so it cannot be a single constant."},{"pattern":"(?:^|[^A-Za-z0-9])(penalty|underpayment|late[ _-]?fee|interest)[ _-]?(rate|pct|percent|apr)(?![A-Za-z0-9])\\s*[:=]","flags":"i","sev":"warn","message":"Penalty or interest rate hardcoded. Federal underpayment interest is reset quarterly and statutory late-fee caps move, so a fixed rate drifts within the same year."},{"pattern":"(?:^|[^A-Za-z0-9])(deadline|due[ _-]?date|filing[ _-]?date|cut[ _-]?off|expires?[ _-]?(on|at))(?![A-Za-z0-9])[^\\n]{0,30}['\\\"](19|20)\\d{2}-\\d{2}-\\d{2}","flags":"i","sev":"error","message":"A deadline written as one absolute date. Statutory filing deadlines shift when they land on a weekend or a public holiday and are re-set every year, so this has to be computed or keyed by year."},{"pattern":"(new\\s+Date|datetime|DateTime|LocalDate|Carbon::create|Date\\.UTC)\\s*\\(\\s*(19|20)\\d{2}\\s*,","flags":"","sev":"warn","message":"A date built from a hardcoded year literal. If this is a boundary such as a year start or a rate-change date, it stops being true next year and no test will fail when it does."},{"pattern":"(form|schedule|publication|notice)[ _-]?(w[ _-]?[24]|1040|1065|1120|94[0-9]|109[0-9]|8949|8300|2555)(?![A-Za-z0-9])","flags":"i","sev":"info","message":"A specific tax form or schedule is named here. Box numbers and layouts change between revisions, so record the revision date you built against next to this reference."},{"pattern":"(?:^|[^A-Za-z0-9])(en[ _-]?16931|peppol|ubl|factur[ _-]?x|zugferd|xrechnung|fatturapa|ksef|cfdi|myinvois|nfe|sdi)(?![A-Za-z0-9])","flags":"i","sev":"warn","message":"An e-invoicing standard is referenced. Mandate dates, schema versions and validation rules move country by country and year by year, so pin the spec version together with the date it took effect."},{"pattern":"\\b(as[ _-]of|current[ _-]as[ _-]of|valid[ _-](until|through|to)|last[ _-]updated)\\b[^\\n]{0,20}\\b20\\d{2}\\b","flags":"i","sev":"info","message":"A comment dates this value, which is the honest half of the job. The missing half is a check that fails once that date has passed instead of a comment nobody re-reads."},{"pattern":"\\b(todo|fixme|hack|xxx|temporar\\w*)\\b[^\\n]{0,70}\\b20\\d{2}\\b","flags":"i","sev":"info","message":"A dated TODO. Dated TODOs about rates and filing years are the ones that ship and are then forgotten until a customer reports the wrong figure."},{"pattern":"(?:^|[^A-Za-z0-9])(eol|end[ _-]of[ _-](life|support)|sunset|retired?|deprecat\\w*)(?![A-Za-z0-9])[^\\n]{0,40}\\b20\\d{2}\\b","flags":"i","sev":"warn","message":"A sunset or end-of-support date sitting in a literal. Nothing in the build fails when that date passes, so move it into a check that does."},{"pattern":"(copyright|\\(c\\)|&copy;|©)[^\\n]{0,25}\\b20\\d{2}\\b","flags":"i","sev":"info","message":"Hardcoded copyright year in output. Cheap to fix, visible to every customer, and the classic field an assistant fills in with the year it was trained on."},{"pattern":"(?:^|[^A-Za-z0-9])(income|gross|revenue|earnings|wages|taxable|turnover|profit)(?![A-Za-z0-9])[^\\n]{0,25}[<>]=?\\s*['\\\"]?\\d{4,}","flags":"i","sev":"error","message":"A bracket or threshold boundary compared against a bare number. Bracket edges are re-indexed annually, so the comparison quietly moves people into the wrong band without any error."},{"pattern":"^(?!.*(?:(?:^|[^0-9])6[0-3](?![0-9])|roth))(?:.*[^A-Za-z0-9])?catch[ _-]?up(?![A-Za-z0-9])[^\\n]{0,40}[:=]\\s*['\"]?[\\d_]","flags":"i","sev":"error","message":"Catch-up contribution stored as one number. Since 1 January 2025 it is not one number: SECURE 2.0 section 109 gives participants who turn 60, 61, 62 or 63 during the year a higher limit - $11,250 against the standard $7,500 for 2025 - and the IRS made it optional per plan in the final catch-up regulations issued 16 September 2025. A single constant with no age band silently under-withholds for that group."},{"pattern":"(?:(?:roth[^\\n]{0,40}catch[ _-]?up)|(?:catch[ _-]?up[^\\n]{0,40}roth)|(?:(?:fica|wage|comp\\w*|salar\\w*|threshold|limit)[^\\n]{0,30}\\b145[,_]?000\\b)|(?:\\b145[,_]?000\\b[^\\n]{0,30}(?:fica|wage|comp\\w*|threshold)))","flags":"i","sev":"error","message":"Roth catch-up wage test in code. SECURE 2.0 section 603 forces catch-up contributions to be Roth for anyone whose prior-year FICA wages from this employer exceed the threshold - $145,000, indexed in $5,000 steps - and the IRS final regulations of 16 September 2025 set compliance from 1 January 2026 with no further delay. The figure is indexed and the plan types it covers are limited to 401(k), 403(b) and governmental 457(b), so it needs a year-keyed lookup, not a literal."},{"pattern":"(?:^|[^A-Za-z0-9])(?:(?:exempt|overtime|white[ _-]?collar|highly[ _-]?compensated|hce)(?![A-Za-z0-9])[^\\n]{0,40}(?:salary|threshold|minimum)[^\\n]{0,20}[:=]|salary[ _-]?(?:threshold|basis|level|test)(?![A-Za-z0-9])[^\\n]{0,20}[:=])","flags":"i","sev":"error","message":"FLSA exempt-salary threshold assigned in code. This one did not just drift, it was reversed: the US District Court for the Eastern District of Texas vacated the Department of Labor's April 2024 overtime rule nationwide on 15 November 2024, so the levels revert to the 2019 regulations and any value written for the announced 1 January 2025 increase is now wrong. It also sits under state floors that are higher, so it needs a jurisdiction table."},{"pattern":"^(?!.*(?:exempt|white[ _-]?collar|highly[ _-]?compensated|hce|salary[ _-]?(?:threshold|basis|level|test))).*\\b(?:35[,_]?568|43[,_]?888|58[,_]?656|107[,_]?432|132[,_]?964|151[,_]?164)\\b","flags":"i","sev":"error","message":"This is a literal from the Department of Labor overtime salary tables. The April 2024 rule that introduced $43,888, $58,656, $132,964 and $151,164 was vacated nationwide on 15 November 2024, leaving the 2019 figures $35,568 and $107,432 in force - so a codebase can hold a number that was correct when it was written and never took legal effect. Confirm which table this came from and key it by effective date."},{"pattern":"^(?!.*1099)(?=.*(?:contractor|vendor|payee|freelanc|non[ _-]?employee|nonemployee|backup[ _-]?withhold|information[ _-]?return))(?=.*[:=]\\s*['\"]?\\$?\\s*(?:600|2[,_]?000)\\b).*","flags":"i","sev":"error","message":"A contractor or vendor reporting floor written as a bare number, with no form named beside it. The One Big Beautiful Bill Act (P.L. 119-21, 4 July 2025) raises the 1099-NEC and 1099-MISC filing threshold from $600 to $2,000 for payments made after 31 December 2025 and indexes it for inflation from 2027, so the $600 that has been correct since 1954 stops being correct. Key it to the tax year of the payment."},{"pattern":"(?:^|[^A-Za-z0-9])(?:qualified[ _-]?tips?|tips?[ _-]?(?:deduction|exclusion)|overtime[ _-]?(?:premium|deduction|exclusion)|no[ _-]?tax[ _-]?on[ _-]?(?:tips?|overtime))(?![A-Za-z0-9])[^\\n]{0,40}[:=]","flags":"i","sev":"warn","message":"A qualified-tips or overtime-premium constant. These deductions were created by the One Big Beautiful Bill Act (P.L. 119-21, 4 July 2025), apply retroactively from 1 January 2025 and expire on 31 December 2028, and are capped at $25,000 of tips and $12,500 of overtime premium ($25,000 joint) with a phase-out starting at $150,000 of MAGI ($300,000 joint). Every figure here has both a start date and a written expiry date, so it belongs in a year-keyed table with the sunset encoded as a check."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('tax-year-constant-drift-lint');
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

// ★무료 — ★들어 있는 규칙·스니펫 목록
async function listRules() {
  const c = out(); c.clear();
  c.appendLine('rules ' + RULES.length + ' / snippets ' + Object.keys(SNIPPETS).length);
  for (const r of RULES) { c.appendLine('  ' + r.message); }
  for (const k of Object.keys(SNIPPETS)) { c.appendLine('  + ' + k); }
  c.show(true);
}

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('tax-year-constant-drift-lint');
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
  report(rows);
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

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  if (!(await paidGate(ctx))) return;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('tax-year-constant-drift-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('tax-year-constant-drift-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'tax-year-constant-drift-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'tax-year-constant-drift-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

async function customRules(ctx) {
  if (!(await paidGate(ctx))) return;
  await vscode.commands.executeCommand('workbench.action.openSettings', 'tax-year-constant-drift-lint');
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "tax-year-constant-drift-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('tax-year-constant-drift-lint.audit_file', runCurrent);
  reg('tax-year-constant-drift-lint.audit_selection', runSelection);
  reg('tax-year-constant-drift-lint.list_rules', listRules);
  reg('tax-year-constant-drift-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('tax-year-constant-drift-lint.watch_on_save', function () { return watchOnSave(ctx); });
  reg('tax-year-constant-drift-lint.export_report', function () { return exportReport(ctx); });
  reg('tax-year-constant-drift-lint.ci_json', function () { return ciJson(ctx); });
  reg('tax-year-constant-drift-lint.custom_rules', function () { return customRules(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('tax-year-constant-drift-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
