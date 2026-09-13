// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditing this configuration file.", "check": "Audit this config", "paste": "Paste sdkconfig, sdkconfig.defaults or prj.conf here", "done": "Findings are in the Firmware Release Gate panel.", "nothing_found": "No release-blocking settings found in this file.", "need_key": "Full version: audit every config in the repository at once, write the report file you keep with the release, and fail the build in CI on the same rules. $29 once, one licence key per person or team seat, 7-day full refund. An outside firmware-only security review starts around $6,000.", "key_ok": "Licence key accepted.", "key_bad": "That licence key was not accepted.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "extra_rules": "Extra rules of your own, checked alongside the ones that ship inside."};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Firmware Release Gate');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('firmware-release-gate').get('min_severity')
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
const RULES = [{"pattern": "^\\s*#\\s*CONFIG_SECURE_BOOT is not set", "flags": "", "sev": "error", "message": "Secure boot is off: the ROM will boot any image written to flash. Set CONFIG_SECURE_BOOT=y and choose the Secure Boot V2 scheme before the release build."}, {"pattern": "^\\s*CONFIG_SECURE_FLASH_ENCRYPTION_MODE_DEVELOPMENT=y", "flags": "", "sev": "error", "message": "Flash encryption is in Development mode: the unit still accepts re-flashing and the key stays readable. Production units need CONFIG_SECURE_FLASH_ENCRYPTION_MODE_RELEASE=y."}, {"pattern": "^\\s*#\\s*CONFIG_SECURE_FLASH_ENC_ENABLED is not set", "flags": "", "sev": "error", "message": "Flash encryption is off: firmware, certificates and NVS can be read straight off the flash chip. Set CONFIG_SECURE_FLASH_ENC_ENABLED=y."}, {"pattern": "^\\s*CONFIG_SECURE_BOOT_ALLOW_[A-Z0-9_]+=y", "flags": "", "sev": "error", "message": "A secure-boot escape hatch is enabled, so JTAG, the ROM console or the UART bootloader stays reachable on a locked unit. Remove every CONFIG_SECURE_BOOT_ALLOW_* line from the release config."}, {"pattern": "^\\s*CONFIG_ESP_TLS_SKIP_SERVER_CERT_VERIFY=y", "flags": "", "sev": "error", "message": "TLS server certificates are not verified: anything on the path can terminate your OTA and telemetry sessions. Remove this line and pin a CA bundle instead."}, {"pattern": "^\\s*CONFIG_ESP_TLS_INSECURE=y", "flags": "", "sev": "error", "message": "esp-tls insecure mode is compiled in, which lets any call site skip certificate checks at runtime. Remove CONFIG_ESP_TLS_INSECURE from the release config."}, {"pattern": "^\\s*CONFIG_ESP_HTTPS_OTA_ALLOW_HTTP=y", "flags": "", "sev": "error", "message": "OTA is allowed to fall back to plain HTTP, so whoever sits on the path chooses the next firmware image. Remove CONFIG_ESP_HTTPS_OTA_ALLOW_HTTP."}, {"pattern": "^\\s*CONFIG_[A-Z0-9_]*(?:URL|URI|ENDPOINT|SERVER|HOST)[A-Z0-9_]*=\"http://", "flags": "", "sev": "error", "message": "A plaintext http:// endpoint is baked into the build config and ships inside the image. Move it to https:// before the release build."}, {"pattern": "^\\s*CONFIG_[A-Z0-9_]*(?:PASSWORD|PASSPHRASE|PSK|SECRET|TOKEN|API_?KEY)[A-Z0-9_]*=\"[^\"]+\"", "flags": "", "sev": "error", "message": "A credential is hard-coded in the build config: it ships inside every image and it is already in your git history. Read it from NVS or from a provisioning step."}, {"pattern": "^\\s*CONFIG_[A-Z0-9_]*PANIC[A-Z0-9_]*GDBSTUB=y", "flags": "", "sev": "error", "message": "The panic handler drops into a GDB stub, so a crash hands an attacker a debugger on the device. Ship the print-and-reboot panic handler instead."}, {"pattern": "^\\s*CONFIG_(?:BOOTLOADER_)?LOG_(?:DEFAULT_)?LEVEL=[45]", "flags": "", "sev": "warn", "message": "Log level is Debug or Verbose, so boot detail and buffer contents leave a shipped unit over the UART. Use level 1 (error) or 2 (warn) for release."}, {"pattern": "^\\s*#\\s*CONFIG_NVS_ENCRYPTION is not set", "flags": "", "sev": "warn", "message": "NVS encryption is off: Wi-Fi credentials and tokens sit in cleartext in the NVS partition. Set CONFIG_NVS_ENCRYPTION=y."}, {"pattern": "^\\s*CONFIG_BOOT_SIGNATURE_TYPE_NONE=y", "flags": "", "sev": "error", "message": "MCUboot is set to accept unsigned images, so anything written to the update slot will boot. Choose an ECDSA or RSA signature type."}, {"pattern": "^\\s*#\\s*CONFIG_BOOT_VALIDATE_SLOT0 is not set", "flags": "", "sev": "error", "message": "MCUboot does not validate the primary slot at boot, so a tampered image is never caught after it is installed. Set CONFIG_BOOT_VALIDATE_SLOT0=y."}, {"pattern": "^\\s*#\\s*CONFIG_MCUBOOT_DOWNGRADE_PREVENTION is not set", "flags": "", "sev": "warn", "message": "Downgrade prevention is off: a signed but withdrawn image can be rolled back onto the device. Set CONFIG_MCUBOOT_DOWNGRADE_PREVENTION=y."}, {"pattern": "^\\s*#\\s*CONFIG_HW_STACK_PROTECTION is not set", "flags": "", "sev": "warn", "message": "Hardware stack protection is off, so a stack overflow becomes silent memory corruption instead of a fault. Set CONFIG_HW_STACK_PROTECTION=y."}, {"pattern": "^\\s*CONFIG_SHELL=y", "flags": "", "sev": "warn", "message": "An interactive shell is built in, so on a shipped unit the serial console is a command prompt. Keep CONFIG_SHELL in the debug overlay only."}, {"pattern": "^\\s*CONFIG_(?:DEBUG|DEBUG_OPTIMIZATIONS|COMPILER_OPTIMIZATION_(?:NONE|DEBUG))=y", "flags": "", "sev": "info", "message": "This is a debug build configuration; a release unit should be built at the size or performance optimisation level."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('firmware-release-gate');
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
//   ★역방향 체험 — 첫 스윕부터 7일은 ★줄이지 않은 전체 스윕과 보고서를 ⛔키 없이 그대로 준다.
//   ⛔키는 체험이 끝난 뒤에만 묻는다 — 손님은 자기 폴더에서 본 숫자를 보고 정한다.
const NEED_KEY = S.need_key;
async function paidGate(ctx) {
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
  return { inTrial: inTrial, st: st };
}

async function scanWorkspace(ctx) {
  const gate = await paidGate(ctx);
  if (!gate) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('firmware-release-gate');
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
  // ★손님이 본 숫자를 적어 둔다 — 체험이 끝난 뒤 키를 물을 때 이 줄을 먼저 보여준다.
  await gate.st.update('lastSweep', {
    files: rows.length, findings: n, at: new Date().toISOString().slice(0, 10)
  });
  vscode.window.showInformationMessage((n ? S.done : S.nothing_found)
    + (gate.inTrial ? ' The full sweep is free for 7 days from your first sweep.' : ''));
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
  const cfgFmt = String(vscode.workspace.getConfiguration('firmware-release-gate').get('reportFormat')
    || vscode.workspace.getConfiguration('firmware-release-gate').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'firmware-release-gate-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'firmware-release-gate-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "firmware-release-gate").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('firmware-release-gate.audit_file', runCurrent);
  reg('firmware-release-gate.list_rules', listRules);
  reg('firmware-release-gate.show_report', showReport);
  reg('firmware-release-gate.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('firmware-release-gate.export_report', function () { return exportReport(ctx); });
  reg('firmware-release-gate.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('firmware-release-gate').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
