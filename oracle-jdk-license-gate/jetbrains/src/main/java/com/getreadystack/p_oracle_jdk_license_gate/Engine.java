package com.getreadystack.p_oracle_jdk_license_gate;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * s175 2026-10-01 - the same rules and the same clock as the VS Code extension's engine.js, in plain Java,
 * so the IDE needs no Node.js. The license question is "on today's date, does this line still fall inside
 * Oracle's free window", so every finding is computed against today (UTC) and moves when the date moves.
 * No IntelliJ classes here: tested standalone against engine.js (/root/_audit_s175/f4_jb_oracle/parity).
 */
public final class Engine {
  public static final class Finding {
    public final String check, sev, msg; public final int line;
    Finding(String check, String sev, int line, String msg) { this.check = check; this.sev = sev; this.line = line; this.msg = msg; }
  }
  public static final class Pin {
    public final int line; public final String kind, vendor, raw;
    Pin(int line, String kind, String vendor, String raw) { this.line = line; this.kind = kind; this.vendor = vendor; this.raw = raw; }
  }
  public static final class Note {
    public final int line; public final String id, msg, fix;
    Note(int line, String id, String msg, String fix) { this.line = line; this.id = id; this.msg = msg; this.fix = fix; }
  }

  public static final int RULE_COUNT = Rules.R.length;
  private static final Pattern[] RE = new Pattern[Rules.R.length];
  private static final Pattern[] UNLESS = new Pattern[Rules.R.length];
  static {
    for (int i = 0; i < Rules.R.length; i++) {
      RE[i] = Pattern.compile(Rules.R[i][1], Pattern.CASE_INSENSITIVE);
      UNLESS[i] = Rules.R[i][2].isEmpty() ? null : Pattern.compile(Rules.R[i][2], Pattern.CASE_INSENSITIVE);
    }
  }

  /* Oracle No-Fee Terms cover a Java LTS until one year after the next LTS ships. JDK 8 and 11 are OTN builds (dev/test only). */
  static final String[][] WINDOW = {
    {"8", "OTN", null, ""}, {"11", "OTN", null, ""},
    {"17", "NFTC", "2024-09-19", ""}, {"21", "NFTC", "2026-09-16", ""}, {"25", "NFTC", "2028-09-15", "projected"}
  };
  private static final Pattern VERSION_RE = Pattern.compile("(?:^|[^\\d.]|JDK\\.|jdk-)(8|11|17|21|25)(?![\\d])");
  private static final Pattern COMMENT = Pattern.compile("^\\s*#");

  public static String today() { return LocalDate.now(ZoneOffset.UTC).toString(); }

  static String[] lines(String text) { return (text == null ? "" : text).split("\\r?\\n", -1); }

  static String versionNear(String[] lines, int i) {
    int[] order = {0, 1, -1, 2, -2, 3, -3};
    for (int k : order) {
      int j = i + k;
      if (j < 0 || j >= lines.length) continue;
      Matcher m = VERSION_RE.matcher(lines[j]);
      if (m.find()) return m.group(1);
    }
    return null;
  }

  static String[] windowStatus(String ver, String today) {
    if (ver == null) return new String[]{"warn", "no Java version pinned on or near this line, so the free window cannot be read - pin one"};
    String[] w = null;
    for (String[] x : WINDOW) if (x[0].equals(ver)) w = x;
    if (w == null) return new String[]{"warn", "Java " + ver + " is not a long term support release; Oracle bills non-LTS use the same way"};
    if ("OTN".equals(w[1])) return new String[]{"err", "Java " + ver + " is an Oracle Technology Network build: free for development and test only, never for production"};
    long left = ChronoUnit.DAYS.between(LocalDate.parse(today), LocalDate.parse(w[2]));
    if (left < 0) return new String[]{"err", "the free NFTC window for Java " + ver + " closed on " + w[2] + ", " + (-left) + " days ago"};
    String tail = "projected".equals(w[3]) ? " (projected from the next LTS date)" : "";
    return new String[]{"warn", "the free NFTC window for Java " + ver + " closes on " + w[2] + ", " + left + " days from now" + tail};
  }

  private static boolean nearHas(String[] lines, int i, Pattern p) {
    for (int j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 6); j++) if (p.matcher(lines[j]).find()) return true;
    return false;
  }

  public static List<Finding> check(String text, String today) {
    String[] L = lines(text);
    List<Finding> out = new ArrayList<>();
    for (int i = 0; i < L.length; i++) {
      if (COMMENT.matcher(L[i]).find()) continue;
      for (int r = 0; r < Rules.R.length; r++) {
        if (!RE[r].matcher(L[i]).find()) continue;
        if (UNLESS[r] != null && nearHas(L, i, UNLESS[r])) continue;
        String[] st = windowStatus(versionNear(L, i), today);
        out.add(new Finding(Rules.R[r][0], st[0], i + 1,
          Rules.R[r][3] + " - " + Rules.R[r][4] + ". On " + today + ": " + st[1] + ". Free swap: " + Rules.R[r][5]));
      }
    }
    return out;
  }

  /* s173 - the Java map: every place a project chooses its Java build. Facts only, never license findings. */
  private static final String[][] NOTES = {
    {"setup_java_adopt_removed", "distribution\\s*:\\s*['\"]?adopt(-hotspot)?['\"]?\\s*$",
     "setup-java removed the legacy AdoptOpenJDK distributions; its README says: use temurin instead of adopt or adopt-hotspot", "distribution: temurin"},
    {"setup_java_adopt_openj9", "distribution\\s*:\\s*['\"]?adopt-openj9",
     "setup-java removed the legacy AdoptOpenJDK distributions; its README says: use semeru instead of adopt-openj9", "distribution: semeru"},
    {"docker_openjdk_deprecated", "^\\s*FROM\\s+(--platform=\\S+\\s+)?openjdk:",
     "the Docker Official Image `openjdk` is officially deprecated (Docker Hub notice); only Early Access tags have been updated since July 2022", "FROM eclipse-temurin:21-jdk"}
  };
  private static final Pattern[] NOTE_RE = new Pattern[NOTES.length];
  static { for (int i = 0; i < NOTES.length; i++) NOTE_RE[i] = Pattern.compile(NOTES[i][1], Pattern.CASE_INSENSITIVE); }

  private static final String[] PIN_KIND = {"GitHub Actions setup-java", "Gradle toolchain", "SDKMAN (.sdkmanrc)", "asdf / mise (.tool-versions)", "Dev container", "Maven toolchain"};
  private static final Pattern[] PIN_RE = {
    Pattern.compile("distribution\\s*:\\s*['\"]?([A-Za-z0-9_\\$\\{\\}. -]+?)['\"]?\\s*$"),
    Pattern.compile("JvmVendorSpec\\.([A-Z_]+)"),
    Pattern.compile("^\\s*java\\s*=\\s*\\S*-([a-z]+)\\s*$"),
    Pattern.compile("^\\s*java\\s+([a-z-]+?)-\\d"),
    Pattern.compile("\"jdkDistro\"\\s*:\\s*\"([a-z]+)\""),
    Pattern.compile("<vendor>\\s*([^<]+?)\\s*</vendor>")
  };
  private static final Pattern FROM = Pattern.compile("^\\s*FROM\\s+(?:--platform=\\S+\\s+)?(\\S+)", Pattern.CASE_INSENSITIVE);
  private static final String[][] IMAGES = {
    {"eclipse-temurin", "temurin"}, {"amazoncorretto", "corretto"}, {"azul/zulu-openjdk", "zulu"}, {"bellsoft/liberica", "liberica"},
    {"ibm-semeru-runtimes", "semeru"}, {"sapmachine", "sapmachine"}, {"mcr.microsoft.com/openjdk", "microsoft"},
    {"container-registry.oracle.com/java", "oracle"}, {"container-registry.oracle.com/graalvm", "oracle graalvm"},
    {"ghcr.io/graalvm", "graalvm community"}, {"adoptopenjdk", "adoptopenjdk"}, {"openjdk", "openjdk (deprecated image)"}
  };

  private static String raw(String s) { String t = s.trim(); return t.length() > 120 ? t.substring(0, 120) : t; }

  public static List<Pin> pins(String text) {
    String[] L = lines(text);
    List<Pin> out = new ArrayList<>();
    for (int i = 0; i < L.length; i++) {
      if (COMMENT.matcher(L[i]).find()) continue;
      for (int k = 0; k < PIN_RE.length; k++) {
        Matcher m = PIN_RE[k].matcher(L[i]);
        if (m.find()) out.add(new Pin(i + 1, PIN_KIND[k], m.group(1).trim().toLowerCase(Locale.ROOT), raw(L[i])));
      }
      Matcher f = FROM.matcher(L[i]);
      if (f.find()) {
        String img = f.group(1).toLowerCase(Locale.ROOT);
        for (String[] im : IMAGES) if (img.contains(im[0])) { out.add(new Pin(i + 1, "Docker base image", im[1], raw(L[i]))); break; }
      }
    }
    return out;
  }

  public static List<Note> notes(String text) {
    String[] L = lines(text);
    List<Note> out = new ArrayList<>();
    for (int i = 0; i < L.length; i++) {
      if (COMMENT.matcher(L[i]).find()) continue;
      for (int k = 0; k < NOTES.length; k++) if (NOTE_RE[k].matcher(L[i]).find()) out.add(new Note(i + 1, NOTES[k][0], NOTES[k][2], NOTES[k][3]));
    }
    return out;
  }

  /** The free lines, one per place a project can choose its Java: {place, Eclipse Temurin, Amazon Corretto or null}. */
  public static final String[][] LINES = {
    {"GitHub Actions setup-java", "distribution: temurin", "distribution: corretto"},
    {"Docker base image", "FROM eclipse-temurin:21-jdk", "FROM amazoncorretto:21"},
    {"Gradle toolchain", "vendor = JvmVendorSpec.ADOPTIUM", "vendor = JvmVendorSpec.AMAZON"},
    {"SDKMAN (.sdkmanrc)", "java=<version>-tem", "java=<version>-amzn"},
    {"asdf / mise (.tool-versions)", "java temurin-<version>", "java corretto-<version>"},
    {"Dev container", "\"jdkDistro\": \"tem\"", "\"jdkDistro\": \"amzn\""},
    {"This machine (Windows)", "winget install EclipseAdoptium.Temurin.21.JDK", null},
    {"This machine (macOS)", "brew install --cask temurin@21", null},
    {"This machine (SDKMAN)", "sdk install java <version>-tem", "sdk install java <version>-amzn"}
  };

  /** Files the map and the inline check read: the places a project chooses its Java. */
  public static boolean mapFile(String n) {
    String l = n.toLowerCase(Locale.ROOT);
    return n.equals("Dockerfile") || n.startsWith("Dockerfile.") || l.endsWith(".dockerfile") || l.endsWith(".yml") || l.endsWith(".yaml")
      || l.endsWith(".sh") || l.endsWith(".ps1") || l.endsWith(".gradle") || l.endsWith(".gradle.kts")
      || n.equals(".sdkmanrc") || n.equals(".tool-versions") || n.equals("toolchains.xml") || n.equals("pom.xml")
      || n.equals("devcontainer.json") || n.equals(".devcontainer.json") || n.equals("Brewfile") || n.equals("Jenkinsfile");
  }
  public static boolean javaFile(String n) {
    String l = n.toLowerCase(Locale.ROOT);
    return n.equals("pom.xml") || n.equals("build.gradle") || n.equals("build.gradle.kts") || l.endsWith(".java") || l.endsWith(".kt");
  }

  private Engine() { }
}
