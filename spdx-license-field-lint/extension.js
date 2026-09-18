// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Reading licence declarations in this file", "done": "Licence lint finished", "nothing_found": "No licence problems in this file: every identifier is a current SPDX id", "need_key": "Full version: runs the same rules over every manifest in the repository, exports the licence inventory as CSV, JSON or HTML for your SBOM, and rewrites a wrong identifier for you. $29 once - one licence key per person or team seat - 7-day full refund. An open-source licence audit runs 40-160 hours and thousands to tens of thousands of dollars per program.", "key_ok": "Licence key accepted - the repository-wide scan and export are open", "key_bad": "That key did not validate. Check it was pasted whole, with no trailing space", "buy": "Get the full version - $29", "extra_rules": "Rules of your own, checked alongside the 73 that ship inside.", "enter_key": "Enter licence key"};
const PAID = ["workspace_scan", "export_report", "quick_fix"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('SPDX License Lint: PEP 639 & Copyleft');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('spdx-license-field-lint').get('min_severity')
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
const RULES = [{"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGPL-1\\.0\\+(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GPL-1.0+\" (SPDX License List 3.0). Write \"GPL-1.0-or-later\".", "sev": "error", "fix": "GPL-1.0-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGPL-1\\.0(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GPL-1.0\" (SPDX License List 3.0). It does NOT mean \"or later\" - pick \"GPL-1.0-only\" or \"GPL-1.0-or-later\".", "sev": "error", "fix": "GPL-1.0-only"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGPL-2\\.0\\+(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GPL-2.0+\" (SPDX License List 3.0). Write \"GPL-2.0-or-later\".", "sev": "error", "fix": "GPL-2.0-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGPL-2\\.0(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GPL-2.0\" (SPDX License List 3.0). It does NOT mean \"or later\" - pick \"GPL-2.0-only\" or \"GPL-2.0-or-later\".", "sev": "error", "fix": "GPL-2.0-only"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGPL-3\\.0\\+(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GPL-3.0+\" (SPDX License List 3.0). Write \"GPL-3.0-or-later\".", "sev": "error", "fix": "GPL-3.0-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGPL-3\\.0(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GPL-3.0\" (SPDX License List 3.0). It does NOT mean \"or later\" - pick \"GPL-3.0-only\" or \"GPL-3.0-or-later\".", "sev": "error", "fix": "GPL-3.0-only"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bLGPL-2\\.0\\+(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"LGPL-2.0+\" (SPDX License List 3.0). Write \"LGPL-2.0-or-later\".", "sev": "error", "fix": "LGPL-2.0-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bLGPL-2\\.0(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"LGPL-2.0\" (SPDX License List 3.0). It does NOT mean \"or later\" - pick \"LGPL-2.0-only\" or \"LGPL-2.0-or-later\".", "sev": "error", "fix": "LGPL-2.0-only"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bLGPL-2\\.1\\+(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"LGPL-2.1+\" (SPDX License List 3.0). Write \"LGPL-2.1-or-later\".", "sev": "error", "fix": "LGPL-2.1-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bLGPL-2\\.1(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"LGPL-2.1\" (SPDX License List 3.0). It does NOT mean \"or later\" - pick \"LGPL-2.1-only\" or \"LGPL-2.1-or-later\".", "sev": "error", "fix": "LGPL-2.1-only"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bLGPL-3\\.0\\+(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"LGPL-3.0+\" (SPDX License List 3.0). Write \"LGPL-3.0-or-later\".", "sev": "error", "fix": "LGPL-3.0-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bLGPL-3\\.0(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"LGPL-3.0\" (SPDX License List 3.0). It does NOT mean \"or later\" - pick \"LGPL-3.0-only\" or \"LGPL-3.0-or-later\".", "sev": "error", "fix": "LGPL-3.0-only"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bAGPL-1\\.0\\+(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"AGPL-1.0+\" (SPDX License List 3.0). Write \"AGPL-1.0-or-later\".", "sev": "error", "fix": "AGPL-1.0-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bAGPL-1\\.0(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"AGPL-1.0\" (SPDX License List 3.0). It does NOT mean \"or later\" - pick \"AGPL-1.0-only\" or \"AGPL-1.0-or-later\".", "sev": "error", "fix": "AGPL-1.0-only"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bAGPL-3\\.0\\+(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"AGPL-3.0+\" (SPDX License List 3.0). Write \"AGPL-3.0-or-later\".", "sev": "error", "fix": "AGPL-3.0-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bAGPL-3\\.0(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"AGPL-3.0\" (SPDX License List 3.0). It does NOT mean \"or later\" - pick \"AGPL-3.0-only\" or \"AGPL-3.0-or-later\".", "sev": "error", "fix": "AGPL-3.0-only"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGFDL-1\\.1\\+(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GFDL-1.1+\" (SPDX License List 3.0). Write \"GFDL-1.1-or-later\".", "sev": "error", "fix": "GFDL-1.1-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGFDL-1\\.1(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GFDL-1.1\" (SPDX License List 3.0). It does NOT mean \"or later\" - pick \"GFDL-1.1-only\" or \"GFDL-1.1-or-later\".", "sev": "error", "fix": "GFDL-1.1-only"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGFDL-1\\.2\\+(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GFDL-1.2+\" (SPDX License List 3.0). Write \"GFDL-1.2-or-later\".", "sev": "error", "fix": "GFDL-1.2-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGFDL-1\\.2(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GFDL-1.2\" (SPDX License List 3.0). It does NOT mean \"or later\" - pick \"GFDL-1.2-only\" or \"GFDL-1.2-or-later\".", "sev": "error", "fix": "GFDL-1.2-only"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGFDL-1\\.3\\+(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GFDL-1.3+\" (SPDX License List 3.0). Write \"GFDL-1.3-or-later\".", "sev": "error", "fix": "GFDL-1.3-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGFDL-1\\.3(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"GFDL-1.3\" (SPDX License List 3.0). It does NOT mean \"or later\" - pick \"GFDL-1.3-only\" or \"GFDL-1.3-or-later\".", "sev": "error", "fix": "GFDL-1.3-only"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGPL-2\\.0-with-classpath-exception(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id. Write \"GPL-2.0-only WITH Classpath-exception-2.0\".", "sev": "error", "fix": "GPL-2.0-only WITH Classpath-exception-2.0"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bBSD-2-Clause-FreeBSD(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"BSD-2-Clause-FreeBSD\". Write \"BSD-2-Clause-Views\".", "sev": "error", "fix": "BSD-2-Clause-Views"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bwxWindows(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"wxWindows\". Write \"wxWindows-exception-3.1\" as an exception, or \"LGPL-2.0-or-later WITH WxWindows-exception-3.1\".", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bNunit(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"Nunit\" (SPDX List 3.0, the licence changed to MIT in NUnit 3).", "sev": "error", "fix": "MIT"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\beCos-2\\.0(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"eCos-2.0\". Write \"GPL-2.0-or-later WITH eCos-exception-2.0\".", "sev": "error", "fix": "GPL-2.0-or-later WITH eCos-exception-2.0"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bStandardML-NJ(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"StandardML-NJ\". Write \"SMLNJ\".", "sev": "error", "fix": "SMLNJ"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bbzip2-1\\.0\\.5(?![-\\w.+])", "flags": "", "message": "Deprecated SPDX id \"bzip2-1.0.5\". Write \"bzip2-1.0.6\".", "sev": "error", "fix": "bzip2-1.0.6"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*Apache[ _]?(?:License[, ]*)?(?:Version[ ]?)?2(?:\\.0)?\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"Apache-2.0\".", "sev": "error", "fix": "Apache-2.0"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*The MIT License(?: \\(MIT\\))?\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"MIT\".", "sev": "error", "fix": "MIT"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*MIT[ _]?License\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"MIT\".", "sev": "error", "fix": "MIT"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*MIT/X11\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"MIT\".", "sev": "error", "fix": "MIT"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*GPLv([123])\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"GPL-$1.0-or-later\".", "sev": "error", "fix": "GPL-$1.0-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*LGPLv([23])\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"LGPL-$1.0-or-later\".", "sev": "error", "fix": "LGPL-$1.0-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*AGPLv3\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"AGPL-3.0-or-later\".", "sev": "error", "fix": "AGPL-3.0-or-later"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*New BSD(?: License)?\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"BSD-3-Clause\".", "sev": "error", "fix": "BSD-3-Clause"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*Simplified BSD(?: License)?\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"BSD-2-Clause\".", "sev": "error", "fix": "BSD-2-Clause"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*BSD-3(?:-clause)?\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"BSD-3-Clause\".", "sev": "error", "fix": "BSD-3-Clause"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*ISC License\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"ISC\".", "sev": "error", "fix": "ISC"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*Mozilla Public License(?: 2\\.0)?\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"MPL-2.0\".", "sev": "error", "fix": "MPL-2.0"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*Eclipse Public License(?: 2\\.0)?\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"EPL-2.0\".", "sev": "error", "fix": "EPL-2.0"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*Public Domain\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"CC0-1.0 or Unlicense\".", "sev": "error", "fix": "CC0-1.0"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*Apache-2\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier - the id is case-sensitive and exact. Write \"Apache-2.0\".", "sev": "error", "fix": "Apache-2.0"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*BSD\\s*[\"\\x27]", "flags": "", "message": "Not a valid SPDX identifier: \"BSD\" is ambiguous (2-, 3- or 4-clause). Write \"BSD-3-Clause\" or \"BSD-2-Clause\".", "sev": "error", "fix": "BSD-3-Clause"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*(?:none|NONE|TODO|TBD|UNKNOWN|N/A|)\\s*[\"\\x27]", "flags": "", "message": "Empty or placeholder licence field. With no licence, the default is exclusive copyright - nobody may legally use it, and every SBOM row for it is blank.", "sev": "error"}, {"pattern": "\"licen[sc]e\"\\s*:\\s*[\"\\x27]Unlicense[\"\\x27]", "flags": "", "message": "CAUTION: \"Unlicense\" is a public-domain dedication - it hands the code to everyone. For proprietary code npm expects \"UNLICENSED\" (all caps, with the D).", "sev": "error", "fix": "UNLICENSED"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])\\s*(?:Proprietary|Commercial|Closed[- ]?Source|All Rights Reserved)\\s*[\"\\x27]", "flags": "i", "message": "Not an SPDX id. npm and yarn expect \"UNLICENSED\" for proprietary code; anything else is treated as an unrecognised licence by SCA scanners.", "sev": "error", "fix": "UNLICENSED"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\s(?:or|and|with)\\s[^\"\\x27]*[\"\\x27]", "flags": "", "message": "SPDX operators are uppercase. Write \"OR\", \"AND\", \"WITH\" - a lowercase operator makes the whole expression invalid.", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[A-Za-z0-9.\\-]+/[A-Za-z0-9.\\-]+[\"\\x27]", "flags": "", "message": "The old npm \"MIT/Apache-2.0\" slash syntax was removed. Write \"MIT OR Apache-2.0\".", "sev": "error"}, {"pattern": "\"licenses\"\\s*:\\s*\\[", "flags": "", "message": "The \"licenses\" array was deprecated by npm long ago and is ignored by most tooling. Use a single \"license\" field holding an SPDX expression.", "sev": "error"}, {"pattern": "\"licen[sc]e\"\\s*:\\s*\\{", "flags": "", "message": "The {\"type\":..,\"url\":..} licence object is the deprecated npm form. Use a string: \"license\": \"MIT\".", "sev": "error"}, {"pattern": "\"licen[sc]e\"\\s*:\\s*[\"\\x27]SEE LICEN[SC]E IN ", "flags": "", "message": "\"SEE LICENSE IN <file>\" is valid npm, but the named file must exist in the published package and no scanner can classify it - expect a manual review row in every SBOM.", "sev": "info"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bLicenseRef-(?![-\\w.+])", "flags": "", "message": "LicenseRef- is a custom, non-listed licence. Valid SPDX, but it carries no known obligations, so procurement and SBOM tools will flag it for human review.", "sev": "info"}, {"pattern": "^\\s*[\"\\x27]?License\\s*::", "flags": "", "message": "PEP 639 deprecated the \"License ::\" trove classifiers. Delete this line and put an SPDX expression in project.license instead.", "sev": "error"}, {"pattern": "^\\s*licen[sc]e\\s*=\\s*\\{\\s*text\\s*=", "flags": "", "message": "PEP 639: license = {text = \"...\"} is deprecated. Write license = \"MIT\" (a bare SPDX expression). setuptools stops supporting the table form after 2026-02-18.", "sev": "error"}, {"pattern": "^\\s*licen[sc]e\\s*=\\s*\\{\\s*file\\s*=", "flags": "", "message": "PEP 639: license = {file = \"...\"} is deprecated. Write license = \"<SPDX>\" and list the file under license-files = [\"LICENSE\"].", "sev": "error"}, {"pattern": "^\\s*licen[sc]e_files?\\s*=", "flags": "", "message": "setup.cfg license_file/license_files is superseded by PEP 639 license-files in pyproject.toml [project].", "sev": "warn"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bAGPL-3\\.0-(?:only|or-later)(?![-\\w.+])", "flags": "", "message": "Network copyleft: AGPL-3.0 section 13 triggers on users interacting over a network, not only on distribution. Running this in your SaaS obliges you to offer your corresponding source.", "sev": "warn"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bGPL-[23]\\.0-(?:only|or-later)(?![-\\w.+])", "flags": "", "message": "Strong copyleft: linking this into a distributed work obliges you to license the combined work under the GPL and ship its source.", "sev": "warn"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bLGPL-[23]\\.[01]-(?:only|or-later)(?![-\\w.+])", "flags": "", "message": "Weak copyleft: you must let users relink against a modified version (shared library or supplied object files), and static linking removes that by default.", "sev": "info"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\b(?:SSPL-1\\.0)(?![-\\w.+])", "flags": "", "message": "NOT OSI-approved (SSPL-1.0). The OSI declined to approve it. Section 13 extends copyleft to your whole service-management stack if you offer the software as a service. Debian and Fedora exclude it. A policy of \"OSI-approved licences only\" rejects this.", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\b(?:BUSL-1\\.1|BSL-1\\.1)(?![-\\w.+])", "flags": "", "message": "NOT OSI-approved (BUSL-1.1). Source-available, not open source: production use is forbidden until the per-release Change Date, then it converts to the Change License. A policy of \"OSI-approved licences only\" rejects this.", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\b(?:Elastic-2\\.0|ELv2)(?![-\\w.+])", "flags": "", "message": "NOT OSI-approved (Elastic-2.0). Source-available, not open source: you may not offer it as a hosted or managed service, nor circumvent its licence-key code. A policy of \"OSI-approved licences only\" rejects this.", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\b(?:Commons-Clause)(?![-\\w.+])", "flags": "", "message": "NOT OSI-approved (Commons-Clause). Commons Clause is a rider bolted onto a permissive licence that removes the right to sell. The result is not open source, whatever the base licence says. A policy of \"OSI-approved licences only\" rejects this.", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\b(?:PolyForm-[A-Za-z-]+)(?![-\\w.+])", "flags": "", "message": "NOT OSI-approved (PolyForm). PolyForm licences are source-available and use-restricted (noncommercial, small business, shield). Not OSI-approved. A policy of \"OSI-approved licences only\" rejects this.", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\b(?:FSL-1\\.[01](?:-(?:MIT|ALv2|Apache-2\\.0))?)(?![-\\w.+])", "flags": "", "message": "NOT OSI-approved (FSL). Functional Source License: competing-use is forbidden for two years, then it converts to MIT or Apache-2.0. Not open source today. A policy of \"OSI-approved licences only\" rejects this.", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\b(?:RSALv2|RSAL)(?![-\\w.+])", "flags": "", "message": "NOT OSI-approved (RSALv2). Redis Source Available License v2: no offering the product as a managed service. Redis 8 added AGPLv3 in May 2025 as a third option - check which licence your pinned version actually shipped under. A policy of \"OSI-approved licences only\" rejects this.", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\b(?:Confluent-Community)(?![-\\w.+])", "flags": "", "message": "NOT OSI-approved (Confluent Community License). Source-available: SaaS offering of the software is excluded. Not OSI-approved. A policy of \"OSI-approved licences only\" rejects this.", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bCC-BY-(?:NC|ND)[A-Z0-9.\\-]*(?![-\\w.+])", "flags": "", "message": "Creative Commons NonCommercial/NoDerivatives: it cannot be used in a product you sell, and CC does not recommend any CC licence for software.", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bCC0-1\\.0(?![-\\w.+])", "flags": "", "message": "CC0-1.0 expressly withholds a patent grant. Fedora stopped allowing it for code in 2022 for that reason; MIT or Apache-2.0 avoids the issue.", "sev": "info"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\bJSON(?![-\\w.+])", "flags": "", "message": "The JSON licence adds \"The Software shall be used for Good, not Evil\", which makes it non-free. Google, Debian and many corporate policies ban it.", "sev": "error"}, {"pattern": "(?:\"licen[sc]e\"\\s*:\\s*[\"\\x27]|\\blicen[sc]e\\s*=\\s*[\"\\x27]|\\.licenses?\\s*=\\s*[\"\\x27]|\\btext\\s*=\\s*[\"\\x27])[^\"\\x27]*\\b(?:WTFPL|Beerware)(?![-\\w.+])", "flags": "", "message": "Joke licence. It has no warranty disclaimer and no patent grant, and most corporate policies reject it on review.", "sev": "warn"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('spdx-license-field-lint');
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
  const _c = vscode.workspace.getConfiguration('spdx-license-field-lint');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('spdx-license-field-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('spdx-license-field-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'spdx-license-field-lint-report.' + pick.toLowerCase());
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

function activate(ctx) {
  try { lic.pullFeed(ctx, "spdx-license-field-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('spdx-license-field-lint.audit_file', runCurrent);
  reg('spdx-license-field-lint.audit_selection', runSelection);
  reg('spdx-license-field-lint.show_report', showReport);
  reg('spdx-license-field-lint.list_rules', listRules);
  reg('spdx-license-field-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('spdx-license-field-lint.export_report', function () { return exportReport(ctx); });
  reg('spdx-license-field-lint.quick_fix', function () { return quickFix(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('spdx-license-field-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
