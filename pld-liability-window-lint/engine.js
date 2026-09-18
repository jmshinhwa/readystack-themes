/* EU Liability Window Lint — engine.
   Reads a CHANGELOG / release-notes file as text and reports the entries that
   will not carry a liability date, a support window or a named defect on
   9 December 2026, the day Directive (EU) 2024/2853 starts to apply. */

var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.PLD_RULES;

var PLD_APPLIES = '2026-12-09';

var RE_ISO = /\b(20\d{2})-(\d{2})-(\d{2})\b/;
var RE_ISO_G = /\b20\d{2}-\d{2}-\d{2}\b/g;
var RE_HEADING = /^\s{0,3}#{1,4}\s+\S/;
var RE_VERSION = /\bv?\d+\.\d+(?:\.\d+)?(?:[-+][0-9A-Za-z.\-]+)?\b/;
var RE_ID = /\b(?:CVE-\d{4}-\d{4,}|GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4})\b/i;
var RE_DISCLAIM = /\bas[\s\-]is\b|\bno warrant|\bwithout warrant|\bnot liable\b|\bno liability\b|\bat your own risk\b|\bdisclaims?\b[^.]{0,40}\b(?:liability|warrant)|\blimitation of liability\b|\bin no event shall\b/i;
var RE_SEC = /\b(?:security fix|security patch|security issue|vulnerabilit(?:y|ies)|exploit(?:ed|able)?|CVSS|RCE|XSS|CSRF|SSRF|SQL injection|buffer overflow|privilege escalation|remote code execution|denial of service|path traversal|auth bypass)\b/i;
var RE_SEC_BULLET = /^\s*(?:[-*+]|\d+\.)\s+.*\bsecurity\b/i;
var RE_OLD_DIR = /\b85\/374\/EEC\b|\b1999\/34\/EC\b|\bproduct liability directive\b[^.]{0,20}\b19\d{2}\b|\b1985\b[^.]{0,20}\bproduct liability\b/i;
var RE_PLD = /\b2024\/2853\b|\bproduct liability directive\b|\bnew pld\b|\bPLD\b/i;
var RE_SUPPORT = /\bsupported? until\b|\bsupport ends?\b|\bend[\s\-]of[\s\-]support\b|\bsecurity updates? until\b|\bsupport period\b|\bsupported through\b|\bEOL\b/i;
var RE_CONTACT = /security@|SECURITY\.md|\breport a vulnerabilit|\bvulnerability disclosure\b|\bsecurity policy\b|\bsecurity advisor(?:y|ies)\b|\bcoordinated disclosure\b/i;
var RE_ACTIVE = /\bactively maintained\b|\bactively supported\b|\bunder active development\b|\bfully supported\b|\bcurrently supported\b/i;
var RE_YANK = /\byank(?:ed)?\b|\bwithdrawn\b|\brevoked\b|\bretracted\b|\bunpublished\b/i;
var RE_REASON = /\bbecause\b|\breason\b|\bdue to\b|\bsee \b|\breplaced by\b|\bsuperseded by\b/i;
var RE_VAGUE = /\b(?:various|misc|miscellaneous|minor|assorted|several|small|general)\s+(?:bug\s?)?(?:fixes|fixups|improvements|changes|updates|tweaks|cleanups)\b|^\s*(?:[-*+]|\d+\.)\s*(?:bug\s?fixes|fixes|improvements|updates|cleanup)\s*\.?\s*$/i;
var RE_NOVERSION_HEAD = /^\s{0,3}#{1,4}\s*\[?\s*(?:latest|current|newest|recent|new release|this release|release|next)\s*\]?\s*[:\-]?\s*$/i;

function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

function ruleById(id) {
  for (var i = 0; i < RULES.length; i++) { if (RULES[i].id === id) return RULES[i]; }
  return {id: id, sev: 'med', title: id, why: ''};
}

function check(text, opts) {
  opts = opts || {};
  var today = opts.today || '2026-09-16';
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var findings = [];
  var seenSupport = false, seenContact = false;
  var newestRelease = null, activeClaimLine = 0, activeClaimText = '';

  function push(id, line, msg) {
    var r = ruleById(id);
    findings.push({check: id, sev: r.sev, msg: msg, line: line});
  }

  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i], line = i + 1, t = raw.trim();
    if (!t) continue;
    var isHeading = RE_HEADING.test(raw);
    var iso = raw.match(RE_ISO);
    var hasVersion = RE_VERSION.test(raw.replace(RE_ISO_G, ''));

    if (RE_SUPPORT.test(raw) && iso) seenSupport = true;
    if (RE_CONTACT.test(raw)) seenContact = true;

    /* 1. release heading with a version but no ISO date */
    if (isHeading && hasVersion && !iso && !/\bunreleased\b/i.test(raw)) {
      push('undated_release', line, 'Release "' + t.replace(/^#+\s*/, '').slice(0, 48) +
        '" has no YYYY-MM-DD date. The 10-year liability window in Art. 17(2) of Directive (EU) 2024/2853 runs from the day this version was placed on the market, and this line does not record it.');
    }

    /* 8. heading that names no version at all */
    if (isHeading && RE_NOVERSION_HEAD.test(raw)) {
      push('unversioned_heading', line, 'Heading "' + t.replace(/^#+\s*/, '') +
        '" names no version. Art. 4(1) makes each version you place on the market its own product, so this entry belongs to nothing you can identify.');
    }

    /* 2. disclaimer wording that Art. 15 voids */
    if (RE_DISCLAIM.test(raw)) {
      push('void_disclaimer', line, 'Liability-exclusion wording here does not bind an injured person: Art. 15 of Directive (EU) 2024/2853 makes contractual limits void, and from ' +
        PLD_APPLIES + ' that is the law in every Member State.');
    }

    /* 3. security work with no CVE/GHSA */
    if (!isHeading && (RE_SEC.test(raw) || RE_SEC_BULLET.test(raw)) && !RE_ID.test(raw)) {
      push('security_fix_without_cve', line, 'Security change with no CVE or GHSA identifier. Art. 11(2)(c) keeps a defect in your control when it turns on updates you supplied, and this line names no defect to point at.');
    }

    /* 4. repealed directive */
    if (RE_OLD_DIR.test(raw)) {
      push('old_directive_citation', line, 'This cites Directive 85/374/EEC, which Directive (EU) 2024/2853 repeals with effect from ' +
        PLD_APPLIES + '. Software was not a product under the old text; it is one under Art. 4(1) of the new one.');
    }

    /* 5. wrong applicability date next to the PLD */
    if (RE_PLD.test(raw)) {
      var stripped = raw.replace(/2024\/2853/g, ' ').replace(/2024\/2847/g, ' ').replace(/85\/374\/EEC/gi, ' ');
      var years = stripped.match(/\b20\d{2}\b/g) || [];
      var isos = stripped.match(RE_ISO_G) || [];
      var bad = null;
      if (years.length && years.indexOf('2026') === -1) bad = years[0];
      for (var k = 0; k < isos.length; k++) { if (isos[k].slice(0, 4) === '2026' && isos[k] !== PLD_APPLIES) bad = isos[k]; }
      if (bad) {
        push('deadline_drift', line, 'This puts the product-liability change at ' + bad +
          '. Member States apply Directive (EU) 2024/2853 from ' + PLD_APPLIES + '; a reader who trusts this line plans around the wrong quarter.');
      }
    }

    /* 10. withdrawal with no reason */
    if (RE_YANK.test(raw) && !RE_ID.test(raw) && !RE_REASON.test(raw)) {
      push('yanked_without_reason', line, 'A version is withdrawn here with no reason and no identifier. Under Art. 8 a court may order this record to be disclosed, and Art. 10(2) lets it presume the product was defective when the record does not answer.');
    }

    /* 12. vague fix language */
    if (!isHeading && RE_VAGUE.test(raw)) {
      push('vague_fix_language', line, '"' + t.replace(/^[-*+\s]+/, '').slice(0, 40) +
        '" names nothing that was fixed. Art. 10(2) allows a presumption of defectiveness when ordered evidence is not produced, and this entry produces none.');
    }

    /* 11. future-dated release + newest release tracking */
    if (iso) {
      var d = iso[0];
      var isReleaseLine = isHeading || /\brelease[ds]?\b|\bpublish(?:ed)?\b|\bshipped\b/i.test(raw);
      if (isHeading && (!newestRelease || d > newestRelease)) newestRelease = d;
      if (isReleaseLine && d > today) {
        push('future_date', line, 'Dated ' + d + ', which is after today (' + today +
          '). The placing-on-the-market date starts the 10-year window in Art. 17(2), so a typo here moves the window.');
      }
    }

    if (!activeClaimLine && RE_ACTIVE.test(raw)) { activeClaimLine = line; activeClaimText = t.slice(0, 40); }
  }

  /* 9. active-support claim the release history does not back */
  if (activeClaimLine && newestRelease) {
    var gap = daysBetween(newestRelease, today);
    if (gap > 365) {
      push('stale_support_claim', activeClaimLine, 'This file claims active support, but the newest dated release is ' +
        newestRelease + ' — ' + gap + ' days ago. Art. 11(2)(c) treats the update you did not ship as being within your control.');
    }
  }

  /* 6. no dated support window */
  if (!seenSupport) {
    push('no_support_window', 1, 'No dated support window in this file. Annex II(8) of the Cyber Resilience Act (EU) 2024/2847 requires the end date of the support period in the information supplied to users, and that date is also the evidence Art. 11(2)(c) PLD asks for.');
  }

  /* 7. no reporting contact */
  if (!seenContact) {
    push('no_security_contact', 1, 'No vulnerability-reporting contact in this file. Annex II(2) CRA requires a single point of contact, and since 11 September 2026 an actively exploited vulnerability must reach ENISA within 24 hours.');
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return {findings: findings};
}

var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length};
if (typeof module !== 'undefined') { module.exports = API; }
if (typeof window !== 'undefined') { window.PLDENGINE = API; }
