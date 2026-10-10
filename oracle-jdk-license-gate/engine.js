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
   * s186 E6 2026-10-10 — the dates are Oracle's own, read that day:
   *   oracle.com JDK FAQ licence table: "Java 21 Oracle JDK, releases through September 2026 = NFTC";
   *   blogs.oracle.com "JDK 21 approaches end-of-permissive license" (2026-08-14): updates from the October 2026
   *   Critical Patch Update are Java SE OTN licensed; oracle.com/security-alerts: that CPU is on 20 October 2026.
   *   So JDK 21 builds released through September 2026 stay NFTC; the ones from 2026-10-20 are OTN (not free in
   *   production). A line that pulls "the latest" Oracle JDK 21 crosses that line on 2026-10-20 without anyone editing it.
   *   (The old table said "closed 2026-09-16" - one month early; corrected here.)
   * JDK 17: releases after September 2024 (17.0.13+, October 2024 CPU = 2024-10-15) are OTN.
   * JDK 25: NFTC until October 2028 (projected: one year after the next LTS). JDK 8 / 11: OTN only.
   */
  var WINDOW = {
    '8':  {terms: 'OTN',  free_until: null},
    '11': {terms: 'OTN',  free_until: null},
    '17': {terms: 'NFTC', free_until: '2024-10-15'},
    '21': {terms: 'NFTC', free_until: '2026-10-20'},
    '25': {terms: 'NFTC', free_until: '2028-10-17', projected: true}
  };

  var VERSION_RE = /(?:^|[^\d.]|JDK\.|jdk-)(8|11|17|21|25)(?![\d])/;   // s173: winget `Oracle.JDK.21` pins its version after a dot

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
    if (left <= 0) {
      return {sev: 'err', text: 'since the ' + w.free_until + ' Critical Patch Update, new Oracle JDK ' + ver + ' updates are under the Java SE OTN license (not free for production): a line that pulls the latest Oracle JDK ' + ver + ' now gets a paid-licence build' + (-left ? ' (' + (-left) + ' days ago)' : ' (today)') + '; builds released before that date stay under the No-Fee Terms but get no free security fixes'};
    }
    var tail = w.projected ? ' (projected from the next LTS date)' : '';
    return {sev: 'warn', text: 'Oracle JDK ' + ver + ' builds are still under the No-Fee Terms, but from the ' + w.free_until + ' Critical Patch Update, ' + left + ' days from now, new Oracle JDK ' + ver + ' updates are under the Java SE OTN license (not free for production) - a line that pulls the latest Oracle JDK ' + ver + ' switches licence that day without anyone editing it' + tail};
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
        if (RULES[r].unless_near && nearHas(lines, i, RULES[r].unless_near)) continue;
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

  function nearHas(lines, i, src) {
    var re = new RegExp(src, 'i'), j;
    for (j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 6); j++) { if (re.test(lines[j])) return true; }
    return false;
  }

  /*
   * s173 2026-09-30 - the Java map. [measured] people find this extension by typing "temurin" / "corretto" /
   * "adoptium" in the Marketplace search: they are moving to (or already on) a free build, so most of their
   * files are clean and the license check alone gave them nothing to read. The map answers what they came for:
   * which Java does each part of this project pull, and what is the free line for each place.
   * NOTES are facts about non-Oracle lines (deprecated names). They are NOT license findings and are never
   * counted by check(): an `openjdk:` image is not an Oracle bill.
   */
  var NOTES = [
    {id: 'setup_java_adopt_removed', re: "distribution\\s*:\\s*['\"]?adopt(-hotspot)?['\"]?\\s*$",
     say: "setup-java removed the legacy AdoptOpenJDK distributions; its README says: use temurin instead of adopt or adopt-hotspot",
     fix: 'distribution: temurin'},
    {id: 'setup_java_adopt_openj9', re: "distribution\\s*:\\s*['\"]?adopt-openj9",
     say: "setup-java removed the legacy AdoptOpenJDK distributions; its README says: use semeru instead of adopt-openj9",
     fix: 'distribution: semeru'},
    {id: 'docker_openjdk_deprecated', re: "^\\s*FROM\\s+(--platform=\\S+\\s+)?openjdk:",
     say: "the Docker Official Image `openjdk` is officially deprecated (Docker Hub notice); only Early Access tags have been updated since July 2022",
     fix: 'FROM eclipse-temurin:21-jdk'}
  ];

  var PIN_RE = [
    {kind: 'GitHub Actions setup-java', re: /distribution\s*:\s*['"]?([A-Za-z0-9_${}. -]+?)['"]?\s*$/},
    {kind: 'Gradle toolchain', re: /JvmVendorSpec\.([A-Z_]+)/},
    {kind: 'SDKMAN (.sdkmanrc)', re: /^\s*java\s*=\s*\S*-([a-z]+)\s*$/},
    {kind: 'asdf / mise (.tool-versions)', re: /^\s*java\s+([a-z-]+?)-\d/},
    {kind: 'Dev container', re: /"jdkDistro"\s*:\s*"([a-z]+)"/},
    {kind: 'Maven toolchain', re: /<vendor>\s*([^<]+?)\s*<\/vendor>/}
  ];
  var IMAGES = [
    ['eclipse-temurin', 'temurin'], ['amazoncorretto', 'corretto'], ['azul/zulu-openjdk', 'zulu'], ['bellsoft/liberica', 'liberica'],
    ['ibm-semeru-runtimes', 'semeru'], ['sapmachine', 'sapmachine'], ['mcr.microsoft.com/openjdk', 'microsoft'],
    ['container-registry.oracle.com/java', 'oracle'], ['container-registry.oracle.com/graalvm', 'oracle graalvm'],
    ['ghcr.io/graalvm', 'graalvm community'], ['adoptopenjdk', 'adoptopenjdk'], ['openjdk', 'openjdk (deprecated image)']
  ];

  function pins(text) {
    var lines = String(text == null ? '' : text).split(/\r?\n/), out = [], i, k, m, img;
    for (i = 0; i < lines.length; i++) {
      if (/^\s*#/.test(lines[i])) continue;
      for (k = 0; k < PIN_RE.length; k++) {
        m = PIN_RE[k].re.exec(lines[i]);
        if (m) out.push({line: i + 1, kind: PIN_RE[k].kind, vendor: String(m[1]).trim().toLowerCase(), raw: lines[i].trim().slice(0, 120)});
      }
      m = /^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)/i.exec(lines[i]);
      if (m) {
        img = m[1].toLowerCase();
        for (k = 0; k < IMAGES.length; k++) {
          if (img.indexOf(IMAGES[k][0]) >= 0) { out.push({line: i + 1, kind: 'Docker base image', vendor: IMAGES[k][1], raw: lines[i].trim().slice(0, 120)}); break; }
        }
      }
    }
    return out;
  }

  function notes(text) {
    var lines = String(text == null ? '' : text).split(/\r?\n/), out = [], i, k;
    for (i = 0; i < lines.length; i++) {
      if (/^\s*#/.test(lines[i])) continue;
      for (k = 0; k < NOTES.length; k++) {
        if (new RegExp(NOTES[k].re, 'i').test(lines[i])) out.push({note: NOTES[k].id, line: i + 1, msg: NOTES[k].say, fix: NOTES[k].fix});
      }
    }
    return out;
  }

  /* The free lines, one per place a project can choose its Java. Each string is the vendor's own coordinate. */
  var LINES = [
    {kind: 'GitHub Actions setup-java', temurin: 'distribution: temurin', corretto: 'distribution: corretto'},
    {kind: 'Docker base image', temurin: 'FROM eclipse-temurin:21-jdk', corretto: 'FROM amazoncorretto:21'},
    {kind: 'Gradle toolchain', temurin: 'vendor = JvmVendorSpec.ADOPTIUM', corretto: 'vendor = JvmVendorSpec.AMAZON'},
    {kind: 'SDKMAN (.sdkmanrc)', temurin: 'java=<version>-tem', corretto: 'java=<version>-amzn'},
    {kind: 'asdf / mise (.tool-versions)', temurin: 'java temurin-<version>', corretto: 'java corretto-<version>'},
    {kind: 'Dev container', temurin: '"jdkDistro": "tem"', corretto: '"jdkDistro": "amzn"'},
    {kind: 'This machine (Windows)', temurin: 'winget install EclipseAdoptium.Temurin.21.JDK', corretto: null},
    {kind: 'This machine (macOS)', temurin: 'brew install --cask temurin@21', corretto: null},
    {kind: 'This machine (SDKMAN)', temurin: 'sdk install java <version>-tem', corretto: 'sdk install java <version>-amzn'}
  ];

  var API = {engine: {check: check, pins: pins, notes: notes}, RULES: RULES, RULE_COUNT: RULES.length, WINDOW: WINDOW, NOTES: NOTES, LINES: LINES};

  if (typeof module !== 'undefined') { module.exports = API; }
  if (typeof window !== 'undefined') { window.OJLGENGINE = API; }
})();
