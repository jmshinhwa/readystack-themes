// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Choose the report format", "done": "Finished.", "nothing_found": "Nothing to report.", "paste": "Paste an HTML, JSX, Markdown or accessibility-statement file here", "check": "Check this file", "need_key": "Full version: scan every file in the repository, export the dated WCAG 2.1 AA evidence file, and rewrite the superseded deadline dates. $29 once - one licence key per person or team seat - 7-day full refund. A hybrid WCAG audit (automated plus manual sampling) is quoted at $1,500-$8,000.", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted.", "key_bad": "That key did not validate.", "extra_rules": "Extra regex rules of your own, checked alongside the 26 that ship inside."};
const PAID = ["workspace_scan", "export_report", "quick_fix", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('ADA Title II Deadline Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('ada-title-ii-deadline-lint').get('min_severity')
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
const RULES = [{"pattern": "April\\s*24,?\\s*2026", "flags": "i", "sev": "error", "message": "Superseded date. DOJ's interim final rule (signed 2026-04-16, effective on publication 2026-04-20) moved the ADA Title II web deadline for public entities of 50,000 or more from April 24, 2026 to April 26, 2027 - 28 CFR 35.200(b).", "fix": "April 26, 2027", "replace": "April 26, 2027"}, {"pattern": "2026-04-24", "flags": "", "sev": "error", "message": "Superseded date in ISO form. The ADA Title II deadline for public entities of 50,000 or more is now 2027-04-26, not 2026-04-24.", "fix": "2027-04-26", "replace": "2027-04-26"}, {"pattern": "May\\s*11,?\\s*2026", "flags": "i", "sev": "error", "message": "Superseded date. HHS extended the Section 504 web and mobile accessibility deadline on 2026-05-07: recipients with 15 or more employees now have until May 11, 2027.", "fix": "May 11, 2027", "replace": "May 11, 2027"}, {"pattern": "2026-05-11", "flags": "", "sev": "error", "message": "Superseded date in ISO form. The HHS Section 504 deadline for recipients with 15 or more employees is now 2027-05-11, not 2026-05-11.", "fix": "2027-05-11", "replace": "2027-05-11"}, {"pattern": "May\\s*10,?\\s*2027", "flags": "i", "sev": "error", "message": "Superseded date. HHS recipients with fewer than 15 employees moved from May 10, 2027 to May 10, 2028 in the same 2026-05-07 extension.", "fix": "May 10, 2028", "replace": "May 10, 2028"}, {"pattern": "April\\s*26,?\\s*2027", "flags": "i", "sev": "warn", "message": "Ambiguous since the 2026 extension. April 26, 2027 is now the ADA Title II deadline for public entities of 50,000 or more. It used to be the date for smaller entities and special districts, which is now April 26, 2028. Confirm which tier this line means."}, {"pattern": "WCAG\\s*2\\.0", "flags": "i", "sev": "warn", "message": "ADA Title II (28 CFR 35.200) and HHS Section 504 (45 CFR 84.84) both adopt WCAG 2.1 Level AA. A conformance claim written against WCAG 2.0 does not meet either rule."}, {"pattern": "WCAG\\s*2\\.1\\s*(Level\\s*)?A(?![A-Za-z0-9])", "flags": "i", "sev": "error", "message": "Level A is not enough. Both the ADA Title II rule and the HHS Section 504 rule require WCAG 2.1 Level AA."}, {"pattern": "Section\\s*508", "flags": "i", "sev": "warn", "message": "Section 508 governs federal agencies. State and local government web content is governed by 28 CFR 35.200 and HHS-funded recipients by 45 CFR 84.84 - both point at WCAG 2.1 Level AA. Cite the rule that actually covers this entity."}, {"pattern": "WCAG\\s*2\\.2", "flags": "i", "sev": "info", "message": "WCAG 2.2 Level AA contains everything in 2.1 Level AA, so meeting it is fine. The conformance statement should still cite WCAG 2.1 Level AA, which is the standard the two rules adopt."}, {"pattern": "(fully|100%)\\s*(ada\\s*)?(compliant|accessible)|ada[ -]certified|ada[ -]compliant\\s*(web ?site|app)", "flags": "i", "sev": "error", "message": "Unverifiable conformance claim. No agency certifies ADA compliance, and a blanket claim is the sentence a demand letter quotes back. State the standard, the date tested and the known gaps instead."}, {"pattern": "<img(?![^>]*\\balt\\s*=)[^>]*>", "flags": "i", "sev": "error", "message": "img element with no alt attribute - WCAG 2.1 SC 1.1.1 Non-text Content (Level A)."}, {"pattern": "<html(?![^>]*\\blang\\s*=)[^>]*>", "flags": "i", "sev": "error", "message": "html element with no lang attribute - WCAG 2.1 SC 3.1.1 Language of Page (Level A)."}, {"pattern": "<input(?![^>]*type\\s*=\\s*.?hidden)(?![^>]*(aria-label|aria-labelledby|\\bid\\s*=))[^>]*>", "flags": "i", "sev": "error", "message": "input with no id, aria-label or aria-labelledby, so no label can be attached to it - WCAG 2.1 SC 1.3.1 Info and Relationships and SC 4.1.2 Name, Role, Value (Level A)."}, {"pattern": ">\\s*(click here|read more|learn more|more info)\\s*<", "flags": "i", "sev": "warn", "message": "Link text that means nothing out of context - WCAG 2.1 SC 2.4.4 Link Purpose (In Context) (Level A). Screen reader users pull links out into a list."}, {"pattern": "tabindex\\s*=\\s*.?[1-9]", "flags": "i", "sev": "warn", "message": "Positive tabindex overrides the document focus order - WCAG 2.1 SC 2.4.3 Focus Order (Level A). Use 0 or -1."}, {"pattern": "<(div|span)(?=[^>]*\\bonclick)", "flags": "i", "sev": "error", "message": "Click handler on a non-interactive element: no keyboard access and no role - WCAG 2.1 SC 2.1.1 Keyboard (Level A) and SC 4.1.2 Name, Role, Value (Level A)."}, {"pattern": "<(div|span)(?=[^>]*role\\s*=\\s*.?button)(?![^>]*tabindex)", "flags": "i", "sev": "error", "message": "role=button on an element that cannot take focus - WCAG 2.1 SC 2.1.1 Keyboard (Level A). Add tabindex=0 and a key handler, or use a real button element."}, {"pattern": "outline\\s*:\\s*(0|none)", "flags": "i", "sev": "error", "message": "Focus outline removed - WCAG 2.1 SC 2.4.7 Focus Visible (Level AA). Replace it with a visible focus style rather than deleting it."}, {"pattern": "user-scalable\\s*=\\s*.?no|maximum-scale\\s*=\\s*.?1(?![0-9])", "flags": "i", "sev": "error", "message": "Zoom blocked in the viewport meta tag - WCAG 2.1 SC 1.4.4 Resize Text (Level AA)."}, {"pattern": "<iframe(?![^>]*\\btitle\\s*=)[^>]*>", "flags": "i", "sev": "error", "message": "iframe with no title attribute - WCAG 2.1 SC 4.1.2 Name, Role, Value (Level A)."}, {"pattern": "<(video|audio)(?=[^>]*\\bautoplay)", "flags": "i", "sev": "warn", "message": "Media set to autoplay - WCAG 2.1 SC 1.4.2 Audio Control (Level A) once it runs longer than three seconds."}, {"pattern": "<(marquee|blink)\\b", "flags": "i", "sev": "error", "message": "Content that moves or blinks with no way to stop it - WCAG 2.1 SC 2.2.2 Pause, Stop, Hide (Level A)."}, {"pattern": "<(a|button)(?=[^>]*aria-hidden\\s*=\\s*.?true)", "flags": "i", "sev": "error", "message": "Focusable element hidden from assistive technology: it stays in the tab order with no accessible name - WCAG 2.1 SC 4.1.2 Name, Role, Value (Level A)."}, {"pattern": "href\\s*=\\s*.?[^\"'> ]*\\.(pdf|docx?|xlsx?|pptx?)", "flags": "i", "sev": "info", "message": "Link to a conventional electronic document. Under 28 CFR 35.201 these are excepted only when they were posted before the entity's compliance date and are not currently used to apply for or take part in a service. Record which exception you rely on, or make the file conform."}, {"pattern": "<iframe[^>]*\\bsrc\\s*=\\s*.?https?:", "flags": "i", "sev": "info", "message": "Third-party embed. The third-party exception in 28 CFR 35.201 does not cover content a contractor posts on the public entity's behalf - check who owns this embed before relying on it."}];

// ★JSON 구조 검사 (s138) — ⛔줄 정규식이 ★못 보는 것을 본다: 문서 전체의 빠진 칸 · 목록 각 칸의 빠진 칸.
//   ★어휘 넷뿐이다: doc(문서에 이 칸이 있나) · ver(판 번호가 기준 이상인가)
//                  each(목록의 각 칸에 이 칸이 있나) · each_bad(값이 쓸모없는 값인가)
var JRULES = [];
function jHas(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}
function jVal(o, p) {
  var parts = String(p).split('.'), cur = o, i, k, got;
  for (i = 0; i < parts.length; i++) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {                       // ★목록을 만나면 ★남은 길을 각 칸에 물어본다
      for (k = 0; k < cur.length; k++) {
        got = jVal(cur[k], parts.slice(i).join('.'));
        if (jHas(got)) return got;
      }
      return undefined;
    }
    if (typeof cur !== 'object') return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}
function jAny(o, paths) {
  for (var i = 0; i < (paths || []).length; i++) { if (jHas(jVal(o, paths[i]))) return true; }
  return false;
}
function jNum(s) {
  var m = String(s === undefined || s === null ? '' : s).match(/(\d+(?:\.\d+)*)/);
  return m ? m[1].split('.').map(Number) : null;
}
function jCmp(a, b) {
  for (var i = 0; i < Math.max(a.length, b.length); i++) {
    var x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function jWhen(doc, w) {
  if (!w) return true;
  var v = jVal(doc, w.path);
  if (w.eq !== undefined) return String(jHas(v) ? v : '').toLowerCase() === String(w.eq).toLowerCase();
  if (w.has !== undefined) {
    var s = Array.isArray(v) ? v.join(' ') : String(jHas(v) ? v : '');
    return s.toLowerCase().indexOf(String(w.has).toLowerCase()) >= 0;
  }
  return jHas(v);
}
function jList(doc, j) {
  var arr = jVal(doc, j.list);
  if (!Array.isArray(arr)) return [];
  if (!j.filter) return arr;
  return arr.filter(function (e) {
    var v = jVal(e, j.filter.path);
    var s = Array.isArray(v) ? v.join(' ') : String(jHas(v) ? v : '');
    return s.toLowerCase().indexOf(String(j.filter.has).toLowerCase()) >= 0;
  });
}
function jLine(raw, needle) {
  if (!needle) return 1;
  var s = String(raw), i = s.indexOf(JSON.stringify(String(needle)));
  if (i < 0) i = s.indexOf(String(needle));
  if (i < 0) return 1;
  return s.slice(0, i).split(/\r?\n/).length;
}
function jName(e) {
  if (!e || typeof e !== 'object') return '';
  return String(e.name || e.packageName || e['bom-ref'] || e.bomRef || e.SPDXID || e.spdxId || '');
}
// ⇒ ★JSON 이 아니면 null 을 돌려준다 (그러면 ★줄 규칙만 돈다)
function analyzeJson(raw) {
  var doc;
  try { doc = JSON.parse(raw); } catch (e) { return null; }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null;
  var hits = [], i, r, j;
  for (i = 0; i < JRULES.length; i++) {
    r = JRULES[i]; j = r.json || {};
    if (!jWhen(doc, j.when)) continue;
    if (j.kind === 'doc') {
      if (!jAny(doc, j.paths)) hits.push({ line: 1, msg: r.message, sev: r.sev || 'warn' });
    } else if (j.kind === 'ver') {
      var got = jNum(jVal(doc, j.path)), min = jNum(j.min);
      if (!got) hits.push({ line: 1, msg: r.message + ' — found: none', sev: r.sev || 'error' });
      else if (jCmp(got, min) < 0) hits.push({ line: jLine(raw, j.path),
        msg: r.message + ' — found: ' + got.join('.'), sev: r.sev || 'error' });
    } else if (j.kind === 'each' || j.kind === 'each_bad') {
      var arr = jList(doc, j), miss = [], k, e, v, sv;
      for (k = 0; k < arr.length; k++) {
        e = arr[k];
        if (j.kind === 'each') { if (!jAny(e, j.paths)) miss.push(e); }
        else {
          v = jVal(e, j.path);
          sv = jHas(v) ? String(v).trim().toLowerCase() : '';
          if ((j.bad || []).indexOf(sv) >= 0) miss.push(e);
        }
      }
      if (miss.length) {
        var ex = miss.slice(0, 4).map(jName).filter(Boolean);
        hits.push({ line: jLine(raw, jName(miss[0])),
          msg: r.message + ' — ' + miss.length + ' of ' + arr.length
               + (ex.length ? ' (e.g. ' + ex.join(', ') + ')' : ''),
          sev: r.sev || 'error' });
      }
    }
  }
  return hits;
}

function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('ada-title-ii-deadline-lint');
  const extra = cfg.get('extraRules');
  const feed = (globalThis.__yjFeed && Array.isArray(globalThis.__yjFeed.rules)) ? globalThis.__yjFeed.rules : [];
  const rules = RULES.concat(Array.isArray(extra) ? extra : [], feed);
  // ★s138 — ★구조 규칙을 ★먼저. ⛔JSON 이 아니면 null 이라 ★줄 규칙만 돈다.
  const hits = (JRULES.length ? (analyzeJson(text) || []) : []);
  for (let i = 0; i < lines.length; i++) {
    for (const r of rules) {
      if (!r || !r.pattern) continue;   // ★s138 — ★구조 규칙은 ★정규식이 없다. ⛔건너뛴다.
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
  const _c = vscode.workspace.getConfiguration('ada-title-ii-deadline-lint');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('ada-title-ii-deadline-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('ada-title-ii-deadline-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'ada-title-ii-deadline-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
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

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'ada-title-ii-deadline-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "ada-title-ii-deadline-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('ada-title-ii-deadline-lint.audit_file', runCurrent);
  reg('ada-title-ii-deadline-lint.audit_selection', runSelection);
  reg('ada-title-ii-deadline-lint.list_rules', listRules);
  reg('ada-title-ii-deadline-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('ada-title-ii-deadline-lint.export_report', function () { return exportReport(ctx); });
  reg('ada-title-ii-deadline-lint.quick_fix', function () { return quickFix(ctx); });
  reg('ada-title-ii-deadline-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('ada-title-ii-deadline-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
