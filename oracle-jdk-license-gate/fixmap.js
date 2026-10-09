// s184 W1 2026-10-09 — the WORK, not a report. Oracle JDK -> Eclipse Temurin line rewrites.
// [실측 10/9] people use this extension 268×/week from 52 countries; the paid part was a dated report nobody bought.
// ★Only mechanical, safe swaps are rewritten. Anything that needs a human choice stays "manual" with the exact how-to.
//   Sources (read 2026-10-09): actions/setup-java README (distribution: temurin) · Gradle JvmVendorSpec.ADOPTIUM ·
//   devcontainers java feature jdkDistro "tem" (SDKMAN id) · Homebrew cask temurin@N · winget EclipseAdoptium.Temurin.N.JDK ·
//   Docker Official Image eclipse-temurin:<major>-jdk.
// Pure: fixLine(line) -> {after, rule} | {manual, rule, how} | null · fixText(text) -> {text, applied[], manual[]}
(function () {
  'use strict';
  var MAJORS = { '8': 1, '11': 1, '17': 1, '21': 1, '25': 1 };
  var EDITS = [
    { rule: 'setup_java_oracle', re: /(distribution\s*:\s*)(['"]?)oracle\2(?=\s*(#.*)?$)/i, to: function (m, a, q) { return a + q + 'temurin' + q; } },
    { rule: 'gradle_toolchain_oracle', re: /JvmVendorSpec\.ORACLE\b/, to: function () { return 'JvmVendorSpec.ADOPTIUM'; } },
    { rule: 'devcontainer_oracle_distro', re: /("jdkDistro"\s*:\s*")oracle(")/, to: function (m, a, b) { return a + 'tem' + b; } },
    { rule: 'brew_oracle_jdk', re: /\boracle-jdk(@(\d+))?\b/, ok: function (m) { return !m[2] || MAJORS[m[2]]; }, to: function (m, at, v) { return 'temurin' + (v ? '@' + v : ''); } },
    { rule: 'winget_oracle_jdk', re: /\bOracle\.JDK\.(\d+)\b/, ok: function (m) { return MAJORS[m[1]] && m[1] !== '8'; }, to: function (m, v) { return 'EclipseAdoptium.Temurin.' + v + '.JDK'; } },
    { rule: 'oracle_registry_image', re: /container-registry\.oracle\.com\/java\/(?:jdk|openjdk):(\d+)[\w.-]*/, ok: function (m) { return MAJORS[m[1]]; }, to: function (m, v) { return 'eclipse-temurin:' + v + '-jdk'; } }
  ];
  var MANUAL = {
    setup_java_graalvm: 'GraalVM: keep Oracle GraalVM only with a licence, or move the job to graalvm/setup-graalvm with distribution: graalvm-community.',
    oracle_download_url: 'Replace the download with the Adoptium API (https://api.adoptium.net/v3/binary/latest/<major>/ga/<os>/<arch>/jdk/hotspot/normal/eclipse) and update the checksum step.',
    otn_license_cookie: 'Delete the oraclelicense cookie header and download an OpenJDK build (Temurin) that needs no licence header.',
    sdkman_oracle_vendor: 'Pick the Temurin build of the same major: sdk list java | grep tem, then sdk install java <version>-tem (patch numbers differ per vendor).',
    sdkmanrc_oracle_vendor: 'Set java=<version>-tem with a version that exists: sdk list java | grep tem (patch numbers differ per vendor).',
    asdf_oracle_vendor: 'Set java temurin-<version> with a version that exists: asdf list-all java | grep temurin.',
    oracle_linux_jdk_pkg: 'Install the OpenJDK package of the same major instead (e.g. microdnf install -y java-21-openjdk-headless) and check JAVA_HOME.',
    oracle_java_installer_ppa: 'Remove the PPA and add the Adoptium apt repository, then apt-get install -y temurin-<major>-jdk.',
    oracle_license_env_accept: 'Remove the variable once the base image is an OpenJDK build (eclipse-temurin:<major>-jdk).',
    oracle_setup_java_action: 'Replace oracle-actions/setup-java with actions/setup-java@v4 and distribution: temurin (keep java-version).',
    maven_toolchain_oracle: 'Change <vendor> to temurin AND add the matching Temurin JDK to ~/.m2/toolchains.xml on every machine and CI runner.',
    choco_oracle_jdk: 'Use winget install EclipseAdoptium.Temurin.<major>.JDK (or choco install temurin<major>).',
    oracle_registry_image: 'Use eclipse-temurin:<major>-jdk (pick the major from the Oracle tag).',
    brew_oracle_jdk: 'Use brew install --cask temurin@<major>.',
    winget_oracle_jdk: 'Use winget install EclipseAdoptium.Temurin.<major>.JDK (JDK 8 is EclipseAdoptium.Temurin.8.JDK only on x64).'
  };
  var RPM_HOW = 'This Dockerfile installs with yum/dnf/microdnf (Oracle Linux). Use eclipse-temurin:<major>-jdk-ubi9-minimal (RHEL family, microdnf) and replace yum/dnf with microdnf, or move the RUN lines to apt on eclipse-temurin:<major>-jdk.';
  function fixLine(line, rule) {
    var s = String(line == null ? '' : line);
    if (/^\s*#/.test(s)) return null;
    for (var i = 0; i < EDITS.length; i++) {
      var e = EDITS[i]; if (rule && e.rule !== rule) continue;
      var m = e.re.exec(s); if (!m) continue;
      if (e.ok && !e.ok(m)) return { manual: true, rule: e.rule, how: MANUAL[e.rule] };
      var after = s.slice(0, m.index) + e.to.apply(null, m) + s.slice(m.index + m[0].length);
      if (after !== s) return { after: after, rule: e.rule };
    }
    if (rule && MANUAL[rule]) return { manual: true, rule: rule, how: MANUAL[rule] };
    return null;
  }
  // findings = engine.check(text).findings (line + check). Rewrites only lines the engine flagged — never anything else.
  function fixText(text, findings) {
    var nl = /\r\n/.test(String(text)) ? '\r\n' : '\n';
    var lines = String(text == null ? '' : text).split(/\r?\n/), applied = [], manual = [], seen = {};
    var rpmish = /\b(?:yum|dnf|microdnf|rpm)\b/.test(String(text || ''));
    (findings || []).forEach(function (f) {
      var i = (parseInt(f.line, 10) || 0) - 1; if (i < 0 || i >= lines.length) return;
      var k = i + ':' + f.check; if (seen[k]) return; seen[k] = 1;
      // the Oracle image is Oracle Linux; eclipse-temurin:<major>-jdk is Ubuntu — a file that installs with yum/dnf/microdnf/rpm stays manual
      var r = (f.check === 'oracle_registry_image' && rpmish) ? { manual: true, rule: f.check, how: RPM_HOW } : fixLine(lines[i], f.check);
      if (r && r.after != null) { applied.push({ line: i + 1, rule: r.rule, before: lines[i], after: r.after }); lines[i] = r.after; }
      else manual.push({ line: i + 1, rule: f.check, how: (r && r.how) || MANUAL[f.check] || 'Change this line by hand (see the finding).' });
    });
    return { text: lines.join(nl), applied: applied, manual: manual };
  }
  var API = { fixLine: fixLine, fixText: fixText, MANUAL: MANUAL, kind: 'line' };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.OJLG_FIX = API;
})();
