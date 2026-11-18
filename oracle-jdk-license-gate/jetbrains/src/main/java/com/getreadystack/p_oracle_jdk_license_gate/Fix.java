package com.getreadystack.p_oracle_jdk_license_gate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * s185 2026-10-10 - the WORK, not a report: Oracle JDK -> Eclipse Temurin line rewrites (Java port of the VS Code
 * extension's fixmap.js, s184 W1). Only mechanical, safe swaps are rewritten; anything that needs a human choice stays
 * "manual" with the exact how-to. Pure (no IntelliJ classes) so it is tested standalone (/root/_audit_s185/d12/FixTest).
 */
public final class Fix {
  public static final class Applied { public final int line; public final String rule, before, after;
    Applied(int l, String r, String b, String a) { line = l; rule = r; before = b; after = a; } }
  public static final class Manual { public final int line; public final String rule, how;
    Manual(int l, String r, String h) { line = l; rule = r; how = h; } }
  public static final class Result { public String text; public final List<Applied> applied = new ArrayList<>(); public final List<Manual> manual = new ArrayList<>(); }

  private static final Set<String> MAJORS = new HashSet<>(List.of("8", "11", "17", "21", "25"));
  private static final Pattern COMMENT = Pattern.compile("^\\s*#");

  /** {rule, regex} - group usage per rule is handled in edit() */
  private static final String[][] EDITS = {
    {"setup_java_oracle", "(distribution\\s*:\\s*)(['\"]?)oracle\\2(?=\\s*(#.*)?$)"},
    {"gradle_toolchain_oracle", "JvmVendorSpec\\.ORACLE\\b"},
    {"devcontainer_oracle_distro", "(\"jdkDistro\"\\s*:\\s*\")oracle(\")"},
    {"brew_oracle_jdk", "\\boracle-jdk(@(\\d+))?\\b"},
    {"winget_oracle_jdk", "\\bOracle\\.JDK\\.(\\d+)\\b"},
    {"oracle_registry_image", "container-registry\\.oracle\\.com/java/(?:jdk|openjdk):(\\d+)[\\w.-]*"}
  };
  private static final Pattern[] EDIT_RE = new Pattern[EDITS.length];
  static { for (int i = 0; i < EDITS.length; i++) EDIT_RE[i] = Pattern.compile(EDITS[i][1], "setup_java_oracle".equals(EDITS[i][0]) ? Pattern.CASE_INSENSITIVE : 0); }

  public static final Map<String, String> MANUAL = new HashMap<>();
  static {
    MANUAL.put("setup_java_graalvm", "GraalVM: keep Oracle GraalVM only with a licence, or move the job to graalvm/setup-graalvm with distribution: graalvm-community.");
    MANUAL.put("oracle_download_url", "Replace the download with the Adoptium API (https://api.adoptium.net/v3/binary/latest/<major>/ga/<os>/<arch>/jdk/hotspot/normal/eclipse) and update the checksum step.");
    MANUAL.put("otn_license_cookie", "Delete the oraclelicense cookie header and download an OpenJDK build (Temurin) that needs no licence header.");
    MANUAL.put("sdkman_oracle_vendor", "Pick the Temurin build of the same major: sdk list java | grep tem, then sdk install java <version>-tem (patch numbers differ per vendor).");
    MANUAL.put("sdkmanrc_oracle_vendor", "Set java=<version>-tem with a version that exists: sdk list java | grep tem (patch numbers differ per vendor).");
    MANUAL.put("asdf_oracle_vendor", "Set java temurin-<version> with a version that exists: asdf list-all java | grep temurin.");
    MANUAL.put("oracle_linux_jdk_pkg", "Install the OpenJDK package of the same major instead (e.g. microdnf install -y java-21-openjdk-headless) and check JAVA_HOME.");
    MANUAL.put("oracle_java_installer_ppa", "Remove the PPA and add the Adoptium apt repository, then apt-get install -y temurin-<major>-jdk.");
    MANUAL.put("oracle_license_env_accept", "Remove the variable once the base image is an OpenJDK build (eclipse-temurin:<major>-jdk).");
    MANUAL.put("oracle_setup_java_action", "Replace oracle-actions/setup-java with actions/setup-java@v4 and distribution: temurin (keep java-version).");
    MANUAL.put("maven_toolchain_oracle", "Change <vendor> to temurin AND add the matching Temurin JDK to ~/.m2/toolchains.xml on every machine and CI runner.");
    MANUAL.put("choco_oracle_jdk", "Use winget install EclipseAdoptium.Temurin.<major>.JDK (or choco install temurin<major>).");
    MANUAL.put("oracle_registry_image", "Use eclipse-temurin:<major>-jdk (pick the major from the Oracle tag).");
    MANUAL.put("brew_oracle_jdk", "Use brew install --cask temurin@<major>.");
    MANUAL.put("winget_oracle_jdk", "Use winget install EclipseAdoptium.Temurin.<major>.JDK (JDK 8 is EclipseAdoptium.Temurin.8.JDK only on x64).");
  }
  static final String RPM_HOW = "This Dockerfile installs with yum/dnf/microdnf (Oracle Linux). Use eclipse-temurin:<major>-jdk-ubi9-minimal (RHEL family, microdnf) and replace yum/dnf with microdnf, or move the RUN lines to apt on eclipse-temurin:<major>-jdk.";
  private static final Pattern RPMISH = Pattern.compile("\\b(?:yum|dnf|microdnf|rpm)\\b");

  /** null = no edit; String[]{after} = rewritten; String[]{null, how} = manual. */
  static String[] fixLine(String s, String rule) {
    if (s == null || COMMENT.matcher(s).find()) return null;
    for (int i = 0; i < EDITS.length; i++) {
      String r = EDITS[i][0];
      if (rule != null && !r.equals(rule)) continue;
      Matcher m = EDIT_RE[i].matcher(s);
      if (!m.find()) continue;
      String to;
      switch (r) {
        case "setup_java_oracle": to = m.group(1) + m.group(2) + "temurin" + m.group(2); break;
        case "gradle_toolchain_oracle": to = "JvmVendorSpec.ADOPTIUM"; break;
        case "devcontainer_oracle_distro": to = m.group(1) + "tem" + m.group(2); break;
        case "brew_oracle_jdk": { String v = m.group(2); if (v != null && !MAJORS.contains(v)) return new String[]{null, MANUAL.get(r)}; to = "temurin" + (v != null ? "@" + v : ""); break; }
        case "winget_oracle_jdk": { String v = m.group(1); if (!MAJORS.contains(v) || "8".equals(v)) return new String[]{null, MANUAL.get(r)}; to = "EclipseAdoptium.Temurin." + v + ".JDK"; break; }
        case "oracle_registry_image": { String v = m.group(1); if (!MAJORS.contains(v)) return new String[]{null, MANUAL.get(r)}; to = "eclipse-temurin:" + v + "-jdk"; break; }
        default: continue;
      }
      String after = s.substring(0, m.start()) + to + s.substring(m.end());
      if (!after.equals(s)) return new String[]{after};
    }
    if (rule != null && MANUAL.containsKey(rule)) return new String[]{null, MANUAL.get(rule)};
    return null;
  }

  /** Rewrites only lines the engine flagged - never anything else. */
  public static Result fixText(String text, List<Engine.Finding> findings) {
    Result res = new Result();
    String src = text == null ? "" : text;
    String nl = src.contains("\r\n") ? "\r\n" : "\n";
    String[] lines = src.split("\\r?\\n", -1);
    boolean rpmish = RPMISH.matcher(src).find();
    Set<String> seen = new HashSet<>();
    for (Engine.Finding f : findings) {
      int i = f.line - 1;
      if (i < 0 || i >= lines.length || !seen.add(i + ":" + f.check)) continue;
      String[] r = ("oracle_registry_image".equals(f.check) && rpmish) ? new String[]{null, RPM_HOW} : fixLine(lines[i], f.check);
      if (r != null && r[0] != null) { res.applied.add(new Applied(i + 1, f.check, lines[i], r[0])); lines[i] = r[0]; }
      else res.manual.add(new Manual(i + 1, f.check, r != null && r.length > 1 && r[1] != null ? r[1] : MANUAL.getOrDefault(f.check, "Change this line by hand (see the finding).")));
    }
    res.text = String.join(nl, lines);
    return res;
  }

  private Fix() { }
}
