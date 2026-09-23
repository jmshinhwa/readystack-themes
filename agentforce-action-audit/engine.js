/* Agentforce Action Audit - one engine, runs in VS Code and in the browser. */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : window.AFA_RULES;

  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

  var DISCLOSURE = /(\bA\.?I\b)|artificial intelligence|automated (assistant|agent)|virtual (agent|assistant)|not a human|chatbot/i;
  var PLACEHOLDER = /\bTODO\b|\bFIXME\b|lorem ipsum|\[insert|<insert|your company name|\bXXXX\b/i;
  var EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  var PHONE = /\+\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;
  var NATID = /\b\d{3}-\d{2}-\d{4}\b/;
  var AMP = /&(?![A-Za-z#][A-Za-z0-9]{0,8};)/g;

  function flat(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text || '');
    var today = String(opts.today || '');
    var findings = [];

    function lineOf(idx) {
      if (idx < 0) idx = 0;
      return src.slice(0, idx).split('\n').length;
    }
    function add(id, idx, extra) {
      var r = BY_ID[id];
      if (!r) return;
      var sev = r.sev;
      if (id === 'no_ai_disclosure' && today && today < '2026-08-02') sev = 'warn';
      findings.push({
        check: id,
        sev: sev,
        msg: extra ? r.msg + ' (' + extra + ')' : r.msg,
        line: lineOf(idx)
      });
    }

    /* instruction blocks */
    var instrs = [];
    var blockRe = /<genAiPluginInstructions>([\s\S]*?)<\/genAiPluginInstructions>/g;
    var m;
    while ((m = blockRe.exec(src)) !== null) {
      instrs.push({ body: m[1], index: m.index });
    }
    var outside = src.replace(blockRe, '');

    function tagIn(hay, name) {
      var re = new RegExp('<' + name + '>([\\s\\S]*?)</' + name + '>');
      var hit = re.exec(hay);
      return hit ? flat(hit[1]) : null;
    }
    function idxOf(name) {
      var at = src.indexOf('<' + name + '>');
      return at < 0 ? 0 : at;
    }

    var rootAt = src.search(/<GenAiPlugin[\s>]|<GenAiPlannerBundle[\s>]|<GenAiPlanner[\s>]/);
    if (rootAt < 0) rootAt = 0;

    /* 1-2 top level identity */
    if (!tagIn(outside, 'masterLabel')) add('missing_master_label', rootAt);
    if (!tagIn(outside, 'description')) add('missing_description', rootAt);

    /* 3-4 scope */
    var scope = tagIn(outside, 'scope');
    if (scope === null) {
      add('missing_scope', rootAt);
    } else if (scope.length < 40) {
      add('scope_too_short', idxOf('scope'), scope.length + ' characters');
    }

    /* 5 instructions present */
    if (instrs.length === 0) add('no_instructions', rootAt);

    /* 6 duplicate instruction developerName */
    var seen = {};
    for (var a = 0; a < instrs.length; a++) {
      var dn = tagIn(instrs[a].body, 'developerName');
      if (!dn) continue;
      if (seen[dn]) add('duplicate_instruction_name', instrs[a].index, dn);
      seen[dn] = true;
    }

    /* prompt text = every instruction description + scope */
    var prompt = [];
    for (var b = 0; b < instrs.length; b++) {
      var d = tagIn(instrs[b].body, 'description');
      prompt.push({ text: d || '', index: instrs[b].index });
    }
    if (scope) prompt.push({ text: scope, index: idxOf('scope') });
    var promptAll = prompt.map(function (p) { return p.text; }).join(' \n ');

    /* 7 placeholder, 10 pii, 11 insecure endpoint - per instruction */
    for (var c = 0; c < prompt.length; c++) {
      var t = prompt[c].text;
      if (PLACEHOLDER.test(t)) add('instruction_placeholder', prompt[c].index);
      var pii = EMAIL.exec(t) || PHONE.exec(t) || NATID.exec(t);
      if (pii) add('pii_in_instruction', prompt[c].index, pii[0]);
      if (/http:\/\//i.test(t)) add('insecure_endpoint', prompt[c].index);
    }

    /* 8 function never referenced */
    var fnRe = /<functionName>([\s\S]*?)<\/functionName>/g;
    var f;
    while ((f = fnRe.exec(src)) !== null) {
      var name = flat(f[1]);
      if (!name) continue;
      var loose = name.replace(/_/g, ' ');
      if (promptAll.indexOf(name) === -1 && promptAll.toLowerCase().indexOf(loose.toLowerCase()) === -1) {
        add('function_not_referenced', f.index, name);
      }
    }

    /* 9 AI disclosure */
    if (instrs.length > 0 && !DISCLOSURE.test(promptAll)) add('no_ai_disclosure', instrs[0].index);

    /* 12 unescaped ampersand - anywhere in the file */
    var amp;
    AMP.lastIndex = 0;
    while ((amp = AMP.exec(src)) !== null) add('unescaped_ampersand', amp.index);

    /* 13 stale apiVersion */
    var av = /<apiVersion>\s*([0-9]+(?:\.[0-9]+)?)\s*<\/apiVersion>/.exec(src);
    if (av && parseFloat(av[1]) < 62) add('stale_api_version', av.index, av[1]);

    findings.sort(function (x, y) { return x.line - y.line; });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.AFAENGINE = API;
})();
