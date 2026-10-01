package com.getreadystack.p_oracle_jdk_license_gate;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ReadAction;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.ProgressManager;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.projectRoots.ProjectJdkTable;
import com.intellij.openapi.projectRoots.Sdk;
import com.intellij.openapi.roots.ProjectRootManager;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.openapi.vfs.VfsUtilCore;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.vfs.VirtualFileVisitor;
import com.intellij.testFramework.LightVirtualFile;
import org.jetbrains.annotations.NotNull;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * s175 2026-10-01 - "Which Java does this project pull?" - the answer people came for. [measured 2026-09-30 VS Code]
 * installs come from people who type "temurin" / "corretto" / "adoptium": they are moving to a free build, their files are
 * mostly clean, and the license check alone gave them nothing to read. The map is free and stays on this machine.
 */
final class JavaMap {
  static final Set<String> SKIP = new HashSet<>(Arrays.asList(".git", ".idea", ".gradle", "node_modules", "build", "target", "dist", "out", "vendor"));

  static final class Row { String file; String sha; List<Engine.Finding> findings; List<Engine.Pin> pins; List<Engine.Note> notes; }
  static final class Data { String day; int java; List<Row> rows = new ArrayList<>(); List<String[]> jdks = new ArrayList<>();
    int finds() { int n = 0; for (Row r : rows) n += r.findings.size(); return n; }
    int pins() { int n = 0; for (Row r : rows) n += r.pins.size(); return n; } }

  static String sha256(byte[] b) {
    try { StringBuilder s = new StringBuilder(); for (byte x : MessageDigest.getInstance("SHA-256").digest(b)) s.append(String.format("%02x", x)); return s.toString(); }
    catch (Exception e) { return ""; }
  }

  static Data collect(Project project, int limit) {
    Data d = ReadAction.compute(() -> {
      Data x = new Data(); x.day = Engine.today();
      List<VirtualFile> roots = new ArrayList<>(Arrays.asList(ProjectRootManager.getInstance(project).getContentRoots()));
      if (roots.isEmpty() && project.getBasePath() != null) { VirtualFile b = LocalFileSystem.getInstance().findFileByPath(project.getBasePath()); if (b != null) roots.add(b); }
      Set<String> seen = new HashSet<>();
      for (VirtualFile root : roots) {
        VfsUtilCore.visitChildrenRecursively(root, new VirtualFileVisitor<Void>() {
          @Override public boolean visitFile(@NotNull VirtualFile f) {
            if (f.isDirectory()) return !SKIP.contains(f.getName());
            if (!seen.add(f.getPath())) return true;
            String n = f.getName();
            if (Engine.javaFile(n)) x.java++;
            if (x.rows.size() >= limit || !Engine.mapFile(n) || f.getLength() > 400000) return true;
            try {
              byte[] b = f.contentsToByteArray();
              String t = new String(b, StandardCharsets.UTF_8);
              Row r = new Row();
              String rel = VfsUtilCore.getRelativePath(f, root, '/');
              r.file = rel != null ? rel : f.getPath();
              r.sha = sha256(b);
              r.findings = Engine.check(t, x.day); r.pins = Engine.pins(t); r.notes = Engine.notes(t);
              x.rows.add(r);
            } catch (Exception ignored) { }
            return true;
          }
        });
      }
      return x;
    });
    d.jdks = jdks(project);
    return d;
  }

  /* A JDK home carries a `release` file written by the vendor's own build. We only quote it. {from, home, implementor, version} */
  static List<String[]> jdks(Project p) {
    List<String[]> out = new ArrayList<>();
    Set<String> seen = new HashSet<>();
    String jh = System.getenv("JAVA_HOME");
    if (jh != null && !jh.isEmpty()) add(out, seen, "JAVA_HOME", jh, true);
    try {
      Sdk ps = ProjectRootManager.getInstance(p).getProjectSdk();
      if (ps != null && ps.getHomePath() != null) add(out, seen, "Project SDK (" + ps.getName() + ")", ps.getHomePath(), true);
      for (Sdk s : ProjectJdkTable.getInstance().getAllJdks()) if (s.getHomePath() != null) add(out, seen, "IDE SDK list (" + s.getName() + ")", s.getHomePath(), false);
    } catch (Throwable ignored) { }
    return out;
  }
  private static void add(List<String[]> out, Set<String> seen, String from, String home, boolean keepMissing) {
    String key = Paths.get(home).toAbsolutePath().normalize().toString();
    if (!seen.add(key)) return;
    try {
      String txt = Files.readString(Path.of(home, "release"));
      out.add(new String[]{from, home, rel(txt, "IMPLEMENTOR"), rel(txt, "JAVA_VERSION")});
    } catch (Exception e) {
      if (keepMissing) out.add(new String[]{from, home, null, null});
    }
  }
  private static String rel(String txt, String k) {
    Matcher m = Pattern.compile("^" + k + "=\"?([^\"\\r\\n]*)\"?", Pattern.MULTILINE).matcher(txt);
    return m.find() ? m.group(1) : null;
  }

  static String summary(Data d) {
    Map<String, Integer> c = new LinkedHashMap<>();
    for (Row r : d.rows) for (Engine.Pin p : r.pins) { String v = p.vendor.startsWith("$") ? "matrix" : p.vendor; c.merge(v, 1, Integer::sum); }
    List<Map.Entry<String, Integer>> e = new ArrayList<>(c.entrySet());
    e.sort((a, b) -> b.getValue() - a.getValue());
    StringBuilder s = new StringBuilder();
    for (int i = 0; i < Math.min(5, e.size()); i++) { if (s.length() > 0) s.append(" · "); s.append(e.get(i).getKey()).append(" ×").append(e.get(i).getValue()); }
    return s.toString();
  }

  static String esc(String s) { return s.replace("|", "/"); }

  /** The free map (Markdown). The report (Report.java) is the paid, complete, file-written version. */
  static String render(Data d, String projectName) {
    StringBuilder L = new StringBuilder();
    int finds = d.finds(), pins = d.pins(), notes = 0;
    for (Row r : d.rows) notes += r.notes.size();
    L.append("# Java in ").append(projectName).append(" - ").append(d.day).append("\n\n");
    L.append(Txt.TITLE).append(" read ").append(d.rows.size()).append(d.rows.size() == 1 ? " file" : " files")
      .append(" in this project against ").append(Engine.RULE_COUNT).append(" checks. Everything below was read on this machine; nothing was sent anywhere.\n\n");
    L.append("## 1. Oracle-licensed Java pulls on ").append(d.day).append(": ").append(finds).append("\n\n");
    if (finds == 0) L.append("None of the files read pulls an Oracle-licensed Java build.\n");
    int shown = 0;
    for (Row r : d.rows) for (Engine.Finding f : r.findings) { if (shown++ < 80) L.append("- `").append(r.file).append("` line ").append(f.line).append(" - ").append(f.msg).append("\n"); }
    if (finds > 80) L.append("- ... and ").append(finds - 80).append(" more (all of them are in the dated report).\n");
    L.append("\n## 2. Where this project chooses its Java: ").append(pins).append(pins == 1 ? " place\n\n" : " places\n\n");
    if (pins == 0) L.append("No file here names a Java vendor (setup-java distribution, Docker base image, Gradle or Maven toolchain vendor, SDKMAN, asdf, dev container). The build then uses whatever JDK the machine or the CI runner happens to have.\n");
    else {
      L.append("| File | Line | Place | Vendor named |\n| --- | --- | --- | --- |\n");
      int k = 0;
      for (Row r : d.rows) for (Engine.Pin p : r.pins) { if (k++ < 120) L.append("| `").append(r.file).append("` | ").append(p.line).append(" | ").append(p.kind).append(" | ").append(esc(p.vendor)).append(" |\n"); }
      if (pins > 120) L.append("| ... | | ").append(pins - 120).append(" more | |\n");
    }
    L.append("\n");
    int sec = 3;
    if (notes > 0) {
      L.append("## ").append(sec++).append(". Worth changing (not a license matter)\n\n");
      for (Row r : d.rows) for (Engine.Note n : r.notes) L.append("- `").append(r.file).append("` line ").append(n.line).append(" - ").append(n.msg).append(". Line to use: `").append(n.fix).append("`\n");
      L.append("\n");
    }
    L.append("## ").append(sec++).append(". Java this IDE runs your project on\n\n");
    if (d.jdks.isEmpty()) L.append("No JAVA_HOME is set and no project SDK is configured, so there is nothing to read here.\n");
    for (String[] j : d.jdks) {
      if (j[2] == null && j[3] == null) { L.append("- ").append(j[0]).append(" = `").append(j[1]).append("` - no `release` file there, so the vendor cannot be read.\n"); continue; }
      L.append("- ").append(j[0]).append(" = `").append(j[1]).append("` - its `release` file says IMPLEMENTOR \"").append(j[2] == null ? "not stated" : j[2])
        .append("\", JAVA_VERSION \"").append(j[3] == null ? "not stated" : j[3]).append("\".\n");
      if (j[2] != null && j[2].toLowerCase(Locale.ROOT).contains("oracle"))
        L.append("  Oracle Corporation publishes two builds under that name: the Oracle JDK (No-Fee Terms or Oracle Technology Network license) and the OpenJDK build from jdk.java.net (GPLv2 with the Classpath Exception). `java -version` tells them apart: the Oracle JDK prints `Java(TM) SE Runtime Environment`, the OpenJDK build prints `OpenJDK Runtime Environment`.\n");
    }
    L.append("\n## ").append(sec).append(". The free line for each place\n\n| Place | Eclipse Temurin (Adoptium) | Amazon Corretto |\n| --- | --- | --- |\n");
    for (String[] x : Engine.LINES) L.append("| ").append(x[0]).append(" | `").append(x[1]).append("` | ").append(x[2] == null ? "" : "`" + x[2] + "`").append(" |\n");
    L.append("\nOracle's No-Fee Terms cover a Java LTS release until one year after the next LTS ships: the free window for JDK 21 closed on 2026-09-16, for JDK 17 on 2024-09-19. OpenJDK builds such as Temurin and Corretto are not under those terms.\n\n---\n");
    L.append("This map is free and stays on this machine. The dated project report (every line, the SHA-256 of every file read, as a file for your team, an auditor or CI) is the paid part: Tools > ")
      .append(Txt.TITLE).append(": Write the Dated Project Report.\n");
    return L.toString();
  }

  static void open(Project p, String name, String text) {
    ApplicationManager.getApplication().invokeLater(() -> {
      if (p.isDisposed()) return;
      LightVirtualFile vf = new LightVirtualFile(name, text);
      vf.setWritable(false);
      FileEditorManager.getInstance(p).openFile(vf, true);
    });
  }

  /** Background read, then the map opens in the editor and the one money line follows. */
  static void show(Project p, Data ready) {
    ProgressManager.getInstance().run(new Task.Backgroundable(p, Txt.TITLE + ": reading the Java build files", true) {
      @Override public void run(@NotNull ProgressIndicator ind) {
        Data d = ready != null ? ready : collect(p, 400);
        open(p, "Java map " + d.day + ".md", render(d, p.getName()));
        Paid.count("use", "java_map");
        int finds = d.finds();
        ApplicationManager.getApplication().invokeLater(() -> { if (!p.isDisposed()) Paid.offerAfterMap(p, finds); });
      }
    });
  }

  private JavaMap() { }
}
