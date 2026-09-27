/*
 * CSAF Advisory Check - engine
 *
 * One brain, two homes: Node (the VS Code extension) and the browser (the free web page).
 * Input  : the text of a JSON file
 * Output : {findings: [{check, sev, msg, line}]}
 *
 * The 43 conformance tests of CSAF 2.0 section 6.1 live in csaf.js (loaded unchanged).
 * Files without a "csaf_version" field are not CSAF documents and give no findings,
 * exactly as the extension always skipped them.
 */
(function () {
  'use strict';

  var CSAF = (typeof module !== 'undefined') ? require('./csaf.js') : window.CSAF;
  var RULES = CSAF.TESTS;

  // The raw csaf.js result with the extension's two settings applied:
  // opts.base (default true) = also report the CSAF Base required fields · opts.skip = test numbers to leave out
  function raw(text, opts) {
    opts = opts || {};
    var skip = (opts.skip || []).map(String);
    var res = CSAF.check(text, { base: opts.base !== false });
    if (skip.length) res.findings = res.findings.filter(function (f) { return skip.indexOf(f.test) < 0; });
    return res;
  }

  function check(text, opts) {
    opts = opts || {};
    if (!CSAF.looksLikeCsaf(text)) return {findings: [], notCsaf: true};
    var res = raw(text, opts);
    return {
      parseError: res.parseError,
      findings: res.findings.map(function (f) {
        return {check: f.test, sev: 'error', line: f.line || 1, msg: f.test + ' ' + f.title + ': ' + f.msg};
      })
    };
  }

  var API = {engine: {check: check}, raw: raw, CSAF: CSAF, RULES: RULES, RULE_COUNT: RULES.length};

  if (typeof module !== 'undefined') { module.exports = API; }
  if (typeof window !== 'undefined') { window.CSAFENGINE = API; }
})();
