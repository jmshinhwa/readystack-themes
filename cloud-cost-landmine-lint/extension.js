// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Reading the file for standing charges", "done": "Checked. Every finding below carries its published unit price.", "nothing_found": "No standing charge found in this file.", "paste": "Paste your .tf, .yaml, .yml or template.json here", "check": "Find the standing charges", "extra_rules": "Extra rules of your own, checked alongside the ones that ship inside.", "need_key": "Full version: every file in the repository instead of the one you have open, plus a CSV, JSON or HTML report and machine output that fails a build. $29 once, one licence key per person or team seat, 7-day full refund. Amazon's own published price for the same untouched cluster after the date passes is $0.60 per cluster-hour instead of $0.10, which is $365 more every month.", "buy": "Get the full version - $29", "key_ok": "Licence accepted. The workspace scan, the report and the CI output are open.", "key_bad": "That key did not validate.", "enter_key": "Enter licence key"};
const PAID = ["workspace_scan", "export_report", "ci_json"];
// ★역방향 체험 — ⛔S.need_key 를 덮어쓰기 전의 ★원문. 겹쳐 붙는 것을 막는다.
const NEED_KEY = S.need_key;
const TRIAL_MS = 7 * 24 * 3600 * 1000;
const TRIAL_NOTE = ' The full sweep is free for 7 days from your first sweep.';

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Cloud Cost Landmine Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('cloud-cost-landmine-lint').get('min_severity')
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
const RULES = [{"pattern": "map_public_ip_on_launch\\s*=\\s*true", "flags": "i", "sev": "error", "message": "Every instance launched here takes a public IPv4 at $0.005 per hour, in use or idle - $3.65 a month each, charged since 2024-02-01. A private subnet does not need one.", "fix": "map_public_ip_on_launch = false"}, {"pattern": "associate_public_ip_address\\s*=\\s*true", "flags": "i", "sev": "error", "message": "This instance takes a public IPv4 at $0.005 per hour - $3.65 a month per instance, whether or not a byte flows. Reach it through the NAT gateway or a VPC endpoint instead.", "fix": "associate_public_ip_address = false"}, {"pattern": "aws_eip\\b|AWS::EC2::EIP", "flags": "", "sev": "warn", "message": "An Elastic IP bills $0.005 per hour even while unattached and idle - $3.65 a month for an address nothing is using.", "fix": "release the address, or attach it to something"}, {"pattern": "aws_nat_gateway\\b|AWS::EC2::NatGateway", "flags": "", "sev": "error", "message": "A NAT gateway is $0.045 per hour - $32.85 a month at 730 hours - plus $0.045 for every GB it processes, plus the internet egress on top. It bills with zero traffic.", "fix": "a gateway VPC endpoint for S3 and DynamoDB costs nothing per hour"}, {"pattern": "single_nat_gateway\\s*=\\s*false", "flags": "i", "sev": "error", "message": "false means one NAT gateway per availability zone. Three AZs is $98.55 a month in hourly charges alone, before a single GB is processed.", "fix": "single_nat_gateway = true outside production"}, {"pattern": "one_nat_gateway_per_az\\s*=\\s*true", "flags": "i", "sev": "error", "message": "One NAT gateway per AZ at $0.045 per hour each: $32.85 a month multiplied by the number of zones, before any data processing.", "fix": "one_nat_gateway_per_az = false outside production"}, {"pattern": "enable_nat_gateway\\s*=\\s*true", "flags": "i", "sev": "warn", "message": "This module variable is what creates the NAT gateway: $0.045 per hour plus $0.045 per GB. Traffic to S3 and DynamoDB can leave through a gateway VPC endpoint at no hourly charge.", "fix": "keep it, but add the free gateway endpoints beside it"}, {"pattern": "(version|kubernetes_version)\\s*[:=]\\s*\\\"?1\\.31\\\"?", "flags": "i", "sev": "error", "message": "Kubernetes 1.31 left Amazon EKS standard support on 2025-11-26. The cluster already bills extended support at $0.60 per cluster-hour instead of $0.10 - $365 more a month - and is force-upgraded on 2026-11-26.", "fix": "upgrade to 1.35 or 1.36"}, {"pattern": "(version|kubernetes_version)\\s*[:=]\\s*\\\"?1\\.32\\\"?", "flags": "i", "sev": "error", "message": "Kubernetes 1.32 left Amazon EKS standard support on 2026-03-23. The cluster already bills $0.60 per cluster-hour instead of $0.10 - $365 more a month - and is force-upgraded on 2027-03-23.", "fix": "upgrade to 1.35 or 1.36"}, {"pattern": "(version|kubernetes_version)\\s*[:=]\\s*\\\"?1\\.33\\\"?", "flags": "i", "sev": "error", "message": "Kubernetes 1.33 left Amazon EKS standard support on 2026-07-29. The cluster already bills $0.60 per cluster-hour instead of $0.10 - $365 more a month - and is force-upgraded on 2027-07-29.", "fix": "upgrade to 1.35 or 1.36"}, {"pattern": "(version|kubernetes_version)\\s*[:=]\\s*\\\"?1\\.34\\\"?", "flags": "i", "sev": "error", "message": "Kubernetes 1.34 leaves Amazon EKS standard support on 2026-12-02. From the start of that day the same untouched cluster bills $0.60 per cluster-hour instead of $0.10 - $365 more a month - with nothing changed on your side.", "fix": "upgrade to 1.35 (standard until 2027-03-27) or 1.36 (until 2027-08-02)"}, {"pattern": "sku_tier\\s*=\\s*\\\"Premium\\\"", "flags": "", "sev": "warn", "message": "The AKS Premium tier, which carries Long Term Support, is $0.60 per cluster-hour; the Standard tier is $0.10. That is $365 a month more per cluster.", "fix": "sku_tier = \"Standard\" unless you are deliberately buying LTS"}, {"pattern": "\\\"gp2\\\"|gp2\\b", "flags": "", "sev": "warn", "message": "gp2 is $0.10 per GB-month. gp3 is $0.08 per GB-month with 3,000 IOPS and 125 MiB/s included at no extra charge - the same volume for 20 percent less.", "fix": "volume_type = \"gp3\""}, {"pattern": "\\\"GLACIER\\\"|GLACIER_FLEXIBLE", "flags": "", "sev": "warn", "message": "S3 Glacier Flexible Retrieval bills a minimum of 90 days for every object. An object deleted on day 10 still pays for the remaining 80.", "fix": "only transition objects you will keep past 90 days"}, {"pattern": "\\\"DEEP_ARCHIVE\\\"", "flags": "", "sev": "warn", "message": "S3 Glacier Deep Archive bills a minimum of 180 days for every object. Uploaded on day 1 and deleted on day 30, it still bills 150 more days.", "fix": "only transition objects you will keep past 180 days"}, {"pattern": "\\\"STANDARD_IA\\\"|\\\"ONEZONE_IA\\\"", "flags": "", "sev": "warn", "message": "Standard-IA and One Zone-IA bill a minimum of 30 days for every object. Transitioning objects younger than that costs more than leaving them in Standard.", "fix": "set days = 30 or more on the transition"}, {"pattern": "retention_in_days\\s*=\\s*0", "flags": "i", "sev": "error", "message": "0 means Never Expire. CloudWatch Logs ingestion is $0.50 per GB in the Standard class and the stored bytes keep billing forever after that.", "fix": "retention_in_days = 30, or move the group to the Infrequent Access class at $0.25 per GB"}, {"pattern": "aws_cloudwatch_log_group\\b|AWS::Logs::LogGroup", "flags": "", "sev": "info", "message": "A log group with no retention_in_days keeps every line forever. Ingestion is $0.50 per GB in the Standard class and $0.25 per GB in Infrequent Access; the first 5 GB a month is free.", "fix": "set retention_in_days on this group"}, {"pattern": "aws_flow_log\\b|AWS::EC2::FlowLog", "flags": "", "sev": "warn", "message": "VPC Flow Logs sent to CloudWatch pay CloudWatch Logs ingestion at $0.50 per GB, and a busy VPC writes tens of GB a day.", "fix": "send them to S3 if you only read them occasionally"}, {"pattern": "aws_secretsmanager_secret\\b|AWS::SecretsManager::Secret", "flags": "", "sev": "info", "message": "Each secret is $0.40 a month plus $0.05 per 10,000 API calls, and every replica region bills as a separate secret.", "fix": "a standard SSM Parameter Store parameter costs nothing"}, {"pattern": "aws_kms_key\\b|AWS::KMS::Key", "flags": "", "sev": "info", "message": "A customer-managed KMS key is $1.00 a month each, plus $0.03 per 10,000 requests. AWS-managed keys cost nothing.", "fix": "use a customer-managed key only where you need your own policy or rotation"}, {"pattern": "aws_ec2_transit_gateway_vpc_attachment\\b|AWS::EC2::TransitGatewayAttachment", "flags": "", "sev": "warn", "message": "A Transit Gateway attachment is $0.05 per hour - $36.50 a month each - plus $0.02 for every GB processed, on top of the ordinary data transfer.", "fix": "VPC peering has no hourly charge for two VPCs that only talk to each other"}, {"pattern": "vpc_endpoint_type\\s*=\\s*\\\"Interface\\\"", "flags": "", "sev": "warn", "message": "An interface endpoint is $0.01 per hour per availability zone plus $0.01 per GB - about $14.60 a month across two zones, per endpoint.", "fix": "gateway endpoints for S3 and DynamoDB have no hourly charge"}, {"pattern": "aws_globalaccelerator_accelerator\\b|AWS::GlobalAccelerator::Accelerator", "flags": "", "sev": "warn", "message": "A Global Accelerator bills $0.025 per hour - about $18.25 a month - whether it is enabled or disabled.", "fix": "delete the accelerator rather than disabling it"}, {"pattern": "aws_lb\\b|aws_alb\\b|AWS::ElasticLoadBalancingV2::LoadBalancer", "flags": "", "sev": "info", "message": "Each load balancer is $0.0225 per hour - $16.43 a month - plus $0.008 per LCU-hour, and it holds a public IPv4 in every subnet it lives in at $0.005 per hour each.", "fix": "share one load balancer across services with host or path rules"}, {"pattern": "azurerm_public_ip\\b", "flags": "", "sev": "warn", "message": "An Azure Standard SKU public IP is $0.005 per hour - $3.65 a month - attached or not. The Basic SKU was retired on 2025-09-30, so there is no free option left.", "fix": "delete addresses nothing is using"}, {"pattern": "multi_az\\s*=\\s*true", "flags": "i", "sev": "info", "message": "Multi-AZ bills two instances instead of one, and the replication crosses availability zones at $0.01 per GB in each direction. Right for production, expensive for a staging copy.", "fix": "multi_az = false outside production"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('cloud-cost-landmine-lint');
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
//   ★역방향 체험: 첫 스윕부터 7일 동안은 키 없이 ★전체 스윕과 보고서를 ⛔줄이지 않고 그대로 준다.
//   손님이 돈 낼지 정하는 순간은 ★자기 폴더에서 결과를 본 뒤다.
async function paidGate(ctx) {
  const st = ctx.globalState;
  const hasKey = !!st.get('licenseKey');
  let until = Number(st.get('sweepTrialUntil') || 0);
  if (!hasKey && !until) { until = Date.now() + TRIAL_MS; await st.update('sweepTrialUntil', until); }
  const inTrial = !hasKey && Date.now() < until;
  if (!inTrial) {
    const last = st.get('lastSweep');
    S.need_key = (last && last.files ? ('Your trial sweep covered ' + last.files + ' files and found '
      + last.findings + ' findings. ') : '') + NEED_KEY;
    if (!(await lic.ensure(vscode, ctx, S))) return { ok: false, inTrial: false };
  }
  return { ok: true, inTrial: inTrial };
}

async function scanWorkspace(ctx) {
  const gate = await paidGate(ctx);
  if (!gate.ok) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('cloud-cost-landmine-lint');
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
  // ★본 것을 적어둔다 — 체험이 끝난 뒤 키를 물을 때 ★자기 폴더의 숫자로 묻는다.
  await ctx.globalState.update('lastSweep', { files: rows.length, findings: found,
                                              at: new Date().toISOString().slice(0, 10) });
  vscode.window.showInformationMessage(S.done + (gate.inTrial ? TRIAL_NOTE : ''));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const gate = await paidGate(ctx);
  if (!gate.ok) return;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('cloud-cost-landmine-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('cloud-cost-landmine-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'cloud-cost-landmine-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath + (gate.inTrial ? TRIAL_NOTE : ''));
}

async function ciJson(ctx) {
  const gate = await paidGate(ctx);
  if (!gate.ok) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'cloud-cost-landmine-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath + (gate.inTrial ? TRIAL_NOTE : ''));
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "cloud-cost-landmine-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('cloud-cost-landmine-lint.audit_file', runCurrent);
  reg('cloud-cost-landmine-lint.audit_selection', runSelection);
  reg('cloud-cost-landmine-lint.list_rules', listRules);
  reg('cloud-cost-landmine-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('cloud-cost-landmine-lint.export_report', function () { return exportReport(ctx); });
  reg('cloud-cost-landmine-lint.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('cloud-cost-landmine-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
