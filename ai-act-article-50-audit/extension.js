// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Pick a format for the register", "check": "Audit this file", "paste": "Paste a file here - a chatbot handler, a system prompt, an image or voice generation service, an HR scoring script", "done": "Audit complete", "nothing_found": "Nothing found to report.", "need_key": "Full version: audit the whole repository and export the Article 50 register (CSV / JSON / HTML). $49 once, one licence key per person or team seat, 7-day full refund.", "buy": "Get the full version - $49", "key_ok": "Licence accepted. Repository audit and register export are unlocked.", "key_bad": "That key did not validate. Check it for typos, or reopen the purchase page.", "extra_rules": "Your own rules, checked alongside the 28 that ship inside. Each entry: pattern, flags, message, sev.", "enter_key": "Enter licence key"};
const PAID = ["workspace_scan", "export_report", "ci_json"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('AI Act Article 50 Audit');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('ai-act-article-50-audit').get('min_severity')
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
const RULES = [{"pattern": "chat\\.completions\\.create|responses\\.create\\(", "flags": "i", "message": "Art 50(1) - OpenAI chat/responses call site. If this output reaches a person, they must be told at first contact that they are interacting with an AI system. Add the call site to your Article 50 register.", "sev": "warn"}, {"pattern": "new\\s+Anthropic\\(|anthropic\\.messages\\.create|messages\\.create\\(|from\\s+anthropic\\b", "flags": "i", "message": "Art 50(1) - Anthropic messages call site. Human-facing output needs an AI-interaction notice before or at the first reply. Record this file in the register.", "sev": "warn"}, {"pattern": "GenerativeModel\\(|generate_content\\(|generateContent\\(|google\\.generativeai", "flags": "i", "message": "Art 50(1) - Gemini generation call site. Disclose the AI system to the person at first interaction unless the AI involvement is obvious to a reasonable person.", "sev": "warn"}, {"pattern": "InvokeModelCommand|bedrock-runtime|invoke_model\\(|converse\\(", "flags": "i", "message": "Art 50(1) - Bedrock invocation. You are the provider of the interacting system even when the model is someone else's; the disclosure duty is yours.", "sev": "warn"}, {"pattern": "ChatOpenAI\\(|ChatAnthropic\\(|ChatGoogleGenerativeAI\\(|langchain|llama_index", "flags": "i", "message": "Art 50(1) - orchestration framework call site. Trace where this chain's output surfaces to a user; that surface is what needs the disclosure.", "sev": "warn"}, {"pattern": "dialogflow|botpress|\\brasa\\b|LexRuntime|voiceflow|intercom.*bot", "flags": "i", "message": "Art 50(1) - chatbot platform integration. The end user must be informed they are talking to an AI system, in a way that is clear and distinguishable at first interaction.", "sev": "warn"}, {"pattern": "\\bollama\\b|llama[_-]?cpp|text-generation-inference|\\bvllm\\b|localai", "flags": "i", "message": "Art 50(1) - self-hosted model serving. Self-hosting does not remove the transparency duty; if a person is on the other end, disclose.", "sev": "warn"}, {"pattern": "images\\.generate|dall-?e|gpt-image|imagen-", "flags": "i", "message": "Art 50(2) - image generation. Output must carry an effective, machine-readable mark that it is AI-generated. Systems on the market before 2 Aug 2026 must comply by 2 December 2026.", "sev": "error"}, {"pattern": "StableDiffusionPipeline|\\bdiffusers\\b|stable-?diffusion|comfyui|automatic1111", "flags": "i", "message": "Art 50(2) - local image generation pipeline. A local pipeline strips nothing by itself, but it also marks nothing by itself. Attach a C2PA manifest or watermark before the file leaves your service.", "sev": "error"}, {"pattern": "replicate\\.run|fal\\.subscribe|fal_client|together\\.images", "flags": "i", "message": "Art 50(2) - hosted generation API. Confirm in writing whether the vendor marks the output; if it does not, you must mark it before publication.", "sev": "error"}, {"pattern": "elevenlabs|audio\\.speech|texttospeech|TextToSpeechClient|tts\\.synthes", "flags": "i", "message": "Art 50(2) - synthetic audio. Generated speech is synthetic content and needs the machine-readable mark, on top of any deepfake disclosure under Art 50(4).", "sev": "error"}, {"pattern": "runwayml|\\bsora\\b|veo-\\d|kling|pika[_-]?labs|luma\\.?ai", "flags": "i", "message": "Art 50(2) - video generation. Video output needs the machine-readable mark; if it depicts a real person, Art 50(4) deepfake disclosure applies as well.", "sev": "error"}, {"pattern": "c2pa|ContentCredential|content_credentials|truepic|\\bsynthid\\b", "flags": "i", "message": "Art 50(2) - provenance tooling found. Good. Verify the manifest survives resizing, re-encoding and your CDN, because an unreadable mark is not a mark.", "sev": "info"}, {"pattern": "-map_metadata[\\\"'\\s,]+-1|piexif\\.remove|strip[_-]?exif|remove[_-]?exif|stripMetadata|noProfile\\(|--strip-all|(convert|mogrify|magick)[^\\n]{0,60}\\s-strip\\b|exiftool\\s+-all=", "flags": "i", "message": "Art 50(2) RISK - this strips file metadata. If the media carries a C2PA manifest or metadata watermark, this line destroys the mark you are required to attach.", "sev": "error"}, {"pattern": "deepface|py[_-]?feat|\\bFER\\b|emotion[_-]?(recognition|classifier|detect)|affectiva|morphcast", "flags": "i", "message": "Art 50(3) - emotion recognition. As deployer you must inform the people exposed to it, and process their personal data under the GDPR.", "sev": "error"}, {"pattern": "face[_-]?recognition|insightface|facenet|get_frontal_face|detect_faces|face_encodings", "flags": "i", "message": "Art 50(3) - face processing. If faces are used to sort people into categories, the people exposed must be informed.", "sev": "warn"}, {"pattern": "biometric[_-]?categor|gender[_-]?(estimation|classif)|ethnicity[_-]?(predict|classif)|age[_-]?gender", "flags": "i", "message": "Art 50(3) - biometric categorisation. Inferring gender, age or ethnicity from biometrics triggers the deployer's duty to inform, and some inferences are prohibited outright under Art 5.", "sev": "error"}, {"pattern": "faceswap|\\broop\\b|deepfake|wav2lip|sadtalker|heygen|synthesia|d-id\\.com", "flags": "i", "message": "Art 50(4) - deepfake generation. Image, audio or video resembling real people must be disclosed as artificially generated or manipulated.", "sev": "error"}, {"pattern": "voice[_-]?clon|voiceClone|speaker[_-]?embedding|\\bxtts\\b|instant[_-]?voice", "flags": "i", "message": "Art 50(4) - voice cloning. A cloned voice of a real person is a deepfake and must be labelled as artificially generated.", "sev": "error"}, {"pattern": "auto[_-]?publish|publishArticle|generate[_-]?article|createPost\\(|cms\\.publish", "flags": "i", "message": "Art 50(4)(b) - published text. AI-generated text published to inform the public on matters of public interest must be disclosed, unless a human took editorial responsibility after review.", "sev": "info"}, {"pattern": "(scrape|crawl|harvest)[^\\n]{0,30}(face|facial|headshot|mugshot)|clearview", "flags": "i", "message": "Art 5 PROHIBITED - untargeted scraping of facial images to build a recognition database. This is banned outright, not merely a disclosure duty. Top penalty tier.", "sev": "error"}, {"pattern": "social[_-]?scor|socialScore|trustworthiness[_-]?score|citizen[_-]?score", "flags": "i", "message": "Art 5 PROHIBITED - social scoring of natural persons leading to detrimental treatment. Banned outright. Top penalty tier.", "sev": "error"}, {"pattern": "realtime[_-]?biometric|real[_-]?time[_-]?face|live[_-]?facial[_-]?recognition", "flags": "i", "message": "Art 5 PROHIBITED - real-time remote biometric identification in publicly accessible spaces. Narrow law-enforcement exceptions only.", "sev": "error"}, {"pattern": "(employee|candidate|applicant|student|pupil|interviewee)[^\\n]{0,40}emotion|emotion[^\\n]{0,40}(employee|candidate|applicant|student|pupil|interviewee)", "flags": "i", "message": "Art 5 PROHIBITED - inferring emotions of people in the workplace or in education. Banned outright since 2 February 2025. Top penalty tier.", "sev": "error"}, {"pattern": "(never|do\\s*not|don'?t|avoid|refuse\\s+to)[^\\n]{0,40}(reveal|disclose|admit|mention|say|tell)[^\\n]{0,40}(a\\.?i\\.?\\b|\\bbot\\b|assistant|language model|machine|robot)", "flags": "i", "message": "Art 50(1) BREACH - this prompt instructs the model to hide that it is an AI. The duty to inform the person cannot be contracted away in a system prompt.", "sev": "error"}, {"pattern": "you\\s+are\\s+(a\\s+|an\\s+)?(human|real\\s+person|real\\s+human|live\\s+agent)|pretend[^\\n]{0,20}(to\\s+be|you\\s+are)[^\\n]{0,20}(human|person)|act\\s+as\\s+a\\s+human", "flags": "i", "message": "Art 50(1) BREACH - the persona claims to be a human being. Anything that makes the AI indistinguishable to the user defeats the disclosure duty.", "sev": "error"}, {"pattern": "human[_-]?name|agent_name\\s*=\\s*['\\\"][A-Z][a-z]+['\\\"]|\\\"agentName\\\"", "flags": "i", "message": "Art 50(1) - a human-sounding agent name is allowed, but the AI notice must still be clear and distinguishable at first interaction.", "sev": "info"}, {"pattern": "data-ai-disclosure|You'?re\\s+(chatting|talking)\\s+with\\s+an\\s+AI|AI-generated|generated\\s+by\\s+AI|aria-label=\\\"[^\\\"]*AI\\b", "flags": "i", "message": "Disclosure string found. Keep it visible at or before the first interaction, and keep the wording in your Article 50 evidence file.", "sev": "info"}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('ai-act-article-50-audit');
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
  const _c = vscode.workspace.getConfiguration('ai-act-article-50-audit');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('ai-act-article-50-audit').get('reportFormat')
    || vscode.workspace.getConfiguration('ai-act-article-50-audit').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'ai-act-article-50-audit-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'ai-act-article-50-audit-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "ai-act-article-50-audit").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('ai-act-article-50-audit.audit_file', runCurrent);
  reg('ai-act-article-50-audit.audit_selection', runSelection);
  reg('ai-act-article-50-audit.show_report', showReport);
  reg('ai-act-article-50-audit.list_rules', listRules);
  reg('ai-act-article-50-audit.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('ai-act-article-50-audit.export_report', function () { return exportReport(ctx); });
  reg('ai-act-article-50-audit.ci_json', function () { return ciJson(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('ai-act-article-50-audit').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
