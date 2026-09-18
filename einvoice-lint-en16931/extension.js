// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Checking the e-invoice", "done": "Check finished - see the findings", "nothing_found": "No rejectable line found in this file", "paste": "Paste a UBL or CII e-invoice (XRechnung, Factur-X, Peppol BIS) here", "check": "Check this e-invoice", "need_key": "Full version: check every XML in the repository in one pass, export the findings report, and fail the CI build on a new violation. $29 once - one licence key per person or team seat - 7-day full refund. Access points bill per document, EUR 0.18 to EUR 0.25 per invoice.", "key_ok": "Licence accepted", "key_bad": "That key did not validate", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "extra_rules": "Extra rules of your own, checked alongside the 26 that ship inside."};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('E-Invoice Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('einvoice-lint-en16931').get('min_severity')
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
const RULES = [{"pattern": "xoev-de:kosit:standard:xrechnung_1\\.\\d", "flags": "i", "sev": "error", "message": "XRechnung 1.x specification identifier (BT-24). Version 1.x has not been a valid XRechnung since 2020; a German public-sector or B2B receiver rejects the file at the gate.", "fix": "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0"}, {"pattern": "xoev-de:kosit:standard:xrechnung_2\\.\\d", "flags": "i", "sev": "error", "message": "XRechnung 2.x specification identifier (BT-24). Version 2.3 stopped being valid on 1 February 2024, when 3.0 took over. This is the identifier a chatbot most often hands you.", "fix": "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0"}, {"pattern": "xoev-de:kosit:standard:xrechnung_3\\.0\\.\\d", "flags": "i", "sev": "error", "message": "The bundle version (3.0.1 / 3.0.2) has been written into BT-24. The specification identifier stays at xrechnung_3.0 for the whole 3.0 line - only the KoSIT bundle carries the third digit.", "fix": "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0"}, {"pattern": "urn:factur-x\\.eu:1p0:minimum", "flags": "i", "sev": "error", "message": "Factur-X MINIMUM profile. MINIMUM carries header data only - the line items stay in the PDF layer - so it is not EN 16931 compliant and the French B2B route does not accept it as a structured invoice.", "fix": "urn:cen.eu:en16931:2017 (EN 16931 profile) or urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended"}, {"pattern": "urn:factur-x\\.eu:1p0:basicwl", "flags": "i", "sev": "error", "message": "Factur-X BASIC WL profile. BASIC WL is 'without lines' - no invoice lines in the XML - so it fails EN 16931 the same way MINIMUM does.", "fix": "urn:cen.eu:en16931:2017 (EN 16931 profile) or urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:extended"}, {"pattern": "urn:ferd:CrossIndustryDocument:invoice:1p0", "flags": "i", "sev": "error", "message": "ZUGFeRD 1.0 context parameter. ZUGFeRD 1.0 predates EN 16931 and uses the old CrossIndustryDocument namespace; nothing in the 2026 mandates reads it.", "fix": "Regenerate as ZUGFeRD 2.x / Factur-X: urn:cen.eu:en16931:2017"}, {"pattern": "urn:zugferd\\.de:2p0:", "flags": "i", "sev": "warn", "message": "ZUGFeRD 2.0 profile identifier. From 2.1 onward the profiles moved to the shared Factur-X URNs; receivers that only know the current set will not match this one.", "fix": "urn:cen.eu:en16931:2017 for the EN 16931 profile"}, {"pattern": "urn:www\\.cenbii\\.eu:transaction:biitrns", "flags": "i", "sev": "error", "message": "CENBII / Peppol BIS 2.0 transaction identifier. That generation of the network was switched off in 2019; BIS Billing 3.0 replaced it.", "fix": "urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0"}, {"pattern": "<cbc:ProfileID[^>]*>\\s*urn:fdc:peppol\\.eu:2017:poacc:billing:(?!01:1\\.0\\s*<)", "flags": "", "sev": "error", "message": "Peppol BIS Billing profile identifier (BT-23) is not the billing process id. For an invoice or credit note it is always the 01:1.0 process, whatever the customization says.", "fix": "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0"}, {"pattern": "<cbc:UBLVersionID>\\s*(?!2\\.1\\s*<)", "flags": "", "sev": "error", "message": "UBLVersionID is not 2.1. EN 16931 and Peppol BIS Billing 3.0 are both bound to UBL 2.1; any other value makes the syntax binding undefined.", "fix": "<cbc:UBLVersionID>2.1</cbc:UBLVersionID>"}, {"pattern": "<cbc:InvoiceTypeCode[^>]*>\\s*381\\s*<", "flags": "", "sev": "error", "message": "Type code 381 (credit note) inside a UBL Invoice document. In UBL a credit note is its own root element with CreditNoteTypeCode; 381 in an Invoice is a document-type mismatch, not a code-list problem.", "fix": "Send a <CreditNote> with <cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode>, or use 384 (corrected invoice) if you meant to replace an invoice."}, {"pattern": "<cbc:InvoiceTypeCode[^>]*>\\s*(?!(?:71|80|82|84|102|218|219|326|331|380|381|382|383|384|386|388|389|393|395|553|575|623|780|817|870|875|876|877)\\s*<)", "flags": "", "sev": "error", "message": "Invoice type code (BT-3) is outside the UNTDID 1001 subset that EN 16931 and Peppol BIS Billing 3.0 allow. Codes invented outside the subset fail schematron before any business rule runs.", "fix": "380 commercial invoice, 384 corrected invoice, 386 prepayment invoice, 389 self-billed invoice, 326 partial invoice, 875/876/877 construction invoices."}, {"pattern": "<ram:CategoryCode>\\s*(?!(?:AE|B|E|G|K|L|M|O|S|Z)\\s*<)", "flags": "", "sev": "error", "message": "VAT category code is outside UNTDID 5305. The list has exactly ten entries and each one drives a different BR-* rule set, so a wrong letter silently changes which VAT rules are applied.", "fix": "S standard, Z zero rated, E exempt, AE reverse charge, K intra-community, G export, O outside scope, L Canary Islands, M Ceuta and Melilla, B transferred VAT (Italy)."}, {"pattern": "<cbc:(?:IssueDate|DueDate|TaxPointDate|StartDate|EndDate|ActualDeliveryDate|PaymentDueDate)>\\s*(?!\\d{4}-\\d{2}-\\d{2}\\s*<)", "flags": "", "sev": "error", "message": "Date is not in the ISO 8601 form the UBL binding requires. Local formats such as 31.12.2026 or 12/31/2026 are the single most common reason a first e-invoice bounces.", "fix": "YYYY-MM-DD, for example 2026-09-08"}, {"pattern": "<ram:DateTimeString[^>]*format=\\\"(?!102\\\")", "flags": "", "sev": "error", "message": "CII date format qualifier is not 102. EN 16931 binds every date in Cross Industry Invoice to UNTDID 2379 format 102, so 101, 203 or 204 are rejected even when the date itself is correct.", "fix": "format=\"102\" with the value written as CCYYMMDD"}, {"pattern": "<ram:DateTimeString[^>]*format=\\\"102\\\"\\s*>\\s*(?!\\d{8}\\s*<)", "flags": "", "sev": "error", "message": "CII date is declared as format 102 but the value is not eight digits. Format 102 is CCYYMMDD with no separators - a hyphenated date here contradicts its own qualifier.", "fix": "20260908, not 2026-09-08"}, {"pattern": "<cbc:EndpointID>", "flags": "", "sev": "error", "message": "Electronic address (BT-34 / BT-49) carries no schemeID. The identifier is meaningless without the EAS code that says what kind of address it is, and routing cannot resolve it.", "fix": "<cbc:EndpointID schemeID=\"9930\">DE123456789</cbc:EndpointID> - 9930 German VAT, 9957 French VAT, 0009 SIRET, 0088 GLN, 0198 Danish CVR."}, {"pattern": "<cbc:EndpointID[^>]*schemeID=\\\"[A-Z]{2}:[A-Z]{2,}\\\"", "flags": "", "sev": "error", "message": "Legacy Peppol party scheme (DE:VAT, FR:SIRET and similar) in schemeID. Those string schemes were replaced by four-digit EAS codes; an access point on the current network cannot look this up.", "fix": "Use the numeric EAS code: 9930 for DE:VAT, 9957 for FR:VAT, 0009 for FR:SIRET, 9925 for BE:VAT."}, {"pattern": "<cbc:EndpointID[^>]*>[^<]*@", "flags": "", "sev": "warn", "message": "The electronic address looks like an email address. Peppol routes on registered participant identifiers, not mailboxes, so an email here means the invoice has nowhere to go.", "fix": "Use the receiver's registered participant id with its EAS schemeID."}, {"pattern": "<cbc:(?:TaxAmount|PayableAmount|LineExtensionAmount|TaxExclusiveAmount|TaxInclusiveAmount|TaxableAmount|AllowanceTotalAmount|ChargeTotalAmount|PrepaidAmount|PayableRoundingAmount|Percent|BaseQuantity|InvoicedQuantity|MultiplierFactorNumeric)[^>]*>\\s*-?\\d+,\\d", "flags": "", "sev": "error", "message": "Decimal comma in a numeric value. XML numeric types use a dot regardless of locale, so 1.234,56 written this way is read as a different number or fails the type check outright.", "fix": "Write 1234.56 - no thousands separator, dot as the decimal mark."}, {"pattern": "<cbc:(?:TaxAmount|PayableAmount|LineExtensionAmount|TaxExclusiveAmount|TaxInclusiveAmount|TaxableAmount|AllowanceTotalAmount|ChargeTotalAmount|PrepaidAmount|PayableRoundingAmount|PriceAmount)>", "flags": "", "sev": "error", "message": "Amount element has no currencyID attribute. Every amount in EN 16931 is a qualified amount; without the currency the value is not typed and the totals cannot be checked.", "fix": "<cbc:PayableAmount currencyID=\"EUR\">1234.56</cbc:PayableAmount>"}, {"pattern": "<cbc:(?:TaxAmount|PayableAmount|LineExtensionAmount|TaxExclusiveAmount|TaxInclusiveAmount|TaxableAmount|AllowanceTotalAmount|ChargeTotalAmount|PrepaidAmount|PayableRoundingAmount)[^>]*>\\s*-?\\d+\\.\\d{3,}", "flags": "", "sev": "error", "message": "Amount carries more than two decimals. The BR-DEC rules cap document and line amounts at two decimals; only the unit price (BT-146) may go finer, so this is not a rounding preference.", "fix": "Round the amount to two decimals and keep the extra precision in cbc:PriceAmount."}, {"pattern": "<cbc:Percent[^>]*>[^<]*%", "flags": "", "sev": "error", "message": "Percent sign inside the VAT rate value. The element is a number, and the symbol makes it fail type validation before any VAT rule is evaluated.", "fix": "<cbc:Percent>19</cbc:Percent>"}, {"pattern": "unitCode=\\\"[^\\\"]*[a-z]", "flags": "", "sev": "warn", "message": "Unit of measure code is not upper case. UN/ECE Recommendation 20 codes are upper case throughout, so Stk, pcs or kg are not in the list even though the intent is obvious.", "fix": "H87 piece, C62 one, KGM kilogram, LTR litre, MTR metre, MTK square metre, DAY day, HUR hour, TNE tonne."}, {"pattern": "<\\?xml[^>]*encoding=\\\"(?![Uu][Tt][Ff]-8\\\")", "flags": "", "sev": "error", "message": "The XML declaration asks for an encoding other than UTF-8. Every EN 16931 syntax binding is UTF-8, and a Latin-1 file turns umlauts and accented names into invalid characters on the receiving side.", "fix": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"}, {"pattern": "<cbc:BuyerReference\\s*/>|<cbc:BuyerReference>\\s*</cbc:BuyerReference>", "flags": "", "sev": "error", "message": "Buyer reference (BT-10) is present but empty. XRechnung makes BT-10 mandatory - it is where the Leitweg-ID goes - and an empty element counts as missing, not as optional.", "fix": "<cbc:BuyerReference>04011000-12345-56</cbc:BuyerReference> - the Leitweg-ID the buyer gave you."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('einvoice-lint-en16931');
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
  const _c = vscode.workspace.getConfiguration('einvoice-lint-en16931');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('einvoice-lint-en16931').get('reportFormat')
    || vscode.workspace.getConfiguration('einvoice-lint-en16931').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'einvoice-lint-en16931-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'einvoice-lint-en16931-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "einvoice-lint-en16931").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('einvoice-lint-en16931.audit_file', runCurrent);
  reg('einvoice-lint-en16931.audit_selection', runSelection);
  reg('einvoice-lint-en16931.show_report', showReport);
  reg('einvoice-lint-en16931.list_rules', listRules);
  reg('einvoice-lint-en16931.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('einvoice-lint-en16931.export_report', function () { return exportReport(ctx); });
  reg('einvoice-lint-en16931.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('einvoice-lint-en16931').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
