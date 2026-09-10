// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Watching this SBOM - it re-checks on every save.", "done": "Field gaps found - see the SBOM Field Check panel.", "nothing_found": "No field gaps found: every field these 34 rules look for is present.", "need_key": "Full version: every SBOM in the repo, an evidence file you keep, and CI output that fails the build before release. $29 once - one licence key per person or team seat - 7-day full refund. Published CRA cost calculators price this work at EUR 45/hour, and a documented readiness pass for one product family at EUR 12,000-25,000 of internal engineering time.", "key_ok": "Licence accepted - workspace check, evidence export and CI output are open.", "key_bad": "That key did not validate. Check it against your Polar receipt, or take the 7-day refund.", "enter_key": "Enter licence key", "buy": "Get the full version - $29", "paste": "Paste your SBOM here - bom.json (CycloneDX) or sbom.spdx.json (SPDX)", "check": "Check this SBOM", "extra_rules": "Extra rules of your own, checked alongside the 34 that ship inside."};
const PAID = ["workspace_scan", "export_report", "ci_json", "watch_on_save"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('SBOM Field Check for CRA 2026');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('sbom-field-check-cra-2026').get('min_severity')
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
const RULES = [{"json": {"kind": "ver", "path": "specVersion", "min": "1.6", "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Spec version below the bar: BSI TR-03183-2 accepts CycloneDX 1.6+ or SPDX 3.0.1+ only", "sev": "error"}, {"json": {"kind": "ver", "path": "spdxVersion", "min": "3.0.1", "when": {"path": "spdxVersion"}}, "message": "Spec version below the bar: SPDX 2.x does not qualify, BSI TR-03183-2 requires SPDX 3.0.1+", "sev": "error"}, {"json": {"kind": "ver", "path": "@graph.specVersion", "min": "3.0.1", "when": {"path": "@context"}}, "message": "Spec version below the bar: SPDX 3.0.1 is the lowest version BSI TR-03183-2 accepts", "sev": "error"}, {"json": {"kind": "doc", "paths": ["metadata.timestamp"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Timestamp absent: BSI TR-03183-2 requires an ISO-8601 creation time on the document", "sev": "error"}, {"json": {"kind": "doc", "paths": ["metadata.authors.name", "metadata.manufacturer.name", "metadata.supplier.name"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Author absent: BSI TR-03183-2 requires the creator (e-mail or URL of the producer)", "sev": "error"}, {"json": {"kind": "doc", "paths": ["metadata.tools.components.name", "metadata.tools.name"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Tool Name absent: CISA 2026 minimum elements ask which tool produced this document", "sev": "warn"}, {"json": {"kind": "doc", "paths": ["metadata.tools.components.version", "metadata.tools.version"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Tool Version absent: a finding cannot be reproduced without the generator version", "sev": "info"}, {"json": {"kind": "doc", "paths": ["metadata.lifecycles.phase"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Generation Context absent: no metadata.lifecycles phase (design, build, deployed, runtime)", "sev": "warn"}, {"json": {"kind": "doc", "paths": ["serialNumber"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM identity absent: no serialNumber, so two revisions of this document cannot be told apart", "sev": "warn"}, {"json": {"kind": "doc", "paths": ["version"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Version absent: no document version integer", "sev": "info"}, {"json": {"kind": "doc", "paths": ["dependencies"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "No dependencies[] at all: the CRA requires the SBOM to cover at least the top-level dependencies", "sev": "error"}, {"json": {"kind": "each", "list": "components", "paths": ["supplier.name", "manufacturer.name", "author", "publisher"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component Producer absent (no supplier, manufacturer, author or publisher)", "sev": "error"}, {"json": {"kind": "each", "list": "components", "paths": ["version"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component Version absent", "sev": "error"}, {"json": {"kind": "each", "list": "components", "paths": ["purl", "cpe", "bom-ref", "externalReferences.url"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component Identifiers absent (no purl, cpe or bom-ref) - cannot be matched to a CVE", "sev": "error"}, {"json": {"kind": "each", "list": "components", "paths": ["hashes.content"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component Hash absent: BSI TR-03183-2 requires a SHA-512 of the deployable component", "sev": "error"}, {"json": {"kind": "each", "list": "components", "paths": ["licenses"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component License absent", "sev": "error"}, {"json": {"kind": "each_bad", "list": "components", "path": "version", "bad": ["noassertion", "none", "unknown", "n/a", "*", "latest"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component Version is a placeholder, not a version", "sev": "warn"}, {"json": {"kind": "each_bad", "list": "components", "path": "name", "bad": [""], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component has no usable name", "sev": "warn"}, {"json": {"kind": "each", "list": "packages", "paths": ["supplier", "originator"], "when": {"path": "spdxVersion"}}, "message": "Component Producer absent (SPDX supplier / originator)", "sev": "error"}, {"json": {"kind": "each", "list": "packages", "paths": ["versionInfo"], "when": {"path": "spdxVersion"}}, "message": "Component Version absent (SPDX versionInfo)", "sev": "error"}, {"json": {"kind": "each", "list": "packages", "paths": ["checksums.checksumValue"], "when": {"path": "spdxVersion"}}, "message": "Component Hash absent (SPDX checksums) - BSI TR-03183-2 requires SHA-512", "sev": "error"}, {"json": {"kind": "each", "list": "packages", "paths": ["externalRefs.referenceLocator"], "when": {"path": "spdxVersion"}}, "message": "Component Identifiers absent (SPDX externalRefs: no purl or cpe)", "sev": "error"}, {"json": {"kind": "each", "list": "packages", "paths": ["licenseConcluded", "licenseDeclared"], "when": {"path": "spdxVersion"}}, "message": "Component License absent (SPDX licenseConcluded / licenseDeclared)", "sev": "error"}, {"json": {"kind": "each_bad", "list": "packages", "path": "supplier", "bad": ["noassertion"], "when": {"path": "spdxVersion"}}, "message": "Component Producer is NOASSERTION: the field exists but resolves to nothing", "sev": "warn"}, {"json": {"kind": "each_bad", "list": "packages", "path": "versionInfo", "bad": ["noassertion", "none", "unknown"], "when": {"path": "spdxVersion"}}, "message": "Component Version is NOASSERTION: the field exists but resolves to nothing", "sev": "warn"}, {"json": {"kind": "each", "paths": ["suppliedBy", "originatedBy"], "when": {"path": "@context"}, "list": "@graph", "filter": {"path": "type", "has": "software_Package"}}, "message": "Component Producer absent (SPDX 3 suppliedBy / originatedBy)", "sev": "error"}, {"json": {"kind": "each", "paths": ["packageVersion"], "when": {"path": "@context"}, "list": "@graph", "filter": {"path": "type", "has": "software_Package"}}, "message": "Component Version absent (SPDX 3 packageVersion)", "sev": "error"}, {"json": {"kind": "each", "paths": ["verifiedUsing"], "when": {"path": "@context"}, "list": "@graph", "filter": {"path": "type", "has": "software_Package"}}, "message": "Component Hash absent (SPDX 3 verifiedUsing)", "sev": "error"}, {"json": {"kind": "each", "paths": ["externalIdentifier"], "when": {"path": "@context"}, "list": "@graph", "filter": {"path": "type", "has": "software_Package"}}, "message": "Component Identifiers absent (SPDX 3 externalIdentifier: no packageUrl or cpe23)", "sev": "error"}, {"pattern": "^\\s*SPDXVersion:\\s*SPDX-[012]\\.", "flags": "", "sev": "error", "message": "SPDX tag-value document at 2.x or lower: below the SPDX 3.0.1 bar"}, {"pattern": "^\\s*PackageSupplier:\\s*NOASSERTION", "flags": "", "sev": "warn", "message": "Component Producer is NOASSERTION on this package"}, {"pattern": "^\\s*PackageVersion:\\s*(NOASSERTION|NONE)\\s*$", "flags": "", "sev": "warn", "message": "Component Version is NOASSERTION on this package"}, {"pattern": "^\\s*PackageChecksum:\\s*(MD5|SHA1):", "flags": "", "sev": "info", "message": "Hash is MD5 or SHA-1: BSI TR-03183-2 names SHA-512 for the deployable component"}, {"pattern": "\"alg\"\\s*:\\s*\"(?:MD5|SHA-1)\"", "flags": "i", "sev": "info", "message": "Hash is MD5 or SHA-1: BSI TR-03183-2 names SHA-512 for the deployable component"}];

// ★JSON 구조 검사 (s138) — ⛔줄 정규식이 ★못 보는 것을 본다: 문서 전체의 빠진 칸 · 목록 각 칸의 빠진 칸.
//   ★어휘 넷뿐이다: doc(문서에 이 칸이 있나) · ver(판 번호가 기준 이상인가)
//                  each(목록의 각 칸에 이 칸이 있나) · each_bad(값이 쓸모없는 값인가)
var JRULES = [{"json": {"kind": "ver", "path": "specVersion", "min": "1.6", "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Spec version below the bar: BSI TR-03183-2 accepts CycloneDX 1.6+ or SPDX 3.0.1+ only", "sev": "error"}, {"json": {"kind": "ver", "path": "spdxVersion", "min": "3.0.1", "when": {"path": "spdxVersion"}}, "message": "Spec version below the bar: SPDX 2.x does not qualify, BSI TR-03183-2 requires SPDX 3.0.1+", "sev": "error"}, {"json": {"kind": "ver", "path": "@graph.specVersion", "min": "3.0.1", "when": {"path": "@context"}}, "message": "Spec version below the bar: SPDX 3.0.1 is the lowest version BSI TR-03183-2 accepts", "sev": "error"}, {"json": {"kind": "doc", "paths": ["metadata.timestamp"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Timestamp absent: BSI TR-03183-2 requires an ISO-8601 creation time on the document", "sev": "error"}, {"json": {"kind": "doc", "paths": ["metadata.authors.name", "metadata.manufacturer.name", "metadata.supplier.name"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Author absent: BSI TR-03183-2 requires the creator (e-mail or URL of the producer)", "sev": "error"}, {"json": {"kind": "doc", "paths": ["metadata.tools.components.name", "metadata.tools.name"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Tool Name absent: CISA 2026 minimum elements ask which tool produced this document", "sev": "warn"}, {"json": {"kind": "doc", "paths": ["metadata.tools.components.version", "metadata.tools.version"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Tool Version absent: a finding cannot be reproduced without the generator version", "sev": "info"}, {"json": {"kind": "doc", "paths": ["metadata.lifecycles.phase"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Generation Context absent: no metadata.lifecycles phase (design, build, deployed, runtime)", "sev": "warn"}, {"json": {"kind": "doc", "paths": ["serialNumber"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM identity absent: no serialNumber, so two revisions of this document cannot be told apart", "sev": "warn"}, {"json": {"kind": "doc", "paths": ["version"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "SBOM Version absent: no document version integer", "sev": "info"}, {"json": {"kind": "doc", "paths": ["dependencies"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "No dependencies[] at all: the CRA requires the SBOM to cover at least the top-level dependencies", "sev": "error"}, {"json": {"kind": "each", "list": "components", "paths": ["supplier.name", "manufacturer.name", "author", "publisher"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component Producer absent (no supplier, manufacturer, author or publisher)", "sev": "error"}, {"json": {"kind": "each", "list": "components", "paths": ["version"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component Version absent", "sev": "error"}, {"json": {"kind": "each", "list": "components", "paths": ["purl", "cpe", "bom-ref", "externalReferences.url"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component Identifiers absent (no purl, cpe or bom-ref) - cannot be matched to a CVE", "sev": "error"}, {"json": {"kind": "each", "list": "components", "paths": ["hashes.content"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component Hash absent: BSI TR-03183-2 requires a SHA-512 of the deployable component", "sev": "error"}, {"json": {"kind": "each", "list": "components", "paths": ["licenses"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component License absent", "sev": "error"}, {"json": {"kind": "each_bad", "list": "components", "path": "version", "bad": ["noassertion", "none", "unknown", "n/a", "*", "latest"], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component Version is a placeholder, not a version", "sev": "warn"}, {"json": {"kind": "each_bad", "list": "components", "path": "name", "bad": [""], "when": {"path": "bomFormat", "eq": "CycloneDX"}}, "message": "Component has no usable name", "sev": "warn"}, {"json": {"kind": "each", "list": "packages", "paths": ["supplier", "originator"], "when": {"path": "spdxVersion"}}, "message": "Component Producer absent (SPDX supplier / originator)", "sev": "error"}, {"json": {"kind": "each", "list": "packages", "paths": ["versionInfo"], "when": {"path": "spdxVersion"}}, "message": "Component Version absent (SPDX versionInfo)", "sev": "error"}, {"json": {"kind": "each", "list": "packages", "paths": ["checksums.checksumValue"], "when": {"path": "spdxVersion"}}, "message": "Component Hash absent (SPDX checksums) - BSI TR-03183-2 requires SHA-512", "sev": "error"}, {"json": {"kind": "each", "list": "packages", "paths": ["externalRefs.referenceLocator"], "when": {"path": "spdxVersion"}}, "message": "Component Identifiers absent (SPDX externalRefs: no purl or cpe)", "sev": "error"}, {"json": {"kind": "each", "list": "packages", "paths": ["licenseConcluded", "licenseDeclared"], "when": {"path": "spdxVersion"}}, "message": "Component License absent (SPDX licenseConcluded / licenseDeclared)", "sev": "error"}, {"json": {"kind": "each_bad", "list": "packages", "path": "supplier", "bad": ["noassertion"], "when": {"path": "spdxVersion"}}, "message": "Component Producer is NOASSERTION: the field exists but resolves to nothing", "sev": "warn"}, {"json": {"kind": "each_bad", "list": "packages", "path": "versionInfo", "bad": ["noassertion", "none", "unknown"], "when": {"path": "spdxVersion"}}, "message": "Component Version is NOASSERTION: the field exists but resolves to nothing", "sev": "warn"}, {"json": {"kind": "each", "paths": ["suppliedBy", "originatedBy"], "when": {"path": "@context"}, "list": "@graph", "filter": {"path": "type", "has": "software_Package"}}, "message": "Component Producer absent (SPDX 3 suppliedBy / originatedBy)", "sev": "error"}, {"json": {"kind": "each", "paths": ["packageVersion"], "when": {"path": "@context"}, "list": "@graph", "filter": {"path": "type", "has": "software_Package"}}, "message": "Component Version absent (SPDX 3 packageVersion)", "sev": "error"}, {"json": {"kind": "each", "paths": ["verifiedUsing"], "when": {"path": "@context"}, "list": "@graph", "filter": {"path": "type", "has": "software_Package"}}, "message": "Component Hash absent (SPDX 3 verifiedUsing)", "sev": "error"}, {"json": {"kind": "each", "paths": ["externalIdentifier"], "when": {"path": "@context"}, "list": "@graph", "filter": {"path": "type", "has": "software_Package"}}, "message": "Component Identifiers absent (SPDX 3 externalIdentifier: no packageUrl or cpe23)", "sev": "error"}];
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
  const cfg = vscode.workspace.getConfiguration('sbom-field-check-cra-2026');
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
  const _c = vscode.workspace.getConfiguration('sbom-field-check-cra-2026');
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
  const cfgFmt = String(vscode.workspace.getConfiguration('sbom-field-check-cra-2026').get('reportFormat')
    || vscode.workspace.getConfiguration('sbom-field-check-cra-2026').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'sbom-field-check-cra-2026-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'sbom-field-check-cra-2026-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
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
  try { lic.pullFeed(ctx, "sbom-field-check-cra-2026").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('sbom-field-check-cra-2026.audit_file', runCurrent);
  reg('sbom-field-check-cra-2026.list_rules', listRules);
  reg('sbom-field-check-cra-2026.show_report', showReport);
  reg('sbom-field-check-cra-2026.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('sbom-field-check-cra-2026.export_report', function () { return exportReport(ctx); });
  reg('sbom-field-check-cra-2026.ci_json', function () { return ciJson(ctx); });
  reg('sbom-field-check-cra-2026.watch_on_save', function () { return watchOnSave(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('sbom-field-check-cra-2026').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
