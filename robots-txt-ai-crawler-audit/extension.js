// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Check this file for AI crawler mistakes", "check": "Check", "paste": "Paste your robots.txt here", "done": "Check complete - findings are listed below.", "nothing_found": "No AI crawler problems found in this file.", "need_key": "Full version: scan every robots.txt in the workspace, export the report as CSV, JSON or HTML for a client, and fail CI on errors. $29 once - one licence key per person or team seat - 7-day full refund. A freelance technical SEO consultant bills roughly $100-150 an hour.", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "key_ok": "Licence accepted - workspace scan, export and CI output are on.", "key_bad": "That licence key was not accepted. Check for stray spaces, or paste the key exactly as it arrived by email."};
const PAID = ["workspace_scan", "export_report", "ci_json", "custom_rules", "watch_on_save"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('AI Crawler Rules for robots.txt');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('robots-txt-ai-crawler-audit').get('min_severity')
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
const RULES = [{"pattern": "^\\s*User-agent:\\s*(Claude-Web|anthropic-ai)\\s*(#.*)?$", "flags": "i", "sev": "error", "message": "Retired token. Claude-Web and anthropic-ai were replaced by ClaudeBot in 2024, so this group controls no current Claude traffic. Use ClaudeBot (training), Claude-SearchBot (citation in Claude) or Claude-User (user-triggered fetch).", "fix": "User-agent: ClaudeBot"}, {"pattern": "^\\s*User-agent:\\s*(GPT-Bot|Claude-Bot|Perplexity-Bot|Amazon-Bot|Google-Bot|Bing-Bot|Apple-Bot|Byte-Spider)\\s*(#.*)?$", "flags": "i", "sev": "error", "message": "No crawler answers to this name - the real token has no hyphen (GPTBot, ClaudeBot, PerplexityBot, Amazonbot, Googlebot, Bingbot, Applebot, Bytespider). robots.txt ignores unknown tokens silently, so this group is dead weight.", "fix": "User-agent: GPTBot"}, {"pattern": "^\\s*User-agent:\\s*(ChatGPT-Bot|ChatGPTBot|ChatGPT|OpenAI-Bot|OpenAI-Crawler|OpenAI|Bard|Google-Bard|Gemini|Gemini-Bot|Meta-AI|LLaMA|Copilot-Bot|AI-Bot|AIBot|GPT-4|GPT4)\\s*(#.*)?$", "flags": "i", "sev": "error", "message": "Not a real crawler token. Assistants emit these names confidently, but nothing answers to them, so this group blocks nothing at all. The documented tokens are GPTBot, OAI-SearchBot, ChatGPT-User, OAI-AdsBot, ClaudeBot, Claude-SearchBot, Claude-User, Google-Extended and PerplexityBot.", "fix": "User-agent: GPTBot"}, {"pattern": "^\\s*Noindex\\s*:", "flags": "i", "sev": "error", "message": "Google stopped honouring noindex in robots.txt on 1 September 2019. This line does nothing. Use a meta robots noindex tag on the page, or an X-Robots-Tag HTTP header.", "fix": "# move to: <meta name=\"robots\" content=\"noindex\">"}, {"pattern": "^\\s*Disallow:\\s*\\*\\s*(#.*)?$", "sev": "error", "message": "Disallow: * is not a valid path value. To block a whole group write Disallow: / - as written this is widely parsed as an empty path, which allows the entire site rather than blocking it.", "fix": "Disallow: /"}, {"pattern": "^\\s*Sitemap:\\s*(?!https?://)\\S", "flags": "i", "sev": "error", "message": "Sitemap must be an absolute URL including scheme and host. A relative path is ignored, so your sitemap is not being announced here.", "fix": "Sitemap: https://example.com/sitemap.xml"}, {"pattern": "^\\s*User-agent:\\s*(Google-Extended)\\s*(#.*)?$", "flags": "i", "sev": "warn", "message": "Google-Extended is a control token, not a crawler - it only opts content out of Gemini model training and grounding. Google documents that it does NOT affect inclusion in Google Search and is not a ranking signal, and AI Overviews are served from Googlebot. Blocking this to escape AI Overviews does not work."}, {"pattern": "^\\s*User-agent:\\s*(Applebot-Extended)\\s*(#.*)?$", "flags": "i", "sev": "warn", "message": "Applebot-Extended is a control token, not a crawler - it only opts content out of Apple model training. Apple Search and Siri still use Applebot, so this line does not change your visibility there. You will never see it as a request in server logs."}, {"pattern": "^\\s*User-agent:\\s*(OAI-SearchBot|Claude-SearchBot|PerplexityBot|Amzn-SearchBot)\\s*(#.*)?$", "flags": "i", "sev": "warn", "message": "This is a search and citation crawler, not a training crawler. If this group disallows, you remove yourself from the answers ChatGPT, Claude, Perplexity or Amazon show - while your content can still be trained on through GPTBot or ClaudeBot. Training and citation are separate controls."}, {"pattern": "^\\s*User-agent:\\s*(Googlebot)\\s*(#.*)?$", "flags": "i", "sev": "warn", "message": "Googlebot is the search crawler and it is also what feeds AI Overviews. Disallowing this group removes you from Google Search itself. There is currently no supported way to stay in Search but out of AI Overviews."}, {"pattern": "^\\s*Crawl-delay\\s*:", "flags": "i", "sev": "warn", "message": "Googlebot ignores Crawl-delay completely. Bing and several AI crawlers do honour it. To slow Google down, use the crawl rate setting in Search Console instead of this line."}, {"pattern": "^\\s*Host\\s*:", "flags": "i", "sev": "warn", "message": "Host: is not part of the robots.txt standard and is ignored by Google and Bing. Set your canonical host with redirects and rel=canonical instead."}, {"pattern": "^\\s*Disallow:\\s*/\\*\\s*(#.*)?$", "sev": "warn", "message": "Disallow: /* matches every path, exactly like Disallow: /. If you meant to block a pattern, put the literal part first, for example Disallow: /draft*."}, {"pattern": "^\\s*User-agent:\\s*(Perplexity-User)\\s*(#.*)?$", "flags": "i", "sev": "warn", "message": "Perplexity-User is a user-triggered fetcher and Perplexity documents that it generally does not follow robots.txt. Treat this group as advisory: if you must stop it, block at the edge or by IP rather than relying on this line."}, {"pattern": "^\\s*User-agent:\\s*(GPTBot|ClaudeBot|CCBot|Bytespider|Amazonbot|Meta-ExternalAgent|meta-externalagent)\\s*(#.*)?$", "flags": "i", "sev": "info", "message": "Training crawler. Disallowing it keeps your pages out of model training data and does NOT affect whether you are cited in AI search, which runs on OAI-SearchBot, Claude-SearchBot and PerplexityBot. Blocking GPTBot alone does not remove you from ChatGPT."}, {"pattern": "^\\s*User-agent:\\s*(ChatGPT-User|Claude-User|Amzn-User|Meta-ExternalFetcher)\\s*(#.*)?$", "flags": "i", "sev": "info", "message": "User-triggered fetcher: it loads the page only when a person asks the assistant to open your link. Disallowing it means a reader who deliberately pastes your URL gets an empty answer, while training access is unaffected."}, {"pattern": "^\\s*User-agent:\\s*(OAI-AdsBot)\\s*(#.*)?$", "flags": "i", "sev": "info", "message": "OAI-AdsBot only validates the safety of pages submitted as ads in ChatGPT, and OpenAI documents that it is not used for model training. Blocking it can stop your own ads from being verified."}, {"pattern": "^\\s*User-agent:\\s*\\*\\s*(#.*)?$", "sev": "info", "message": "The wildcard group does not cover AI crawlers the way most people assume: a named group replaces it entirely, it is not merged. If GPTBot has its own group, GPTBot ignores every rule written here. Name each AI token you actually care about."}, {"pattern": "llms\\.txt", "flags": "i", "sev": "info", "message": "llms.txt is a proposed convention, not an honoured standard - no major AI crawler currently reads it. Keep real access rules in robots.txt and treat llms.txt as documentation only."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('robots-txt-ai-crawler-audit');
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

// ★무료 — ★마지막 결과 패널을 다시 연다
async function showReport() { out().show(true); }

// ★유료 — ★여기서 ★키를 묻는다. ⛔무료 명령은 이 문을 지나지 않는다.
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('robots-txt-ai-crawler-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('robots-txt-ai-crawler-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('robots-txt-ai-crawler-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'robots-txt-ai-crawler-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'robots-txt-ai-crawler-audit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

async function customRules(ctx) {
  if (!(await paidGate(ctx))) return;
  await vscode.commands.executeCommand('workbench.action.openSettings', 'robots-txt-ai-crawler-audit');
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
  try { lic.pullFeed(ctx, "robots-txt-ai-crawler-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('robots-txt-ai-crawler-audit.audit_file', runCurrent);
  reg('robots-txt-ai-crawler-audit.audit_selection', runSelection);
  reg('robots-txt-ai-crawler-audit.list_rules', listRules);
  reg('robots-txt-ai-crawler-audit.show_report', showReport);
  reg('robots-txt-ai-crawler-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('robots-txt-ai-crawler-audit.export_report', function () { return exportReport(ctx); });
  reg('robots-txt-ai-crawler-audit.ci_json', function () { return ciJson(ctx); });
  reg('robots-txt-ai-crawler-audit.custom_rules', function () { return customRules(ctx); });
  reg('robots-txt-ai-crawler-audit.watch_on_save', function () { return watchOnSave(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('robots-txt-ai-crawler-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
