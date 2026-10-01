package com.getreadystack.p_oracle_jdk_license_gate;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.ProgressManager;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.Messages;
import com.intellij.openapi.vfs.LocalFileSystem;
import com.intellij.openapi.vfs.VirtualFile;
import org.jetbrains.annotations.NotNull;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** s175 - the paid part: the complete, dated project report written as a file next to the project. */
final class Report {
  static void run(Project p) {
    if (p == null || p.isDisposed()) return;
    if (!Paid.ensureKey(p, "no_key")) return;
    ProgressManager.getInstance().run(new Task.Backgroundable(p, Txt.TITLE + ": writing the dated report", true) {
      @Override public void run(@NotNull ProgressIndicator ind) {
        JavaMap.Data d = JavaMap.collect(p, 5000);
        String text = render(d, p.getName(), Paid.storedKey());
        String base = p.getBasePath();
        if (base == null) { JavaMap.open(p, "oracle-java-license-report-" + d.day + ".md", text); return; }
        Path out = Path.of(base, "oracle-java-license-report-" + d.day + ".md");
        try { Files.writeString(out, text, StandardCharsets.UTF_8); }
        catch (Exception e) { JavaMap.open(p, out.getFileName().toString(), text); return; }
        Paid.count("use", "report");
        ApplicationManager.getApplication().invokeLater(() -> {
          if (p.isDisposed()) return;
          VirtualFile vf = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(out);
          if (vf != null) FileEditorManager.getInstance(p).openFile(vf, true);
          else Messages.showInfoMessage(p, "Report written: " + out, Txt.TITLE);
        });
      }
    });
  }

  static String render(JavaMap.Data d, String project, String key) {
    StringBuilder L = new StringBuilder();
    String k = key == null ? "" : key.trim();
    String tail = k.length() > 4 ? k.substring(k.length() - 4) : k;
    L.append("# Oracle Java licence report - ").append(project).append(" - ").append(d.day).append("\n\n");
    L.append("- Generated: ").append(Instant.now().truncatedTo(ChronoUnit.SECONDS)).append(" (UTC) by ").append(Txt.TITLE).append(" ").append(Txt.VERSION).append(" for JetBrains IDEs\n");
    L.append("- Checks: ").append(Engine.RULE_COUNT).append(" rules · Oracle terms clock on ").append(d.day)
      .append(": JDK 21 free window closed 2026-09-16 · JDK 17 closed 2024-09-19 · JDK 8 and 11 Oracle builds are OTN (development and test only)\n");
    L.append("- Files read: ").append(d.rows.size()).append(" · Java source files seen: ").append(d.java).append(" · licence key ending ").append(tail).append("\n\n");
    L.append("## 1. Lines that pull an Oracle-licensed Java build: ").append(d.finds()).append("\n\n");
    if (d.finds() == 0) L.append("None. No file read on ").append(d.day).append(" pulls an Oracle-licensed Java build.\n");
    for (JavaMap.Row r : d.rows) for (Engine.Finding f : r.findings)
      L.append("- [").append("err".equals(f.sev) ? "error" : "warning").append("] `").append(r.file).append("` line ").append(f.line).append(" - ").append(f.msg).append("\n");
    L.append("\n## 2. Where this project chooses its Java: ").append(d.pins()).append("\n\n");
    if (d.pins() > 0) {
      L.append("| File | Line | Place | Vendor named | Line text |\n| --- | --- | --- | --- | --- |\n");
      for (JavaMap.Row r : d.rows) for (Engine.Pin p : r.pins)
        L.append("| `").append(r.file).append("` | ").append(p.line).append(" | ").append(p.kind).append(" | ").append(JavaMap.esc(p.vendor)).append(" | `").append(JavaMap.esc(p.raw)).append("` |\n");
    } else L.append("No file names a Java vendor; the build uses whatever JDK the machine or CI runner has.\n");
    L.append("\n## 3. JDKs this IDE knows\n\n");
    if (d.jdks.isEmpty()) L.append("No JAVA_HOME and no project SDK.\n");
    for (String[] j : d.jdks) L.append("- ").append(j[0]).append(" = `").append(j[1]).append("` - IMPLEMENTOR \"").append(j[2] == null ? "not readable" : j[2])
      .append("\", JAVA_VERSION \"").append(j[3] == null ? "not readable" : j[3]).append("\"\n");
    L.append("\n## 4. The free line for each place\n\n| Place | Eclipse Temurin (Adoptium) | Amazon Corretto |\n| --- | --- | --- |\n");
    for (String[] x : Engine.LINES) L.append("| ").append(x[0]).append(" | `").append(x[1]).append("` | ").append(x[2] == null ? "" : "`" + x[2] + "`").append(" |\n");
    L.append("\n## 5. Files read and their SHA-256\n\n| File | SHA-256 | Findings |\n| --- | --- | --- |\n");
    for (JavaMap.Row r : d.rows) L.append("| `").append(r.file).append("` | `").append(r.sha).append("` | ").append(r.findings.size()).append(" |\n");
    L.append("\n---\nWhy it matters: once Oracle's no-fee terms end, Java SE is billed on total headcount, contractors included (")
      .append(Txt.STAKE_SOURCE).append(": ").append(Txt.STAKE_URL).append("). This report states what the files said on the date above; it is not legal advice.\n");
    return L.toString();
  }

  private Report() { }
}
