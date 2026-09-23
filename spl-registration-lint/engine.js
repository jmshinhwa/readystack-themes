// SPL Registration Lint - engine. Same file runs in Node and in the browser.
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.SPL_RULES;

var DUNS_ROOT = '1.3.6.1.4.1.519.1';
var LOINC = '2.16.840.1.113883.6.1';
var REG_CODE = '51725-0';
var UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function byId(id) {
  for (var i = 0; i < RULES.length; i++) { if (RULES[i].id === id) return RULES[i]; }
  return {id: id, sev: 'err', title: id, fix: ''};
}

function lineOf(text, idx) {
  if (idx < 0) return 1;
  return text.slice(0, idx).split('\n').length;
}

function attr(tag, name) {
  var m = tag.match(new RegExp(name + '\\s*=\\s*"([^"]*)"'));
  return m ? m[1] : null;
}

// Everything before the first <author> is the SPL document header.
function headerOf(text) {
  var i = text.indexOf('<author');
  return i === -1 ? text : text.slice(0, i);
}

function findTag(region, name) {
  var m = region.match(new RegExp('<' + name + '\\b[^>]*>'));
  return m ? {tag: m[0], idx: m.index} : null;
}

function isRealDate(v) {
  if (!/^[0-9]{8}$/.test(v)) return false;
  var y = +v.slice(0, 4), mo = +v.slice(4, 6), d = +v.slice(6, 8);
  if (mo < 1 || mo > 12 || d < 1) return false;
  var last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return d <= last;
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function check(text, opts) {
  opts = opts || {};
  var today = opts.today || '2026-09-21';
  var todayYear = +today.slice(0, 4);
  var findings = [];
  function add(id, msg, line) {
    var r = byId(id);
    findings.push({check: id, sev: r.sev, msg: msg, line: line});
  }

  var head = headerOf(text);
  var headLines = head.split('\n').length;

  // --- document <code> ---
  var code = findTag(head, 'code');
  if (!code) {
    add('doc_type', 'No document <code> element. ' + byId('doc_type').fix, 1);
  } else {
    var ln = lineOf(text, code.idx);
    var cv = attr(code.tag, 'code');
    var cs = attr(code.tag, 'codeSystem');
    if (cv !== REG_CODE) {
      add('doc_type', 'Document type is "' + (cv || '(none)') + '", not ' + REG_CODE + '. ' + byId('doc_type').fix, ln);
    }
    if (cs !== LOINC) {
      add('loinc_system', 'codeSystem is "' + (cs || '(none)') + '", not the LOINC OID ' + LOINC + '. ' + byId('loinc_system').fix, ln);
    }
  }

  // --- <id> and <setId> ---
  var did = findTag(head, 'id');
  var sid = findTag(head, 'setId');
  var dRoot = did ? attr(did.tag, 'root') : null;
  var sRoot = sid ? attr(sid.tag, 'root') : null;
  if (!did || !UUID_RE.test(dRoot || '')) {
    add('doc_uuid', 'Document <id root> is "' + (dRoot || '(missing)') + '", which is not a UUID. ' + byId('doc_uuid').fix, did ? lineOf(text, did.idx) : 1);
  }
  if (!sid || !UUID_RE.test(sRoot || '')) {
    add('doc_uuid', 'Document <setId root> is "' + (sRoot || '(missing)') + '", which is not a UUID. ' + byId('doc_uuid').fix, sid ? lineOf(text, sid.idx) : 1);
  } else if (dRoot && sRoot.toLowerCase() === dRoot.toLowerCase()) {
    add('doc_uuid', '<setId> repeats the <id> UUID, so the FDA ESG reads this as a new registration instead of a new version. ' + byId('doc_uuid').fix, lineOf(text, sid.idx));
  }

  // --- <versionNumber> ---
  var ver = findTag(head, 'versionNumber');
  var vv = ver ? attr(ver.tag, 'value') : null;
  if (!ver || !/^[1-9][0-9]*$/.test(vv || '')) {
    add('version_number', 'versionNumber is "' + (vv === null ? '(missing)' : vv) + '", not a positive integer. ' + byId('version_number').fix, ver ? lineOf(text, ver.idx) : 1);
  }

  // --- <effectiveTime> : format, window, lapse ---
  var eff = findTag(head, 'effectiveTime');
  var ev = eff ? attr(eff.tag, 'value') : null;
  var effLine = eff ? lineOf(text, eff.idx) : 1;
  if (!eff || !isRealDate(ev || '')) {
    add('effective_date', 'effectiveTime is "' + (ev === null ? '(missing)' : ev) + '", not a valid YYYYMMDD date. ' + byId('effective_date').fix, effLine);
  } else {
    var y = +ev.slice(0, 4), mo = +ev.slice(4, 6);
    if (mo < 10) {
      add('reg_window', 'effectiveTime ' + ev + ' is month ' + mo + ', before the October 1 - December 31 annual registration window. ' + byId('reg_window').fix, effLine);
    }
    if (y < todayYear) {
      var lapsed = daysBetween(new Date(y + '-12-31T00:00:00Z'), new Date(today + 'T00:00:00Z'));
      add('lapse_clock', 'This registration is dated ' + ev + ', so it expired on ' + y + '-12-31, ' + lapsed + ' days ago. ' + byId('lapse_clock').fix, effLine);
    }
  }

  // --- D-U-N-S numbers on every organization ---
  var idTags = text.match(/<id\b[^>]*\/?>/g) || [];
  var dunsSeen = 0;
  var cursor = 0;
  for (var i = 0; i < idTags.length; i++) {
    var t = idTags[i];
    var at = text.indexOf(t, cursor);
    cursor = at + 1;
    if (attr(t, 'root') !== DUNS_ROOT) continue;
    dunsSeen++;
    var ext = attr(t, 'extension');
    if (!/^[0-9]{9}$/.test(ext || '')) {
      add('duns_format', 'D-U-N-S number "' + (ext === null ? '(missing)' : ext) + '" is not nine digits. ' + byId('duns_format').fix, lineOf(text, at));
    }
  }
  if (dunsSeen === 0) {
    add('duns_root', 'No <id root="' + DUNS_ROOT + '"> anywhere in the file. ' + byId('duns_root').fix, headLines);
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return {findings: findings};
}

var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};
if (typeof module !== 'undefined') { module.exports = API; }
if (typeof window !== 'undefined') { window.SPLENGINE = API; }
