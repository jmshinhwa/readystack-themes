/* Maven Central Publish Gate — one brain, used by the VS Code extension and by the free web page. */
(function (root, factory) {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.CENTRAL_RULES;
  var api = factory(RULES);
  root.CENTRALGATE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (RULES) {
  'use strict';

  RULES = RULES || [];

  function lineOf(text, index) {
    var n = 1;
    for (var i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
    return n;
  }

  // Strip comments so a commented-out block never counts as present or as a violation.
  function decomment(text) {
    return text.replace(/<!--[\s\S]*?-->/g, function (m) {
      return m.replace(/[^\n]/g, ' ');
    });
  }

  // Direct children of <project>: depth 0 is <project> itself, depth 1 its own metadata.
  function directChildren(text) {
    var re = /<(\/?)([A-Za-z_][\w.\-]*)[^>]*?(\/?)>/g;
    var depth = -1, m, found = Object.create(null);
    while ((m = re.exec(text)) !== null) {
      var closing = m[1] === '/', selfClosing = m[3] === '/', name = m[2];
      if (name === 'project' && !closing) { depth = 0; continue; }
      if (depth < 0) continue;
      if (closing) { depth--; continue; }
      depth++;
      if (depth === 1) found[name] = (found[name] || m.index + 1);
      if (selfClosing) depth--;
    }
    return found;
  }

  function check(text, opts) {
    text = String(text == null ? '' : text);
    opts = opts || {};
    var today = opts.today || '';
    var src = decomment(text);
    var children = directChildren(src);
    var findings = [];

    RULES.forEach(function (rule) {
      if (rule.kind === 'forbid') {
        var re = new RegExp(rule.re, 'gi'), m;
        while ((m = re.exec(src)) !== null) {
          findings.push({
            check: rule.id,
            sev: rule.sev,
            msg: phrase(rule, today),
            line: lineOf(src, m.index)
          });
          if (m.index === re.lastIndex) re.lastIndex++;
        }
      } else if (rule.kind === 'require_child') {
        if (!children[rule.tag]) {
          findings.push({ check: rule.id, sev: rule.sev, msg: phrase(rule, today), line: 1 });
        }
      } else if (rule.kind === 'require_text') {
        if (src.toLowerCase().indexOf(String(rule.needle).toLowerCase()) === -1) {
          findings.push({ check: rule.id, sev: rule.sev, msg: phrase(rule, today), line: 1 });
        }
      }
    });

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  // The OSSRH line reads differently before and after the shutdown date, so `today` is load-bearing.
  function phrase(rule, today) {
    if (rule.id !== 'ossrh_endpoint' || !rule.ossrh_sunset) return rule.msg;
    if (today && today < rule.ossrh_sunset) {
      return 'OSSRH endpoint oss.sonatype.org — Sonatype closes it to releases on ' + rule.ossrh_sunset +
             '. Move the deploy to the Central Portal (' + rule.portal_host + ') before that date.';
    }
    return rule.msg;
  }

  return { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
});
