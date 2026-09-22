/*
 * Oracle JDK License Gate - engine
 *
 * One brain, two homes: Node (the VS Code extension) and the browser (the free web page).
 * Input  : the text of a Dockerfile, a CI workflow, a shell script or an .sdkmanrc
 * Output : {findings: [{check, sev, msg, line}]}
 *
 * The license question is never "is this Java version still supported".
 * It is "on today's date, does this line still fall inside Oracle's free window".
 * So every finding is computed against opts.today, and the answer moves when the date moves.
 */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.OJLG_RULES;

  /*
   * Oracle's No-Fee Terms and Conditions cover a Java LTS release until one year
   * after the next LTS release ships. JDK 21 shipped 2023-09-19, JDK 25 shipped
   * 2025-09-16, so the JDK 21 free window closed 2026-09-16.
   * JDK 8 and JDK 11 never had an NFTC window: they are Oracle Technology Network
   * builds, free for development and test only.
   */
  var WINDOW = {
    '8':  {terms: 'OTN',  free_until: null},
    '11': {terms: 'OTN',  free_until: null},
    '17': {terms: 'NFTC', free_until: '2024-09-19'},
    '21': {terms: 'NFTC', free_until: '2026-09-16'},
    '25': {terms: 'NFTC', free_until: '2028-09-15', projected: true}
  };

  var VERSION_RE = /(?:^|[^\d.])(8|11|17|21|25)(?![\d])/;

  function days(a, b) {
    return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  }

  function versionNear(lines, i) {
    var order = [0, 1, -1, 2, -2, 3, -3], k, j, m;
    for (k = 0; k < order.length; k++) {
      j = i + order[k];
      if (j < 0 || j >= lines.length) continue;
      m = VERSION_RE.exec(lines[j]);
      if (m) return m[1];
    }
    return null;
  }

  function windowStatus(ver, today) {
    if (!ver) {
      return {sev: 'warn', text: 'no Java version pinned on or near this line, so the free window cannot be read - pin one'};
    }
    var w = WINDOW[ver];
    if (!w) {
      return {sev: 'warn', text: 'Java ' + ver + ' is not a long term support release; Oracle bills non-LTS use the same way'};
    }
    if (w.terms === 'OTN') {
      return {sev: 'err', text: 'Java ' + ver + ' is an Oracle Technology Network build: free for development and test only, never for production'};
    }
    var left = days(today, w.free_until);
    if (left < 0) {
      return {sev: 'err', text: 'the free NFTC window for Java ' + ver + ' closed on ' + w.free_until + ', ' + (-left) + ' days ago'};
    }
    var tail = w.projected ? ' (projected from the next LTS date)' : '';
    return {sev: 'warn', text: 'the free NFTC window for Java ' + ver + ' closes on ' + w.free_until + ', ' + left + ' days from now' + tail};
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || new Date().toISOString().slice(0, 10);
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    var findings = [];
    var i, r, re, ver, st;

    for (i = 0; i < lines.length; i++) {
      if (/^\s*#/.test(lines[i])) continue;
      for (r = 0; r < RULES.length; r++) {
        re = new RegExp(RULES[r].re, 'i');
        if (!re.test(lines[i])) continue;
        ver = versionNear(lines, i);
        st = windowStatus(ver, today);
        findings.push({
          check: RULES[r].id,
          sev: st.sev,
          line: i + 1,
          msg: RULES[r].title + ' - ' + RULES[r].basis + '. On ' + today + ': ' + st.text +
               '. Free swap: ' + RULES[r].fix
        });
      }
    }
    return {findings: findings};
  }

  var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length, WINDOW: WINDOW};

  if (typeof module !== 'undefined') { module.exports = API; }
  if (typeof window !== 'undefined') { window.OJLGENGINE = API; }
})();
