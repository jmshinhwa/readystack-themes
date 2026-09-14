/* security.txt Lint - RFC 9116 + EU Cyber Resilience Act reporting contact point.
   Same engine runs in Node (extension) and in the browser (free web page). */
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.STX_RULES;

var KNOWN = ['acknowledgments', 'canonical', 'contact', 'csaf', 'encryption',
             'expires', 'hiring', 'policy', 'preferred-languages'];
var ONCE = ['expires', 'preferred-languages', 'canonical'];
var RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
var DAY = 86400000;

function ruleOf(id) {
  for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i];
  return {id: id, sev: 'warn', msg: id};
}

function finding(id, line, extra) {
  var r = ruleOf(id);
  return {check: id, sev: r.sev, line: line, msg: extra ? r.msg + ' ' + extra : r.msg};
}

function check(text, opts) {
  opts = opts || {};
  var today = opts.today || new Date().toISOString().slice(0, 10);
  var now = Date.parse(today + 'T00:00:00Z');
  var lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
  var findings = [];
  var seen = {};
  var inSignature = false;

  for (var i = 0; i < lines.length; i++) {
    var ln = i + 1;
    var line = lines[i].trim();
    if (!line || line.charAt(0) === '#') continue;
    if (/^-----BEGIN PGP SIGNATURE-----$/.test(line)) { inSignature = true; continue; }
    if (/^-----(BEGIN|END) PGP/.test(line) || /^Hash:/i.test(line)) continue;
    if (inSignature) continue;
    var m = line.match(/^([A-Za-z][A-Za-z0-9-]*)[ \t]*:[ \t]*(\S.*)$/);
    if (!m) { findings.push(finding('malformed_line', ln, '(' + line.slice(0, 40) + ')')); continue; }
    var field = m[1].toLowerCase();
    var value = m[2].trim();
    if (!seen[field]) seen[field] = [];
    seen[field].push({line: ln, value: value});
    if (KNOWN.indexOf(field) === -1) {
      findings.push(finding('unknown_field', ln, '(' + m[1] + ')'));
      continue;
    }
    if (/^http:\/\//i.test(value)) findings.push(finding('insecure_url', ln, '(' + m[1] + ')'));
  }

  for (var k = 0; k < ONCE.length; k++) {
    var hits = seen[ONCE[k]] || [];
    for (var d = 1; d < hits.length; d++) {
      findings.push(finding('field_duplicate', hits[d].line, '(' + ONCE[k] + ', seen ' + (d + 1) + ' times)'));
    }
  }

  var contacts = seen['contact'] || [];
  if (!contacts.length) {
    findings.push(finding('contact_missing', 1));
  } else {
    for (var c = 0; c < contacts.length; c++) {
      if (!/^(mailto:|tel:|https:\/\/)/i.test(contacts[c].value)) {
        findings.push(finding('contact_not_uri', contacts[c].line, '(' + contacts[c].value + ')'));
      }
    }
  }

  var exp = (seen['expires'] || [])[0];
  if (!exp) {
    findings.push(finding('expires_missing', 1));
  } else if (!RFC3339.test(exp.value)) {
    findings.push(finding('expires_invalid', exp.line, '(' + exp.value + ')'));
  } else {
    var days = Math.round((Date.parse(exp.value) - now) / DAY);
    if (days < 0) findings.push(finding('expires_past', exp.line, '(expired ' + (-days) + ' days ago, on ' + exp.value.slice(0, 10) + ')'));
    else if (days > 365) findings.push(finding('expires_over_year', exp.line, '(' + days + ' days out)'));
  }

  var canon = seen['canonical'] || [];
  for (var q = 0; q < canon.length; q++) {
    if (!/\/\.well-known\/security\.txt$/.test(canon[q].value)) {
      findings.push(finding('canonical_wellknown', canon[q].line, '(' + canon[q].value + ')'));
    }
  }

  if (!(seen['policy'] || []).length) findings.push(finding('policy_missing', 1));

  var csaf = seen['csaf'] || [];
  for (var s = 0; s < csaf.length; s++) {
    if (!/provider-metadata\.json$/.test(csaf[s].value)) {
      findings.push(finding('csaf_not_provider', csaf[s].line, '(' + csaf[s].value + ')'));
    }
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return {findings: findings};
}

var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.STXENGINE = API;
