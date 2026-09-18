/* jest-snapshot-pii-audit — one brain, used by the VS Code extension and by the free web page.
   Rules live in rules.json; this file only decides what counts as a hit. */
(function () {
  'use strict';

  var DOC = (typeof module !== 'undefined' && typeof require !== 'undefined')
    ? require('./rules.json')
    : (typeof window !== 'undefined' ? window.JSPII_RULES : {});

  var RULES = Array.isArray(DOC) ? DOC : ((DOC && DOC.rules) || []);
  var RULE_COUNT = RULES.length;

  var PLACEHOLDER = /\b(?:test|testing|tester|foo|bar|baz|qux|sample|example|placeholder|dummy|fake|mock|mocked|lorem|ipsum|redacted|anon|anonymous|unknown|tbd|todo|jane|john|doe|user|username|string|somewhere|nowhere)\b/;

  function looksPlaceholder(v) {
    if (v == null) return true;
    var s = String(v).trim();
    if (s.length < 2) return true;
    if (/^[\[<]/.test(s) || s.indexOf('{{') === 0 || s.indexOf('${') === 0) return true;
    if (/^[0\-\s.]+$/.test(s)) return true;
    if (/^x{3,}$/i.test(s) || /^\*+$/.test(s)) return true;
    if (PLACEHOLDER.test(s.toLowerCase())) return true;
    return false;
  }

  function redact(s) {
    s = String(s);
    if (s.length <= 6) return s.charAt(0) + '…' + s.charAt(s.length - 1);
    return s.slice(0, 3) + '…' + s.slice(-2);
  }

  function luhnOk(digits) {
    var sum = 0, alt = false, i;
    for (i = digits.length - 1; i >= 0; i--) {
      var d = digits.charCodeAt(i) - 48;
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function ibanOk(raw) {
    var s = raw.replace(/\s+/g, '').toUpperCase();
    if (s.length < 15 || s.length > 34) return false;
    var re = s.slice(4) + s.slice(0, 4);
    var expanded = '', i;
    for (i = 0; i < re.length; i++) {
      var c = re.charAt(i);
      if (c >= 'A' && c <= 'Z') expanded += (c.charCodeAt(0) - 55);
      else if (c >= '0' && c <= '9') expanded += c;
      else return false;
    }
    var rem = 0;
    for (i = 0; i < expanded.length; i++) rem = (rem * 10 + (expanded.charCodeAt(i) - 48)) % 97;
    return rem === 1;
  }

  function publicIp(a, b, c, d) {
    var o = [a, b, c, d];
    for (var i = 0; i < 4; i++) { if (!(o[i] >= 0 && o[i] <= 255)) return false; }
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;   /* RFC 5737 doc range */
    if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    return true;
  }

  function hitsFor(rule, line) {
    var out = [], m, re;
    if (rule.kind === 'regex' || rule.kind === 'named_value') {
      re = new RegExp(rule.re, 'g');
      var allow = rule.allow ? new RegExp(rule.allow) : null;
      while ((m = re.exec(line)) !== null) {
        if (m[0] === '') { re.lastIndex++; continue; }
        if (rule.kind === 'named_value') {
          if (!looksPlaceholder(m[2])) out.push(m[1] + ' = "' + redact(m[2]) + '"');
        } else if (!allow || !allow.test(m[0])) {
          out.push(redact(m[0]));
        }
        if (out.length >= 3) break;
      }
      return out;
    }
    if (rule.kind === 'luhn') {
      re = /\b(?:\d[ -]?){12,18}\d\b/g;
      while ((m = re.exec(line)) !== null) {
        var digits = m[0].replace(/[ -]/g, '');
        if (digits.length < 13 || digits.length > 19) continue;
        if (/^(\d)\1+$/.test(digits)) continue;
        if (!/^(?:4|5[1-5]|2[2-7]|3[47]|6(?:011|5))/.test(digits)) continue;
        if (luhnOk(digits)) out.push(redact(digits));
        if (out.length >= 3) break;
      }
      return out;
    }
    if (rule.kind === 'iban') {
      re = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g;
      while ((m = re.exec(line)) !== null) {
        if (ibanOk(m[0])) out.push(redact(m[0]));
        if (out.length >= 3) break;
      }
      return out;
    }
    if (rule.kind === 'ip') {
      re = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g;
      while ((m = re.exec(line)) !== null) {
        if (publicIp(+m[1], +m[2], +m[3], +m[4])) out.push(m[0]);
        if (out.length >= 3) break;
      }
      return out;
    }
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    var lines = String(text == null ? '' : text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line || line.length > 4000) continue;
      if (/^\s*\/\/\s*Jest Snapshot v\d/.test(line)) continue;
      for (var r = 0; r < RULES.length; r++) {
        var rule = RULES[r];
        var hits = hitsFor(rule, line);
        if (!hits.length) continue;
        findings.push({
          check: rule.id,
          sev: rule.sev,
          line: i + 1,
          msg: rule.article + ' — ' + rule.title + '. ' + rule.msg.replace('{m}', hits.join(', '))
        });
      }
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var engine = { check: check };
  var API = { engine: engine, RULES: RULES, RULE_COUNT: RULE_COUNT, check: check };

  if (typeof window !== 'undefined') { window.JSPIIENGINE = API; }
  else if (typeof globalThis !== 'undefined') { globalThis.JSPIIENGINE = API; }
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
})();
