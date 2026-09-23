// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Auditando o XML contra a NT 2025.002…", "done": "Auditoria concluída — veja o painel Auditor IBS/CBS NF-e.", "nothing_found": "Nenhuma ocorrência: o grupo IBS/CBS deste arquivo passou nas 11 regras da NT 2025.002.", "need_key": "Versão completa: audita todos os XMLs do workspace de uma vez, exporta o laudo (CSV/JSON/HTML) e devolve saída para o CI. $29 uma vez · uma chave de licença por pessoa ou assento de equipe · reembolso total em 7 dias. Assinaturas de apoio à Reforma Tributária partem de R$ 147/mês.", "key_ok": "Licença validada. Varredura do workspace, laudo em arquivo e saída de CI liberados.", "key_bad": "Essa chave não foi validada. Confira se copiou a chave inteira, sem espaços.", "buy": "Obter a versão completa — $29", "enter_key": "Inserir chave de licença", "paste": "Cole aqui o XML da sua NF-e ou NFC-e", "check": "Auditar o XML"};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('Auditor IBS/CBS NF-e');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('auditor-ibs-cbs-nfe').get('min_severity')
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
const RULES = [{"pattern": "<g?IBSCBS\\s*/>|<g?IBSCBS>\\s*</g?IBSCBS>", "flags": "i", "message": "Grupo IBS/CBS vazio. Desde o Ato Técnico Conjunto CGIBS/RFB nº 1 (31/07/2026) a SEFAZ autoriza o documento assim mesmo, mas a obrigação de informar segue vigente (Ato Conjunto RFB/CGIBS nº 4, 30/07/2026). Preencha CST, cClassTrib e os grupos gIBSUF, gIBSMun e gCBS.", "fix": "<gIBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib>...</gIBSCBS>", "sev": "error"}, {"pattern": "<pIBSUF>(?!0*\\.10*<)[^<]*</pIBSUF>", "flags": "", "message": "Alíquota de IBS estadual fora do previsto para 2026. Em 2026 pIBSUF deve ser 0,1% (alíquota-teste da LC 214/2025). Benefício se declara no grupo de redução (gRed), nunca zerando a alíquota-base.", "fix": "<pIBSUF>0.10</pIBSUF>", "sev": "error"}, {"pattern": "<pCBS>(?!0*\\.90*<)[^<]*</pCBS>", "flags": "", "message": "Alíquota de CBS fora do previsto para 2026. Em 2026 pCBS deve ser 0,9% (alíquota-teste da LC 214/2025). Redução vai no grupo gRed, não na alíquota-base.", "fix": "<pCBS>0.90</pCBS>", "sev": "error"}, {"pattern": "<pIBSMun>(?!0*\\.?0*<)[^<]*</pIBSMun>", "flags": "", "message": "Alíquota de IBS municipal diferente de zero em 2026. O 0,1% de IBS cabe integralmente à parcela estadual neste ano (art. 343 da LC nº 214/2025); a parcela municipal é zero, mas a tag deve continuar presente e preenchida.", "fix": "<pIBSMun>0.00</pIBSMun>", "sev": "error"}, {"pattern": "<cClassTrib>(?!\\d{6}</)[^<]*</cClassTrib>", "flags": "", "message": "cClassTrib fora do formato. O Código de Classificação Tributária da NT 2025.002 tem exatamente 6 dígitos numéricos, retirados da tabela do Informe Técnico RT 2025.002.", "fix": "<cClassTrib>000001</cClassTrib>", "sev": "error"}, {"pattern": "<cClassTrib>0{6}</cClassTrib>", "flags": "", "message": "cClassTrib 000000 é um valor de rascunho, não existe na tabela oficial — ela começa em 000001. Combinado com CST incompatível, este é o caso da Rejeição 1024 quando as validações voltarem.", "fix": "<cClassTrib>000001</cClassTrib>", "sev": "error"}, {"pattern": "<(?:vBC|pIBSUF|pIBSMun|pCBS|vIBSUF|vIBSMun|vCBS|vIBS|vBCIBSCBS)>[^<]*,[^<]*</", "flags": "", "message": "Vírgula decimal em campo numérico. O XML da NF-e usa ponto como separador decimal; vírgula quebra o schema antes mesmo das regras de IBS/CBS.", "fix": "Troque a vírgula por ponto: 1500.00", "sev": "error"}, {"pattern": "<(?:vBC|vIBSUF|vIBSMun|vCBS|vIBS|vBCIBSCBS)>\\d+\\.\\d{3,}</", "flags": "", "message": "Campo de valor com mais de 2 casas decimais. Os campos monetários do grupo IBS/CBS são gravados com 2 decimais; arredonde antes de serializar.", "fix": "Arredonde para 2 casas: 1500.00", "sev": "warn"}, {"pattern": "<(?:CST|cClassTrib|pIBSUF|pIBSMun|pCBS|vBC)>[ \\t]+[^<]*</", "flags": "", "message": "Espaço em branco dentro de campo fiscal. O leiaute da NF-e não admite espaços ou indentação no conteúdo das tags; remova o preenchimento.", "fix": "<CST>000</CST>", "sev": "warn"}, {"pattern": "</gIBSUF>\\s*(?:<gCBS>|</gIBS>|</g?IBSCBS>)", "flags": "i", "message": "Grupo gIBSMun ausente logo após gIBSUF. Omitir a tag municipal porque a alíquota é zero em 2026 é o erro estrutural mais comum: o grupo é obrigatório mesmo com valor zero.", "fix": "<gIBSMun><pIBSMun>0.00</pIBSMun><vIBSMun>0.00</vIBSMun></gIBSMun>", "sev": "error"}, {"pattern": "<(?:vBC|vIBSUF|vIBSMun|vCBS|vIBS|vBCIBSCBS)>\\s*-", "flags": "", "message": "Valor negativo em campo do grupo IBS/CBS. Devolução e anulação se representam por CST e cClassTrib próprios e por documento referenciado, nunca por valor negativo.", "fix": "Use o cClassTrib de devolução e o grupo de referência do documento", "sev": "warn"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('auditor-ibs-cbs-nfe');
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
//   ★역방향 체험 — 첫 스윙부터 7일은 ★키 없이 ★전부 준다 (⛔줄이지 않는다). 그 뒤에 키를 묻는다.
const TRIAL_MS = 7 * 24 * 3600 * 1000;
const TRIAL_NOTE = ' The full sweep is free for 7 days from your first sweep.';
const NEED_KEY = S.need_key;   // ⛔원문 — 체험 요약을 앞에 붙일 때 ★여기서 다시 짓는다 (누적 금지)

// 통과하면 { inTrial } 을, 막히면 false 를 낸다.
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
    if (!(await lic.ensure(vscode, ctx, S))) return false;
  }
  return { inTrial: inTrial };
}

async function scanWorkspace(ctx) {
  const gate = await paidGate(ctx);
  if (!gate) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('auditor-ibs-cbs-nfe');
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
  // ★손님이 본 숫자를 기억한다 — 체험이 끝나 키를 물 때 ★이 숫자로 묻는다.
  await ctx.globalState.update('lastSweep', {
    files: rows.length, findings: n, at: new Date().toISOString().slice(0, 10)
  });
  vscode.window.showInformationMessage((n ? S.done : S.nothing_found) + (gate.inTrial ? TRIAL_NOTE : ''));
}

// ★유료 — ★CSV · JSON · HTML ★셋 다 쓴다.
//   🔴s125: ⛔전에는 CSV 하나만 썼는데 ★프롬프트는 "CSV / JSON / HTML" 이라고 약속했다
//     ⇒ ★검수가 옳게 잡았다("⑤거짓 주장"). ★법(S24): 한계를 만나면 ⛔좁히지 말고 ★손을 넓힌다.
async function exportReport(ctx) {
  const gate = await paidGate(ctx);
  if (!gate) return;
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
  const cfgFmt = String(vscode.workspace.getConfiguration('auditor-ibs-cbs-nfe').get('reportFormat')
    || vscode.workspace.getConfiguration('auditor-ibs-cbs-nfe').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'auditor-ibs-cbs-nfe-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath + (gate.inTrial ? TRIAL_NOTE : ''));
}

async function ciJson(ctx) {
  const gate = await paidGate(ctx);
  if (!gate) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'auditor-ibs-cbs-nfe-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath + (gate.inTrial ? TRIAL_NOTE : ''));
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "auditor-ibs-cbs-nfe").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('auditor-ibs-cbs-nfe.audit_file', runCurrent);
  reg('auditor-ibs-cbs-nfe.audit_selection', runSelection);
  reg('auditor-ibs-cbs-nfe.show_report', showReport);
  reg('auditor-ibs-cbs-nfe.list_rules', listRules);
  reg('auditor-ibs-cbs-nfe.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('auditor-ibs-cbs-nfe.export_report', function () { return exportReport(ctx); });
  reg('auditor-ibs-cbs-nfe.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('auditor-ibs-cbs-nfe').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
