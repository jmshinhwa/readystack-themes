/*
 * javamap.js - s173 2026-09-30 - "Which Java does this project pull?"
 *
 * [measured 2026-09-30] installs come from people who type "temurin" / "corretto" / "adoptium" in the Marketplace
 * search (this extension is the only result). They are moving to a free build, so their files are mostly clean and
 * the license check alone gave them nothing to read (237 installs -> 3 findings pings). The map gives what they came
 * for, free and local: every place in the workspace that chooses a Java build, the Oracle-licensed ones on today's
 * date, the JDK this machine runs (read from each JDK's own `release` file) and the free line for each place.
 * Nothing leaves the machine. The paid part stays the written workspace report and the CI check (extension.js).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const SLUG = 'oracle-jdk-license-gate';
const MAP_GLOB = '**/{Dockerfile,Dockerfile.*,*.yml,*.yaml,*.sh,.sdkmanrc,.tool-versions,*.gradle,*.gradle.kts,toolchains.xml,pom.xml,devcontainer.json,Brewfile,*.ps1,Jenkinsfile}';
const EXCLUDE = '**/{node_modules,.git,dist,build,target,vendor,out}/**';
const JAVA_GLOB = '**/{pom.xml,build.gradle,build.gradle.kts,*.java,*.kt}';

const T = {
  en: ['{t}: {n} place{s} in this workspace choose a Java build ({sum}). Oracle-licensed today: {m}. See each line and the free Temurin line for it.',
       '{t}: this is a Java project, but no file here pins a Java vendor. See which JDK this machine runs it on and the Temurin line for each place.',
       'Show the Java map', 'Not now'],
  de: ['{t}: {n} Stelle(n) in diesem Arbeitsbereich wählen einen Java-Build ({sum}). Heute unter Oracle-Lizenz: {m}. Jede Zeile und die freie Temurin-Zeile dazu ansehen.',
       '{t}: Das ist ein Java-Projekt, aber keine Datei legt hier einen Java-Anbieter fest. Ansehen, mit welchem JDK dieser Rechner es ausführt, und die Temurin-Zeile für jede Stelle.',
       'Java-Übersicht zeigen', 'Später'],
  ja: ['{t}: このワークスペースには Java ビルドを選ぶ箇所が {n} か所あります ({sum})。本日時点で Oracle ライセンスのもの: {m}。各行と、置き換えられる Temurin の行を確認できます。',
       '{t}: Java プロジェクトですが、Java のベンダーを指定しているファイルがありません。このマシンがどの JDK で実行しているかと、各箇所の Temurin の行を確認できます。',
       'Java マップを表示', '後で'],
  es: ['{t}: {n} lugar(es) de este espacio de trabajo eligen una build de Java ({sum}). Con licencia de Oracle hoy: {m}. Mira cada línea y la línea gratuita de Temurin que la sustituye.',
       '{t}: es un proyecto Java, pero ningún archivo fija aquí un proveedor de Java. Mira con qué JDK lo ejecuta esta máquina y la línea de Temurin para cada lugar.',
       'Mostrar el mapa de Java', 'Ahora no'],
  pt: ['{t}: {n} lugar(es) deste workspace escolhem uma build de Java ({sum}). Com licença da Oracle hoje: {m}. Veja cada linha e a linha gratuita do Temurin que a substitui.',
       '{t}: este é um projeto Java, mas nenhum arquivo fixa aqui um fornecedor de Java. Veja com qual JDK esta máquina o executa e a linha do Temurin para cada lugar.',
       'Mostrar o mapa de Java', 'Agora não']
};

// s185 D4 — [실측 7d] the Java map toast reached 184 people and 40 opened the map; none of them was ever shown the paid part, because
//   the map toast had no money button and most "temurin" searchers already run a free JDK (clean files → no findings toast).
//   What a company that just left Oracle needs is ★proof it left: a dated record (rules date, UTC time, SHA-256 of every file) for an
//   Oracle licence review or its own auditor. ⇒ one paid button on the toast, only without a key. It runs the existing paid sweep
//   (key panel → report). Facts only — no promise about any audit outcome.
const AUD = {
  en: [' For an Oracle licence review, keep a dated record of this check (rules date, UTC time, SHA-256 of every file).', 'Dated record — $29 once'],
  de: [' Für eine Oracle-Lizenzprüfung: diese Prüfung als datierten Nachweis speichern (Regelstand, UTC-Zeit, SHA-256 jeder Datei).', 'Datierter Nachweis — 29 $ einmalig'],
  ja: [' Oracle のライセンス監査に備えて、この確認を日付入りの記録として残せます (ルールの日付・UTC 時刻・全ファイルの SHA-256)。', '日付入りの記録 — 買い切り $29'],
  es: [' Para una revisión de licencias de Oracle, guarde un registro fechado de esta comprobación (fecha de reglas, hora UTC, SHA-256 de cada archivo).', 'Registro fechado — $29 una vez'],
  pt: [' Para uma revisão de licenças da Oracle, guarde um registro datado desta verificação (data das regras, hora UTC, SHA-256 de cada arquivo).', 'Registro datado — US$ 29 uma vez']
};
function lang(vscode) { return String((vscode && vscode.env && vscode.env.language) || 'en').slice(0, 2).toLowerCase(); }
function today() { return new Date().toISOString().slice(0, 10); }

function send(vscode, why, t, src) {   // same rules as auto.js: anonymous, off when telemetry is off, never in CI, never breaks the product
  try {
    if (process.env.READYSTACK_NO_TELEMETRY || process.env.CI) return;
    if (vscode && vscode.env && vscode.env.isTelemetryEnabled === false) return;
    const tt = t || 'use', ss = src || 'vsix';
    const body = JSON.stringify({ t: tt, slug: SLUG, src: ss, why: why, path: '/' + tt + '/' + ss + '/' + SLUG });
    const req = https.request({ hostname: 'getreadystack.com', path: '/api/ev', method: 'POST', timeout: 4000,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'user-agent': 'readystack-vsix/' + SLUG } },
      function (res) { res.resume(); });
    req.on('timeout', function () { req.destroy(); }); req.on('error', function () {});
    req.write(body); req.end();
  } catch (e) { /* counting never breaks the product */ }
}

/* A JDK home carries a `release` file: KEY="value" lines written by the vendor's own build. We only quote it. */
function readRelease(home) {
  try {
    const txt = fs.readFileSync(path.join(home, 'release'), 'utf8');
    const get = function (k) { const m = new RegExp('^' + k + '="?([^"\\r\\n]*)"?', 'm').exec(txt); return m ? m[1] : null; };
    return { home: home, implementor: get('IMPLEMENTOR'), version: get('JAVA_VERSION'), runtime: get('JAVA_RUNTIME_VERSION') };
  } catch (e) { return { home: home, missing: true }; }
}

function machineJdks(vscode, env) {
  const seen = {}, out = [];
  const add = function (from, p) {
    if (!p || typeof p !== 'string') return;
    const key = path.resolve(p);
    if (seen[key]) return; seen[key] = 1;
    const r = readRelease(p); r.from = from; out.push(r);
  };
  add('JAVA_HOME', (env || process.env).JAVA_HOME);
  try {
    const cfg = vscode.workspace.getConfiguration();
    add('VS Code setting java.jdt.ls.java.home', cfg.get('java.jdt.ls.java.home'));
    const rts = cfg.get('java.configuration.runtimes');
    if (Array.isArray(rts)) rts.forEach(function (r) { if (r && r.path) add('VS Code setting java.configuration.runtimes (' + (r.name || '') + ')', r.path); });
  } catch (e) { }
  return out;
}

function summary(pins) {
  const c = {};
  pins.forEach(function (p) { const v = /^\$/.test(p.vendor) ? 'matrix' : p.vendor; c[v] = (c[v] || 0) + 1; });
  return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).slice(0, 5).map(function (k) { return k + ' ×' + c[k]; }).join(' · ');
}

/* Pure: data in, Markdown out (tested without VS Code). data = {day, title, files, java, rows:[{file, findings, pins, notes}], jdks, LINES, rules} */
function render(d) {
  const L = [], pins = [], finds = [], notes = [];
  (d.rows || []).forEach(function (r) {
    (r.pins || []).forEach(function (p) { pins.push({ file: r.file, p: p }); });
    (r.findings || []).forEach(function (f) { finds.push({ file: r.file, f: f }); });
    (r.notes || []).forEach(function (n) { notes.push({ file: r.file, n: n }); });
  });
  L.push('# Java in this workspace - ' + d.day);
  L.push('');
  L.push(d.title + ' read ' + d.files + ' file' + (d.files === 1 ? '' : 's') + ' here against ' + d.rules + ' checks. Everything below was read on this machine; nothing was sent anywhere.');
  L.push('');
  L.push('## 1. Oracle-licensed Java pulls on ' + d.day + ': ' + finds.length);
  L.push('');
  if (!finds.length) L.push('None of the files read pulls an Oracle-licensed Java build.');
  finds.slice(0, 80).forEach(function (x) { L.push('- `' + x.file + '` line ' + x.f.line + ' - ' + x.f.msg); });
  if (finds.length > 80) L.push('- ... and ' + (finds.length - 80) + ' more.');
  L.push('');
  L.push('## 2. Where this workspace chooses its Java: ' + pins.length + ' place' + (pins.length === 1 ? '' : 's'));
  L.push('');
  if (!pins.length) L.push('No file here names a Java vendor (setup-java distribution, Docker base image, Gradle or Maven toolchain vendor, SDKMAN, asdf, dev container). The build then uses whatever JDK the machine or the CI runner happens to have.');
  else {
    L.push('| File | Line | Place | Vendor named |'); L.push('| --- | --- | --- | --- |');
    pins.slice(0, 120).forEach(function (x) { L.push('| `' + x.file + '` | ' + x.p.line + ' | ' + x.p.kind + ' | ' + x.p.vendor.replace(/\|/g, '/') + ' |'); });
    if (pins.length > 120) L.push('| ... | | ' + (pins.length - 120) + ' more | |');
  }
  L.push('');
  if (notes.length) {
    L.push('## 3. Worth changing (not a license matter)');
    L.push('');
    notes.slice(0, 40).forEach(function (x) { L.push('- `' + x.file + '` line ' + x.n.line + ' - ' + x.n.msg + '. Line to use: `' + x.n.fix + '`'); });
    L.push('');
  }
  L.push('## ' + (notes.length ? '4' : '3') + '. Java on this machine');
  L.push('');
  const jd = d.jdks || [];
  if (!jd.length) L.push('No JAVA_HOME is set and no Java runtime is configured in the VS Code settings, so there is nothing to read here.');
  jd.forEach(function (j) {
    if (j.missing) { L.push('- ' + j.from + ' = `' + j.home + '` - no `release` file there, so the vendor cannot be read.'); return; }
    L.push('- ' + j.from + ' = `' + j.home + '` - its `release` file says IMPLEMENTOR "' + (j.implementor || 'not stated') + '", JAVA_VERSION "' + (j.version || 'not stated') + '".');
    if (/oracle/i.test(String(j.implementor || ''))) {
      L.push('  Oracle Corporation publishes two builds under that name: the Oracle JDK (No-Fee Terms or Oracle Technology Network license) and the OpenJDK build from jdk.java.net (GPLv2 with the Classpath Exception). `java -version` tells them apart: the Oracle JDK prints `Java(TM) SE Runtime Environment`, the OpenJDK build prints `OpenJDK Runtime Environment`.');
    }
  });
  L.push('');
  L.push('## ' + (notes.length ? '5' : '4') + '. The free line for each place');
  L.push('');
  L.push('| Place | Eclipse Temurin | Amazon Corretto |'); L.push('| --- | --- | --- |');
  (d.LINES || []).forEach(function (x) { L.push('| ' + x.kind + ' | `' + x.temurin + '` | ' + (x.corretto ? '`' + x.corretto + '`' : '') + ' |'); });
  L.push('');
  L.push('Oracle\'s No-Fee Terms cover a Java LTS release until one year after the next LTS ships: the free window for JDK 21 closed on 2026-09-16, for JDK 17 on 2024-09-19. OpenJDK builds such as Temurin and Corretto are not under those terms.');
  L.push('');
  L.push('---');
  L.push('This map is free and stays on this machine. The written workspace report (every line, as a file for your team, an auditor or CI) is the paid part: run `' + d.title + ': Sweep workspace and write report`.');
  return L.join('\n');
}

async function collect(vscode, E, limit) {
  const day = today(), rows = [];
  const uris = await vscode.workspace.findFiles(MAP_GLOB, EXCLUDE, limit || 400);
  for (const u of uris) {
    try {
      const b = await vscode.workspace.fs.readFile(u);
      if (b.length > 400000) continue;
      const txt = Buffer.from(b).toString('utf8');
      const res = E.engine.check(txt, { today: day, path: u.fsPath });
      rows.push({ file: vscode.workspace.asRelativePath(u), findings: res.findings || [], pins: E.engine.pins(txt), notes: E.engine.notes(txt) });
    } catch (e) { }
  }
  let java = 0;
  try { java = (await vscode.workspace.findFiles(JAVA_GLOB, EXCLUDE, 5)).length; } catch (e) { }
  return { day: day, files: rows.length, java: java, rows: rows };
}

async function show(vscode, E, title, data) {
  const d = data || await collect(vscode, E);
  d.title = title; d.rules = E.RULE_COUNT || (E.RULES || []).length; d.LINES = E.LINES; d.jdks = machineJdks(vscode);
  const doc = await vscode.workspace.openTextDocument({ content: render(d), language: 'markdown' });
  await vscode.window.showTextDocument(doc, { preview: false });
  send(vscode, 'java_map');
  return d;
}

async function offer(ctx, o) {
  try {
    const vscode = o.vscode, st = ctx && ctx.globalState, key = o.PREFIX + '.mapOffered';
    if (!st || st.get(key)) return null;
    if (!vscode.workspace.workspaceFolders || !vscode.workspace.workspaceFolders.length) return null;
    const d = await collect(vscode, o.ENGINE, 300);
    let pins = 0, finds = 0; const all = [];
    d.rows.forEach(function (r) { pins += r.pins.length; finds += r.findings.length; r.pins.forEach(function (p) { all.push(p); }); });
    if (!pins && !d.java) return { shown: false };             // not a Java workspace: say nothing
    await st.update(key, d.day);
    const M = T[lang(vscode)] || T.en;
    const msg = (pins ? M[0] : M[1]).replace('{t}', o.title).replace('{n}', pins).replace('{s}', pins === 1 ? '' : 's').replace('{sum}', summary(all)).replace('{m}', finds);
    send(vscode, 'java_map_offer');
    const A = (!st.get('licenseKey')) ? (AUD[lang(vscode)] || AUD.en) : null;
    if (A) send(vscode, 'map_audit_offer', 'paywall', 'vsix');   // the money screen, counted
    const pk = A ? await vscode.window.showInformationMessage(msg + A[0], M[2], A[1], M[3]) : await vscode.window.showInformationMessage(msg, M[2], M[3]);
    if (pk === M[2]) await show(vscode, o.ENGINE, o.title, d);
    else if (A && pk === A[1]) { send(vscode, 'map_audit_click', 'paywall', 'vsix'); await vscode.commands.executeCommand(o.PREFIX + '.checkWorkspace'); }
    return { shown: true, pick: pk || null, pins: pins, findings: finds, audit: A ? A[1] : null };
  } catch (e) { return null; }
}

function start(ctx, o) {
  const vscode = o.vscode;
  ctx.subscriptions.push(vscode.commands.registerCommand(o.PREFIX + '.javaMap', function () { return show(vscode, o.ENGINE, o.title); }));
  const t = setTimeout(function () { offer(ctx, o); }, o.delay == null ? 12000 : o.delay);
  if (t && t.unref) t.unref();
}

module.exports = { start: start, offer: offer, show: show, collect: collect, render: render, readRelease: readRelease, machineJdks: machineJdks, summary: summary, MAP_GLOB: MAP_GLOB };
