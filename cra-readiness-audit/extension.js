// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking the file against the CRA", "done": "Check finished - see the findings", "nothing_found": "No CRA finding in this file", "paste": "Paste a Dockerfile, security.txt, manifest, CI workflow or source file here", "check": "Check this file", "need_key": "Full version: check every file in the repository in one pass, export the findings report for the technical documentation, and fail the CI build on a new violation. $29 once - one licence key per person or team seat - 7-day full refund. Blended EU consulting effort on CRA work is estimated at EUR 45 an hour.", "key_ok": "Licence accepted", "key_bad": "That key did not validate", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "extra_rules": "Extra rules of your own, checked alongside the 28 that ship inside."};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('CRA Readiness Audit');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('cra-readiness-audit').get('min_severity')
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
const RULES = [{"pattern": "NODE_TLS_REJECT_UNAUTHORIZED\\s*[=:]\\s*[\\\"']?0\\b", "flags": "", "sev": "error", "message": "TLS certificate verification is switched off process-wide. Annex I Part I(2) requires the product to be delivered with a secure by default configuration; this line makes every outbound HTTPS call trust any certificate.", "fix": "Remove the variable and pin the CA instead: NODE_EXTRA_CA_CERTS=/path/to/ca.pem"}, {"pattern": "rejectUnauthorized\\s*:\\s*false", "flags": "", "sev": "error", "message": "Node TLS peer verification disabled on this request. Annex I Part I(2)(e) requires the confidentiality and integrity of transmitted data to be protected; an unverified peer defeats both.", "fix": "rejectUnauthorized: true, ca: fs.readFileSync('ca.pem')"}, {"pattern": "verify\\s*=\\s*False\\b", "flags": "", "sev": "error", "message": "Python request sent with certificate verification disabled. Annex I Part I(2)(e): transmitted data must be protected in transit. This is the single most copied insecure default in generated code.", "fix": "verify='/etc/ssl/certs/ca-certificates.crt'"}, {"pattern": "InsecureSkipVerify\\s*:\\s*true", "flags": "", "sev": "error", "message": "Go TLS config skips certificate verification. Annex I Part I(2)(e) requires protected transmission; this accepts any presented certificate, including an interception proxy.", "fix": "InsecureSkipVerify: false, RootCAs: pool"}, {"pattern": "\\bcurl\\b[^\\n]*\\s(?:-k|--insecure)\\b", "flags": "", "sev": "error", "message": "curl invoked with verification disabled. When this runs in a build or an update path it is an unauthenticated code fetch, which Annex I Part I(2)(c) treats as a broken secure update mechanism.", "fix": "curl --proto '=https' --tlsv1.2 -sSf https://..."}, {"pattern": "(?:ssl_verify|sslVerify|CURLOPT_SSL_VERIFYPEER)[\\\"\\']?\\s*[=:]\\s*[\\\"\\']?(?:false|0|off)\\b", "flags": "i", "sev": "error", "message": "Certificate verification disabled in configuration. Annex I Part I(2)(e). A setting shipped in this state is the default the customer receives, which is what the CRA judges.", "fix": "Set the value to true and supply the CA bundle path"}, {"pattern": "(?:password|passwd|pwd)\\s*[=:]\\s*[\\\"'](?:admin|password|changeme|change_me|root|123456|secret|test|letmein)[\\\"']", "flags": "i", "sev": "error", "message": "A well-known default password is hard-coded. Annex I Part I(2)(b) requires products to ship without a default password unless it is unique per device and forced to change on first use.", "fix": "Read the value from the environment and require a change on first login"}, {"pattern": "DEFAULT_(?:PASSWORD|PASSWD|CREDENTIALS|SECRET|API_KEY)\\s*[=:]", "flags": "", "sev": "error", "message": "A default credential is baked into the shipped configuration. Annex I Part I(2)(b) forbids this outright; it is one of the few CRA requirements written as an absolute rather than a risk judgement.", "fix": "Generate a unique secret at first start and store it outside the image"}, {"pattern": "-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----", "flags": "", "sev": "error", "message": "Private key material is committed in the source tree. It reaches every clone and every layer of the built image, and it lands in the SBOM's provenance rather than in a key store.", "fix": "Remove the key, rotate it, and mount it at runtime from a secret store"}, {"pattern": "\\b(?:AKIA|ASIA)[0-9A-Z]{16}\\b", "flags": "", "sev": "error", "message": "An AWS access key id is committed. Once published this is an actively exploitable credential, and exploitation of it becomes a reportable event under Article 14 once you become aware.", "fix": "Rotate the key in IAM and load credentials from the instance role"}, {"pattern": "\\bgh[pousr]_[A-Za-z0-9]{36}\\b", "flags": "", "sev": "error", "message": "A GitHub personal access token is committed. Treat it as burned: rotate first, then remove. A token with write scope turns any leak into a supply-chain incident on your own releases.", "fix": "Revoke the token and use a short-lived OIDC token in the workflow"}, {"pattern": "^\\s*FROM\\s+\\S+:latest\\b", "flags": "i", "sev": "error", "message": "Base image pinned to :latest. The SBOM required by Annex I Part II(1) has to name the components actually included; a floating tag means the bill of materials you generate does not describe the artefact you shipped.", "fix": "FROM node:22.11.0-bookworm-slim@sha256:<digest>"}, {"pattern": "^\\s*FROM\\s+[^:@\\s]+(?:\\s+[Aa][Ss]\\s+\\S+)?\\s*$", "flags": "", "sev": "warn", "message": "Base image has no tag, which Docker resolves as :latest. Same consequence as an explicit floating tag: the SBOM cannot be reproduced from the source.", "fix": "Add an explicit version tag and a digest"}, {"pattern": "[\\\"'][^\\\"']+[\\\"']\\s*:\\s*[\\\"']\\*[\\\"']", "flags": "", "sev": "error", "message": "Dependency accepts any version. Annex I Part II(1) requires an SBOM covering at least the top-level dependencies; a wildcard means the top-level dependency set changes without a commit.", "fix": "Pin the range and commit the lockfile"}, {"pattern": "^\\s*RUN\\s+[^\\n]*\\b(?:apt-get install|apk add|pip3? install|gem install)\\b(?![^\\n]*[=@][0-9])", "flags": "", "sev": "warn", "message": "Package installed without a pinned version. The resulting image is not reproducible, so the SBOM held in the technical documentation drifts from what customers actually run.", "fix": "apt-get install -y --no-install-recommends curl=7.88.1-10+deb12u5"}, {"pattern": "\\b(?:sbom|bill of materials)\\b[^\\n]{0,40}\\b(?:\\.txt|\\.md|\\.pdf|\\.xlsx?|\\.docx?)\\b", "flags": "i", "sev": "warn", "message": "The bill of materials appears to be produced in a human-readable format. Annex I Part II(1) requires it to be machine-readable; in practice that means CycloneDX or SPDX JSON.", "fix": "syft . -o cyclonedx-json=sbom.cdx.json"}, {"pattern": "^\\s*FROM\\s+node:(?:0|4|6|8|10|12|14|16|18)(?:[.\\-]|\\s|$)", "flags": "i", "sev": "error", "message": "Base image is an end-of-life Node release. It no longer receives security fixes, so you cannot meet the duty to supply security updates for the support period, and every new CVE in it is unfixable by you.", "fix": "FROM node:22-bookworm-slim"}, {"pattern": "^\\s*FROM\\s+python:(?:2\\.7|3\\.[0-8])(?:[.\\-]|\\s|$)", "flags": "i", "sev": "error", "message": "Base image is an end-of-life Python release. Article 13(5) requires due diligence on integrated components; shipping one that upstream has stopped patching fails it at the first audit question.", "fix": "FROM python:3.12-slim-bookworm"}, {"pattern": "^\\s*FROM\\s+(?:debian:(?:jessie|stretch|buster)|ubuntu:(?:14|16|18)\\.04|centos:[67])\\b", "flags": "i", "sev": "error", "message": "Base image is an end-of-life distribution. Its package feeds are frozen or gone, so the security updates Annex I Part II(8) obliges you to distribute cannot be built.", "fix": "FROM debian:bookworm-slim"}, {"pattern": "^\\s*Expires\\s*:\\s*(?:19\\d\\d|20[01]\\d|202[0-5])-", "flags": "i", "sev": "error", "message": "The Expires date in security.txt has already passed, which under RFC 9116 makes the whole file invalid. Your coordinated disclosure channel under Annex I Part II(5) is therefore not published at all.", "fix": "Expires: 2027-09-11T00:00:00.000Z"}, {"pattern": "^\\s*(?:Contact|Encryption|Policy)\\s*:\\s*[^\\n]*(?:example\\.(?:com|org|net)|CHANGEME|TODO|your[-_]?(?:email|domain))", "flags": "i", "sev": "error", "message": "The disclosure contact is still a placeholder. Annex I Part II(5) requires a policy with a working point of contact; a researcher who cannot reach you discloses publicly instead, and the 24-hour clock then starts from a tweet.", "fix": "Contact: mailto:security@yourdomain.tld"}, {"pattern": "^\\s*Contact\\s*:\\s*$", "flags": "i", "sev": "error", "message": "Empty Contact field in security.txt. RFC 9116 requires at least one, and Annex I Part II(5) requires the channel to actually exist.", "fix": "Contact: https://yourdomain.tld/security or mailto:security@yourdomain.tld"}, {"pattern": "(?:auto[-_]?updates?|autoUpdate|automatic[-_]?updates?)\\s*[=:]\\s*[\\\"']?(?:false|0|off|no|disabled)\\b", "flags": "i", "sev": "error", "message": "Automatic updates are off in the shipped configuration. Annex I Part I(2)(c) requires security updates to be distributed automatically where appropriate and the default state is what is assessed.", "fix": "Ship with automatic security updates enabled and let the operator opt out"}, {"pattern": "\\b(?:CRA|Cyber Resilience Act)\\b[^\\n]{0,80}\\b(?:applies|apply|applicable|in force|effective|deadline|starts?|from)\\b[^\\n]{0,25}\\b20(?:2[789]|3\\d)\\b", "flags": "i", "sev": "warn", "message": "This line dates the CRA at 2027 or later. That is right for most obligations, which apply from 11 December 2027, but the Article 14 duty to report actively exploited vulnerabilities and severe incidents to ENISA and your CSIRT has applied since 11 September 2026, and it covers products already on the market. State which of the two this line means.", "fix": "Reporting under Article 14: since 11 September 2026. Remaining obligations: 11 December 2027."}, {"pattern": "\\b(?:end[-\\s]?of[-\\s]?support|support(?:ed)?\\s+until|end[-\\s]?of[-\\s]?life|EOL)\\b[^\\n]{0,30}\\b20[23]\\d\\b", "flags": "i", "sev": "warn", "message": "A support end date is declared here. Check it against Article 13(8): the support period must reflect how long users can reasonably expect to use the product and may not fall below five years from placing on the market, and each security update, once issued, must stay available for ten years or the rest of the support period, whichever is longer.", "fix": "State the placing-on-market date next to it so the five-year floor is checkable"}, {"pattern": "(?:console\\.(?:log|info|debug|warn)|System\\.out\\.println|logger?\\.(?:info|debug|warn|error))\\s*\\([^)\\n]*\\b(?:password|passwd|secret|api[-_]?key|token|credential)\\b", "flags": "i", "sev": "error", "message": "A credential is written to the log. Annex I Part I(2)(k) asks for security-relevant activity to be recorded, not for secrets to be; logs are shipped to aggregators, support bundles and crash reports.", "fix": "Log the identifier only, never the secret: logger.info('auth ok for %s', userId)"}, {"pattern": "\\b(?:host|bind|listen|address)\\b[^\\n]{0,12}\\b0\\.0\\.0\\.0\\b", "flags": "i", "sev": "warn", "message": "The service binds to every interface. Annex I Part I(2)(d) requires the attack surface to be minimised, including exposed interfaces; bind to loopback unless external exposure is the documented intent.", "fix": "Bind to 127.0.0.1 and put the published port behind the reverse proxy"}, {"pattern": "^\\s*(?:ENV\\s+|export\\s+|-\\s+)?DEBUG\\s*[=:]\\s*[\\\"']?(?:True|true|1|on|yes)[\\\"']?\\s*$", "flags": "", "sev": "warn", "message": "Debug mode is on in the shipped configuration. Debug endpoints leak stack traces, configuration and sometimes secrets, which is the opposite of the secure by default state Annex I Part I(2) requires.", "fix": "DEBUG=false, and enable it only from a local override file"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('cra-readiness-audit');
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
  const _c = vscode.workspace.getConfiguration('cra-readiness-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('cra-readiness-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('cra-readiness-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'cra-readiness-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'cra-readiness-audit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "cra-readiness-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('cra-readiness-audit.audit_file', runCurrent);
  reg('cra-readiness-audit.audit_selection', runSelection);
  reg('cra-readiness-audit.show_report', showReport);
  reg('cra-readiness-audit.list_rules', listRules);
  reg('cra-readiness-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('cra-readiness-audit.export_report', function () { return exportReport(ctx); });
  reg('cra-readiness-audit.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('cra-readiness-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
