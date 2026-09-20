/* View in Browser — Publish Leak Audit
 * One brain, two homes: this exact file runs in the VS Code extension and in the free web page.
 */
(function (root) {
  var isNode = (typeof module !== 'undefined' && module.exports);
  var RULES = isNode ? require('./rules.json') : root.VIL_RULES;

  function lineOf(text, index) {
    var n = 1;
    for (var i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
    return n;
  }

  function attrOf(tag, name) {
    var m = new RegExp('\\b' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(tag);
    if (!m) return null;
    return m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] || ''));
  }

  function scanRegex(rule, text, out) {
    var re = new RegExp(rule.re, 'gi');
    var m;
    while ((m = re.exec(text)) !== null) {
      out.push({ check: rule.id, sev: rule.sev, msg: rule.msg, line: lineOf(text, m.index) });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  function scanTagMissingAttr(rule, text, out) {
    var re = new RegExp('<' + rule.tag + '\\b[^>]*>', 'gi');
    var m;
    while ((m = re.exec(text)) !== null) {
      var tag = m[0];
      var trigger = attrOf(tag, rule.when_attr);
      if (trigger === null) continue;
      if (rule.when_re && !new RegExp(rule.when_re, 'i').test(trigger)) continue;
      var have = attrOf(tag, rule.require_attr);
      var ok = rule.require_attr_re
        ? (have !== null && new RegExp(rule.require_attr_re, 'i').test(have))
        : (have !== null && have !== '');
      if (!ok) out.push({ check: rule.id, sev: rule.sev, msg: rule.msg, line: lineOf(text, m.index) });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  function scanYearLtToday(rule, text, opts, out) {
    var year = parseInt(String((opts && opts.today) || '').slice(0, 4), 10);
    if (!year) return;
    var re = new RegExp(rule.re, 'gi');
    var m;
    while ((m = re.exec(text)) !== null) {
      if (parseInt(m[1], 10) < year) {
        out.push({ check: rule.id, sev: rule.sev, msg: rule.msg, line: lineOf(text, m.index) });
      }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  function check(text, opts) {
    text = String(text == null ? '' : text);
    opts = opts || {};
    var out = [];
    for (var i = 0; i < RULES.length; i++) {
      var rule = RULES[i];
      if (rule.kind === 'tag_missing_attr') scanTagMissingAttr(rule, text, out);
      else if (rule.kind === 'year_lt_today') scanYearLtToday(rule, text, opts, out);
      else scanRegex(rule, text, out);
    }
    out.sort(function (a, b) { return a.line - b.line || a.check.localeCompare(b.check); });
    return { findings: out };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.VILENGINE = api;
  if (isNode) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
