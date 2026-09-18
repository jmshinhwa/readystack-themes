// ⛔손으로 고치지 마라 — vsix_build.py 가 찍는다.
const vscode = require('vscode');
const path = require('path');
const lic = require('./license.js');
const S = {"run": "Watching this file on every save.", "done": "Retirement findings are listed in the output panel.", "nothing_found": "No retired API version and no removed sfdx command in this file.", "need_key": "Full version: scans the whole repository, rewrites the removed sfdx commands in place, and emits CI JSON that fails the build. $29 once - one licence key per person or team seat - 7-day full refund. Salesforce DevOps platforms that flag this start at $79/user/month (Copado Essentials Basic) and $200/user/month (Gearset).", "key_ok": "Licence accepted - repository scan, quick fix, CI output and export are open.", "key_bad": "That key did not validate. Check it in your Polar customer portal, or get one.", "buy": "Get the full version - $29", "enter_key": "Enter licence key", "paste": "Paste sfdx-project.json, package.xml, a *-meta.xml file, or your deploy script here", "check": "Check for retirements", "extra_rules": "Extra rules of your own, checked alongside the 81 that ship inside."};
const PAID = ["workspace_scan", "quick_fix", "ci_json", "export_report"];

function out() {
  if (!out._c) out._c = vscode.window.createOutputChannel('SFDX Retirement Lint');
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
  const _min = _ORD[String(vscode.workspace.getConfiguration('sfdx-retirement-lint').get('min_severity')
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
const RULES = [{"pattern": "<(?:apiVersion|version)>\\s*(?:2[1-9]|30)\\.0\\s*</", "flags": "", "message": "API version in this metadata file (21.0-30.0) was RETIRED in Summer '25 - REST now returns 410 GONE, SOAP 500 UNSUPPORTED_API_VERSION, Bulk 400 InvalidVersion. Raise it to 41.0 or later.", "sev": "error", "fix": "Edit the <apiVersion>/<version> element to 41.0 or later - a version bump is a judgement call, so this one is listed for a manual edit rather than rewritten for you."}, {"pattern": "\"sourceApiVersion\"\\s*:\\s*\"(?:2[1-9]|30)\\.0\"", "flags": "", "message": "API version pinned in sfdx-project.json sourceApiVersion (21.0-30.0) was RETIRED in Summer '25 - REST now returns 410 GONE, SOAP 500 UNSUPPORTED_API_VERSION, Bulk 400 InvalidVersion. Raise it to 41.0 or later.", "sev": "error", "fix": "Set sourceApiVersion to 41.0 or later, then re-run the deploy."}, {"pattern": "/services/data/v(?:2[1-9]|30)\\.0\\b", "flags": "", "message": "API version in this REST endpoint path (21.0-30.0) was RETIRED in Summer '25 - REST now returns 410 GONE, SOAP 500 UNSUPPORTED_API_VERSION, Bulk 400 InvalidVersion. Raise it to 41.0 or later.", "sev": "error", "fix": "Change the /services/data/vNN.0/ segment to a supported version."}, {"pattern": "/services/(?:Soap/[uc]|async)/(?:2[1-9]|30)\\.0\\b", "flags": "", "message": "API version in this SOAP/Bulk endpoint path (21.0-30.0) was RETIRED in Summer '25 - REST now returns 410 GONE, SOAP 500 UNSUPPORTED_API_VERSION, Bulk 400 InvalidVersion. Raise it to 41.0 or later.", "sev": "error", "fix": "Change the endpoint version segment to a supported version."}, {"pattern": "version\\s*[:=]\\s*[\\'\"](?:2[1-9]|30)\\.0[\\'\"]", "flags": "", "message": "API version as a client-config version literal (21.0-30.0) was RETIRED in Summer '25 - REST now returns 410 GONE, SOAP 500 UNSUPPORTED_API_VERSION, Bulk 400 InvalidVersion. Raise it to 41.0 or later.", "sev": "error", "fix": "Update the API version your client library pins (jsforce version, simple-salesforce version, etc.)."}, {"pattern": "<(?:apiVersion|version)>\\s*(?:3[1-9]|40)\\.0\\s*</", "flags": "", "message": "API version in this metadata file (31.0-40.0) is deprecated and retires in Summer '28 - every integration must be on 41.0 or later by then. Plan the bump now.", "sev": "warn", "fix": "Bump the <apiVersion>/<version> element before the Summer '28 retirement."}, {"pattern": "\"sourceApiVersion\"\\s*:\\s*\"(?:3[1-9]|40)\\.0\"", "flags": "", "message": "API version pinned in sfdx-project.json sourceApiVersion (31.0-40.0) is deprecated and retires in Summer '28 - every integration must be on 41.0 or later by then. Plan the bump now.", "sev": "warn", "fix": "Bump sourceApiVersion before Summer '28."}, {"pattern": "/services/data/v(?:3[1-9]|40)\\.0\\b", "flags": "", "message": "API version in this REST endpoint path (31.0-40.0) is deprecated and retires in Summer '28 - every integration must be on 41.0 or later by then. Plan the bump now.", "sev": "warn", "fix": "Bump the /services/data/vNN.0/ segment before Summer '28."}, {"pattern": "/services/Soap/[uc]/(?:(?:3[1-9]|40)\\.0|(?:4[1-9]|5[0-9]|6[0-4])\\.0)\\b", "flags": "", "message": "SOAP endpoint pinned to API 31.0-64.0: the SOAP login() call is retired in Summer '27 for these versions. Move to OAuth 2.0, or to a 65.0+ endpoint.", "sev": "warn", "fix": "Switch this integration to OAuth 2.0 before Summer '27, or raise the endpoint to 65.0+."}, {"pattern": "\"sourceApiVersion\"\\s*:\\s*\"(?:4[1-9]|5[0-9]|6[0-4])\\.0\"", "flags": "", "message": "sourceApiVersion is supported but behind the platform: Summer '26 is API 67.0 (Spring '26 was 66.0, Winter '27 is 68.0). Newer metadata fields are invisible to this project.", "sev": "info", "fix": "Optional: raise sourceApiVersion toward 67.0 to see current metadata fields."}, {"pattern": "force\\:source\\:deploy(?![:\\w])", "flags": "", "message": "force:source:deploy was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project deploy start\".", "sev": "error", "fix": "Replace with sf project deploy start.", "replace": "project deploy start"}, {"pattern": "force\\:source\\:push(?![:\\w])", "flags": "", "message": "force:source:push was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project deploy start\".", "sev": "error", "fix": "Replace with sf project deploy start.", "replace": "project deploy start"}, {"pattern": "force\\:source\\:retrieve(?![:\\w])", "flags": "", "message": "force:source:retrieve was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project retrieve start\".", "sev": "error", "fix": "Replace with sf project retrieve start.", "replace": "project retrieve start"}, {"pattern": "force\\:source\\:pull(?![:\\w])", "flags": "", "message": "force:source:pull was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project retrieve start\".", "sev": "error", "fix": "Replace with sf project retrieve start.", "replace": "project retrieve start"}, {"pattern": "force\\:source\\:delete(?![:\\w])", "flags": "", "message": "force:source:delete was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project delete source\".", "sev": "error", "fix": "Replace with sf project delete source.", "replace": "project delete source"}, {"pattern": "force\\:source\\:status(?![:\\w])", "flags": "", "message": "force:source:status was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project retrieve preview\".", "sev": "error", "fix": "Replace with sf project retrieve preview.", "replace": "project retrieve preview"}, {"pattern": "force\\:source\\:convert(?![:\\w])", "flags": "", "message": "force:source:convert was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project convert source\".", "sev": "error", "fix": "Replace with sf project convert source.", "replace": "project convert source"}, {"pattern": "force\\:source\\:manifest\\:create(?![:\\w])", "flags": "", "message": "force:source:manifest:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project generate manifest\".", "sev": "error", "fix": "Replace with sf project generate manifest.", "replace": "project generate manifest"}, {"pattern": "force\\:mdapi\\:deploy(?![:\\w])", "flags": "", "message": "force:mdapi:deploy was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project deploy start --metadata-dir\".", "sev": "error", "fix": "Replace with sf project deploy start --metadata-dir.", "replace": "project deploy start --metadata-dir"}, {"pattern": "force\\:mdapi\\:retrieve(?![:\\w])", "flags": "", "message": "force:mdapi:retrieve was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project retrieve start --target-metadata-dir\".", "sev": "error", "fix": "Replace with sf project retrieve start --target-metadata-dir.", "replace": "project retrieve start --target-metadata-dir"}, {"pattern": "force\\:mdapi\\:convert(?![:\\w])", "flags": "", "message": "force:mdapi:convert was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project convert mdapi\".", "sev": "error", "fix": "Replace with sf project convert mdapi.", "replace": "project convert mdapi"}, {"pattern": "force\\:mdapi\\:listmetadata(?![:\\w])", "flags": "", "message": "force:mdapi:listmetadata was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org list metadata\".", "sev": "error", "fix": "Replace with sf org list metadata.", "replace": "org list metadata"}, {"pattern": "force\\:mdapi\\:describemetadata(?![:\\w])", "flags": "", "message": "force:mdapi:describemetadata was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org list metadata-types\".", "sev": "error", "fix": "Replace with sf org list metadata-types.", "replace": "org list metadata-types"}, {"pattern": "force\\:org\\:create(?![:\\w])", "flags": "", "message": "force:org:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org create scratch\".", "sev": "error", "fix": "Replace with sf org create scratch.", "replace": "org create scratch"}, {"pattern": "force\\:org\\:delete(?![:\\w])", "flags": "", "message": "force:org:delete was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org delete scratch\".", "sev": "error", "fix": "Replace with sf org delete scratch.", "replace": "org delete scratch"}, {"pattern": "force\\:org\\:display(?![:\\w])", "flags": "", "message": "force:org:display was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org display\".", "sev": "error", "fix": "Replace with sf org display.", "replace": "org display"}, {"pattern": "force\\:org\\:list(?![:\\w])", "flags": "", "message": "force:org:list was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org list\".", "sev": "error", "fix": "Replace with sf org list.", "replace": "org list"}, {"pattern": "force\\:org\\:open(?![:\\w])", "flags": "", "message": "force:org:open was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org open\".", "sev": "error", "fix": "Replace with sf org open.", "replace": "org open"}, {"pattern": "force\\:auth\\:web\\:login(?![:\\w])", "flags": "", "message": "force:auth:web:login was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org login web\".", "sev": "error", "fix": "Replace with sf org login web.", "replace": "org login web"}, {"pattern": "force\\:auth\\:jwt\\:grant(?![:\\w])", "flags": "", "message": "force:auth:jwt:grant was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org login jwt\".", "sev": "error", "fix": "Replace with sf org login jwt.", "replace": "org login jwt"}, {"pattern": "force\\:auth\\:sfdxurl\\:store(?![:\\w])", "flags": "", "message": "force:auth:sfdxurl:store was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org login sfdx-url\".", "sev": "error", "fix": "Replace with sf org login sfdx-url.", "replace": "org login sfdx-url"}, {"pattern": "force\\:auth\\:device\\:login(?![:\\w])", "flags": "", "message": "force:auth:device:login was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org login device\".", "sev": "error", "fix": "Replace with sf org login device.", "replace": "org login device"}, {"pattern": "force\\:auth\\:logout(?![:\\w])", "flags": "", "message": "force:auth:logout was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org logout\".", "sev": "error", "fix": "Replace with sf org logout.", "replace": "org logout"}, {"pattern": "force\\:apex\\:test\\:run(?![:\\w])", "flags": "", "message": "force:apex:test:run was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf apex run test\".", "sev": "error", "fix": "Replace with sf apex run test.", "replace": "apex run test"}, {"pattern": "force\\:apex\\:test\\:report(?![:\\w])", "flags": "", "message": "force:apex:test:report was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf apex get test\".", "sev": "error", "fix": "Replace with sf apex get test.", "replace": "apex get test"}, {"pattern": "force\\:apex\\:execute(?![:\\w])", "flags": "", "message": "force:apex:execute was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf apex run\".", "sev": "error", "fix": "Replace with sf apex run.", "replace": "apex run"}, {"pattern": "force\\:apex\\:log\\:get(?![:\\w])", "flags": "", "message": "force:apex:log:get was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf apex get log\".", "sev": "error", "fix": "Replace with sf apex get log.", "replace": "apex get log"}, {"pattern": "force\\:apex\\:log\\:list(?![:\\w])", "flags": "", "message": "force:apex:log:list was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf apex list log\".", "sev": "error", "fix": "Replace with sf apex list log.", "replace": "apex list log"}, {"pattern": "force\\:apex\\:log\\:tail(?![:\\w])", "flags": "", "message": "force:apex:log:tail was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf apex tail log\".", "sev": "error", "fix": "Replace with sf apex tail log.", "replace": "apex tail log"}, {"pattern": "force\\:apex\\:class\\:create(?![:\\w])", "flags": "", "message": "force:apex:class:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf apex generate class\".", "sev": "error", "fix": "Replace with sf apex generate class.", "replace": "apex generate class"}, {"pattern": "force\\:apex\\:trigger\\:create(?![:\\w])", "flags": "", "message": "force:apex:trigger:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf apex generate trigger\".", "sev": "error", "fix": "Replace with sf apex generate trigger.", "replace": "apex generate trigger"}, {"pattern": "force\\:data\\:soql\\:query(?![:\\w])", "flags": "", "message": "force:data:soql:query was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf data query\".", "sev": "error", "fix": "Replace with sf data query.", "replace": "data query"}, {"pattern": "force\\:data\\:tree\\:import(?![:\\w])", "flags": "", "message": "force:data:tree:import was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf data import tree\".", "sev": "error", "fix": "Replace with sf data import tree.", "replace": "data import tree"}, {"pattern": "force\\:data\\:tree\\:export(?![:\\w])", "flags": "", "message": "force:data:tree:export was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf data export tree\".", "sev": "error", "fix": "Replace with sf data export tree.", "replace": "data export tree"}, {"pattern": "force\\:data\\:bulk\\:upsert(?![:\\w])", "flags": "", "message": "force:data:bulk:upsert was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf data upsert bulk\".", "sev": "error", "fix": "Replace with sf data upsert bulk.", "replace": "data upsert bulk"}, {"pattern": "force\\:data\\:bulk\\:delete(?![:\\w])", "flags": "", "message": "force:data:bulk:delete was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf data delete bulk\".", "sev": "error", "fix": "Replace with sf data delete bulk.", "replace": "data delete bulk"}, {"pattern": "force\\:data\\:record\\:create(?![:\\w])", "flags": "", "message": "force:data:record:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf data create record\".", "sev": "error", "fix": "Replace with sf data create record.", "replace": "data create record"}, {"pattern": "force\\:data\\:record\\:get(?![:\\w])", "flags": "", "message": "force:data:record:get was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf data get record\".", "sev": "error", "fix": "Replace with sf data get record.", "replace": "data get record"}, {"pattern": "force\\:data\\:record\\:update(?![:\\w])", "flags": "", "message": "force:data:record:update was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf data update record\".", "sev": "error", "fix": "Replace with sf data update record.", "replace": "data update record"}, {"pattern": "force\\:data\\:record\\:delete(?![:\\w])", "flags": "", "message": "force:data:record:delete was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf data delete record\".", "sev": "error", "fix": "Replace with sf data delete record.", "replace": "data delete record"}, {"pattern": "force\\:user\\:permset\\:assign(?![:\\w])", "flags": "", "message": "force:user:permset:assign was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org assign permset\".", "sev": "error", "fix": "Replace with sf org assign permset.", "replace": "org assign permset"}, {"pattern": "force\\:user\\:password\\:generate(?![:\\w])", "flags": "", "message": "force:user:password:generate was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org generate password\".", "sev": "error", "fix": "Replace with sf org generate password.", "replace": "org generate password"}, {"pattern": "force\\:user\\:create(?![:\\w])", "flags": "", "message": "force:user:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org create user\".", "sev": "error", "fix": "Replace with sf org create user.", "replace": "org create user"}, {"pattern": "force\\:user\\:display(?![:\\w])", "flags": "", "message": "force:user:display was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org display user\".", "sev": "error", "fix": "Replace with sf org display user.", "replace": "org display user"}, {"pattern": "force\\:package\\:install(?![:\\w])", "flags": "", "message": "force:package:install was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf package install\".", "sev": "error", "fix": "Replace with sf package install.", "replace": "package install"}, {"pattern": "force\\:package\\:create(?![:\\w])", "flags": "", "message": "force:package:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf package create\".", "sev": "error", "fix": "Replace with sf package create.", "replace": "package create"}, {"pattern": "force\\:package\\:version\\:create(?![:\\w])", "flags": "", "message": "force:package:version:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf package version create\".", "sev": "error", "fix": "Replace with sf package version create.", "replace": "package version create"}, {"pattern": "force\\:package\\:version\\:promote(?![:\\w])", "flags": "", "message": "force:package:version:promote was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf package version promote\".", "sev": "error", "fix": "Replace with sf package version promote.", "replace": "package version promote"}, {"pattern": "force\\:package\\:version\\:list(?![:\\w])", "flags": "", "message": "force:package:version:list was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf package version list\".", "sev": "error", "fix": "Replace with sf package version list.", "replace": "package version list"}, {"pattern": "force\\:project\\:create(?![:\\w])", "flags": "", "message": "force:project:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf project generate\".", "sev": "error", "fix": "Replace with sf project generate.", "replace": "project generate"}, {"pattern": "force\\:lightning\\:component\\:create(?![:\\w])", "flags": "", "message": "force:lightning:component:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf lightning generate component\".", "sev": "error", "fix": "Replace with sf lightning generate component.", "replace": "lightning generate component"}, {"pattern": "force\\:lightning\\:app\\:create(?![:\\w])", "flags": "", "message": "force:lightning:app:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf lightning generate app\".", "sev": "error", "fix": "Replace with sf lightning generate app.", "replace": "lightning generate app"}, {"pattern": "force\\:visualforce\\:page\\:create(?![:\\w])", "flags": "", "message": "force:visualforce:page:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf visualforce generate page\".", "sev": "error", "fix": "Replace with sf visualforce generate page.", "replace": "visualforce generate page"}, {"pattern": "force\\:visualforce\\:component\\:create(?![:\\w])", "flags": "", "message": "force:visualforce:component:create was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf visualforce generate component\".", "sev": "error", "fix": "Replace with sf visualforce generate component.", "replace": "visualforce generate component"}, {"pattern": "force\\:schema\\:sobject\\:describe(?![:\\w])", "flags": "", "message": "force:schema:sobject:describe was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf sobject describe\".", "sev": "error", "fix": "Replace with sf sobject describe.", "replace": "sobject describe"}, {"pattern": "force\\:schema\\:sobject\\:list(?![:\\w])", "flags": "", "message": "force:schema:sobject:list was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf sobject list\".", "sev": "error", "fix": "Replace with sf sobject list.", "replace": "sobject list"}, {"pattern": "force\\:limits\\:api\\:display(?![:\\w])", "flags": "", "message": "force:limits:api:display was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf org list limits\".", "sev": "error", "fix": "Replace with sf org list limits.", "replace": "org list limits"}, {"pattern": "force\\:config\\:set(?![:\\w])", "flags": "", "message": "force:config:set was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf config set\".", "sev": "error", "fix": "Replace with sf config set.", "replace": "config set"}, {"pattern": "force\\:config\\:get(?![:\\w])", "flags": "", "message": "force:config:get was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf config get\".", "sev": "error", "fix": "Replace with sf config get.", "replace": "config get"}, {"pattern": "force\\:config\\:list(?![:\\w])", "flags": "", "message": "force:config:list was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf config list\".", "sev": "error", "fix": "Replace with sf config list.", "replace": "config list"}, {"pattern": "force\\:alias\\:set(?![:\\w])", "flags": "", "message": "force:alias:set was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf alias set\".", "sev": "error", "fix": "Replace with sf alias set.", "replace": "alias set"}, {"pattern": "force\\:alias\\:list(?![:\\w])", "flags": "", "message": "force:alias:list was removed from the Salesforce CLI on 2024-11-06 and no longer runs under sf (v2). Use \"sf alias list\".", "sev": "error", "fix": "Replace with sf alias list.", "replace": "alias list"}, {"pattern": "\\bsfdx-cli\\b", "flags": "", "message": "The sfdx-cli npm package is frozen at v7.209.6 and stopped receiving weekly CLI updates. Install @salesforce/cli (sf v2) instead.", "sev": "error", "fix": "Replace the sfdx-cli dependency or install line with @salesforce/cli.", "replace": "@salesforce/cli"}, {"pattern": "--targetusername(?![\\w-])", "flags": "", "message": "The --targetusername flag was renamed in sf (v2). Use --target-org.", "sev": "warn", "fix": "Rename the flag to --target-org.", "replace": "--target-org"}, {"pattern": "--targetdevhubusername(?![\\w-])", "flags": "", "message": "The --targetdevhubusername flag was renamed in sf (v2). Use --target-dev-hub.", "sev": "warn", "fix": "Rename the flag to --target-dev-hub.", "replace": "--target-dev-hub"}, {"pattern": "--apiversion(?![\\w-])", "flags": "", "message": "The --apiversion flag was renamed in sf (v2). Use --api-version.", "sev": "warn", "fix": "Rename the flag to --api-version.", "replace": "--api-version"}, {"pattern": "--sourcepath(?![\\w-])", "flags": "", "message": "The --sourcepath flag was renamed in sf (v2). Use --source-dir.", "sev": "warn", "fix": "Rename the flag to --source-dir.", "replace": "--source-dir"}, {"pattern": "--checkonly(?![\\w-])", "flags": "", "message": "The --checkonly flag was renamed in sf (v2). Use --dry-run.", "sev": "warn", "fix": "Rename the flag to --dry-run.", "replace": "--dry-run"}, {"pattern": "--testlevel(?![\\w-])", "flags": "", "message": "The --testlevel flag was renamed in sf (v2). Use --test-level.", "sev": "warn", "fix": "Rename the flag to --test-level.", "replace": "--test-level"}, {"pattern": "--resultformat(?![\\w-])", "flags": "", "message": "The --resultformat flag was renamed in sf (v2). Use --result-format.", "sev": "warn", "fix": "Rename the flag to --result-format.", "replace": "--result-format"}, {"pattern": "--loglevel(?![\\w-])", "flags": "", "message": "The --loglevel flag no longer exists in sf (v2); it is dropped, not renamed. Delete it or set SF_LOG_LEVEL in the environment instead.", "sev": "warn", "fix": "Delete the --loglevel flag and use the SF_LOG_LEVEL environment variable."}];
function scan(text, fileName) {
  const lines = String(text).split(/\r?\n/);
  const cfg = vscode.workspace.getConfiguration('sfdx-retirement-lint');
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
async function paidGate(ctx) { return await lic.ensure(vscode, ctx, S); }

async function scanWorkspace(ctx) {
  if (!(await paidGate(ctx))) return;
  // ★설정을 읽는다 — max_files · exclude_glob. ⛔전에는 박혀 있어서 설정이 거짓말이었다 (s126)
  const _c = vscode.workspace.getConfiguration('sfdx-retirement-lint');
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

async function ciJson(ctx) {
  if (!(await paidGate(ctx))) return;
  const ed = vscode.window.activeTextEditor;
  const hits = ed ? scan(ed.document.getText(), ed.document.fileName) : [];
  const ws = vscode.workspace.workspaceFolders;
  if (!ws || !ws.length) { vscode.window.showWarningMessage(S.nothing_found); return; }
  const uri = vscode.Uri.joinPath(ws[0].uri, 'sfdx-retirement-lint-report.json');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify({ hits: hits }, null, 2), 'utf8'));
  vscode.window.showInformationMessage(S.done + ' → ' + uri.fsPath);
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
  const cfgFmt = String(vscode.workspace.getConfiguration('sfdx-retirement-lint').get('reportFormat')
    || vscode.workspace.getConfiguration('sfdx-retirement-lint').get('report_format') || '').toUpperCase();
  const pick = ['CSV', 'JSON', 'HTML'].indexOf(cfgFmt) >= 0 ? cfgFmt
    : await vscode.window.showQuickPick(['CSV', 'JSON', 'HTML'], { placeHolder: S.run });
  if (!pick) return;
  const body = pick === 'CSV' ? csv : (pick === 'JSON' ? JSON.stringify(flat, null, 2) : html);
  const uri = vscode.Uri.joinPath(ws[0].uri, 'sfdx-retirement-lint-report.' + pick.toLowerCase());
  await vscode.workspace.fs.writeFile(uri, Buffer.from(body, 'utf8'));
  vscode.window.showInformationMessage(S.done + ' \u2192 ' + uri.fsPath);
}

function activate(ctx) {
  try { lic.pullFeed(ctx, "sfdx-retirement-lint").then(function (f) { if (f && Array.isArray(f.rules)) globalThis.__yjFeed = f; }).catch(function () {}); } catch (e) {}
  const reg = function (id, fn) { ctx.subscriptions.push(vscode.commands.registerCommand(id, fn)); };
  reg('sfdx-retirement-lint.audit_file', runCurrent);
  reg('sfdx-retirement-lint.audit_selection', runSelection);
  reg('sfdx-retirement-lint.list_rules', listRules);
  reg('sfdx-retirement-lint.workspace_scan', function () { return scanWorkspace(ctx); });
  reg('sfdx-retirement-lint.quick_fix', function () { return quickFix(ctx); });
  reg('sfdx-retirement-lint.ci_json', function () { return ciJson(ctx); });
  reg('sfdx-retirement-lint.export_report', function () { return exportReport(ctx); });
  // ★설정을 읽는다 — show_on_start. ⛔전에는 안 읽어서 설정이 거짓말이었다 (s126)
  if (vscode.workspace.getConfiguration('sfdx-retirement-lint').get('show_on_start') === true) {
    if (typeof runCurrent === 'function') { try { runCurrent(ctx); } catch (e) { /* 열린 파일이 없으면 조용히 */ } }
  }
}
function deactivate() {
  if (typeof watchOnSave === 'function' && watchOnSave._d) watchOnSave._d.dispose();
}
module.exports = { activate: activate, deactivate: deactivate };
