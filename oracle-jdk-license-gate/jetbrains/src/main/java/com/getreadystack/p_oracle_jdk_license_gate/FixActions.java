package com.getreadystack.p_oracle_jdk_license_gate;

import com.intellij.notification.NotificationAction;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.command.WriteCommandAction;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.fileEditor.FileDocumentManager;
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
import java.util.ArrayList;
import java.util.List;

/**
 * s185 2026-10-10 - the work itself. Free: Fix This File (one complete job on the file in front of you).
 * Pro (JetBrains Marketplace licence): Fix All in project + a dated migration record. One undo step per file.
 */
final class FixActions {

  /** Applies a Fix.Result to a Document line by line (keeps the rest of the file and the caret), inside one command. */
  static void apply(Project p, Document doc, Fix.Result r, String name) {
    WriteCommandAction.runWriteCommandAction(p, name, null, () -> {
      List<Fix.Applied> a = new ArrayList<>(r.applied);
      a.sort((x, y) -> Integer.compare(y.line, x.line));
      for (Fix.Applied x : a) {
        int ln = x.line - 1;
        if (ln < 0 || ln >= doc.getLineCount()) continue;
        doc.replaceString(doc.getLineStartOffset(ln), doc.getLineEndOffset(ln), x.after);
      }
    });
  }

  static String manualText(List<Fix.Manual> m, String file) {
    StringBuilder s = new StringBuilder();
    for (Fix.Manual x : m) s.append(file == null ? "" : file + " ").append("line ").append(x.line).append(": ").append(x.how).append("\n");
    return s.toString();
  }

  /** Free. */
  static void fixFile(Project p, VirtualFile vf) {
    if (p == null || vf == null || vf.isDirectory()) return;
    Document doc = FileDocumentManager.getInstance().getDocument(vf);
    if (doc == null) return;
    List<Engine.Finding> f = Engine.check(doc.getText(), Engine.today());
    Fix.Result r = Fix.fixText(doc.getText(), f);
    if (!r.applied.isEmpty()) apply(p, doc, r, Txt.TITLE + ": Fix This File");
    Paid.count("use", "fix_file");
    String head = f.isEmpty() ? "No Oracle-licensed Java line in this file."
      : "Fixed " + r.applied.size() + " of " + f.size() + (f.size() == 1 ? " line" : " lines") + " in " + vf.getName() + " (free)."
        + (r.manual.isEmpty() ? "" : " " + r.manual.size() + " need a choice:\n" + manualText(r.manual, null));
    if (Paid.licensed()) { Paid.notify(p, head); return; }
    Paid.count("paywall", "fix_offer");
    Paid.notify(p, head + " Pro fixes every such line across the whole project in one step and writes the dated migration record.",
      NotificationAction.createSimpleExpiring("Fix all in project (Pro)", () -> fixProject(p)));
  }

  /** Pro: every flagged line in the project, then the dated record next to the project. */
  static void fixProject(Project p) {
    if (p == null || p.isDisposed()) return;
    if (!Paid.ensureLicense(p, "fix_all")) return;
    ProgressManager.getInstance().run(new Task.Backgroundable(p, Txt.TITLE + ": fixing the project", true) {
      @Override public void run(@NotNull ProgressIndicator ind) {
        JavaMap.Data before = JavaMap.collect(p, 5000);
        ApplicationManager.getApplication().invokeAndWait(() -> {
          if (p.isDisposed()) return;
          List<String[]> changed = new ArrayList<>();
          List<String> manual = new ArrayList<>();
          for (JavaMap.Row row : before.rows) {
            if (row.findings.isEmpty() || row.vf == null) continue;
            Document doc = FileDocumentManager.getInstance().getDocument(row.vf);
            if (doc == null) continue;
            Fix.Result r = Fix.fixText(doc.getText(), Engine.check(doc.getText(), before.day));
            if (!r.applied.isEmpty()) apply(p, doc, r, Txt.TITLE + ": Fix All in Project");
            for (Fix.Applied a : r.applied) changed.add(new String[]{row.file, String.valueOf(a.line), a.before.trim(), a.after.trim()});
            for (Fix.Manual m : r.manual) manual.add("`" + row.file + "` line " + m.line + " - " + m.how);
          }
          FileDocumentManager.getInstance().saveAllDocuments();
          Paid.count("use", "fix_all");
          ProgressManager.getInstance().run(new Task.Backgroundable(p, Txt.TITLE + ": writing the migration record", true) {
            @Override public void run(@NotNull ProgressIndicator i2) {
              JavaMap.Data after = JavaMap.collect(p, 5000);
              writeRecord(p, before, after, changed, manual);
            }
          });
        });
      }
    });
  }

  static void writeRecord(Project p, JavaMap.Data before, JavaMap.Data after, List<String[]> changed, List<String> manual) {
    StringBuilder L = new StringBuilder();
    L.append("# Oracle JDK to Temurin migration record - ").append(p.getName()).append(" - ").append(after.day).append("\n\n");
    L.append("- Done: ").append(Instant.now().truncatedTo(ChronoUnit.SECONDS)).append(" (UTC) by ").append(Txt.TITLE).append(" ").append(Txt.VERSION).append("\n");
    L.append("- Oracle-licensed lines before: ").append(before.finds()).append(" · changed: ").append(changed.size())
      .append(" · still need a choice: ").append(manual.size()).append(" · after: ").append(after.finds()).append("\n\n");
    L.append("## A. Lines changed\n\n");
    if (changed.isEmpty()) L.append("None.\n");
    else {
      L.append("| File | Line | Before | After |\n| --- | --- | --- | --- |\n");
      for (String[] c : changed) L.append("| `").append(c[0]).append("` | ").append(c[1]).append(" | `").append(JavaMap.esc(c[2])).append("` | `").append(JavaMap.esc(c[3])).append("` |\n");
    }
    L.append("\n## B. Lines that still need a choice\n\n");
    if (manual.isEmpty()) L.append("None.\n");
    for (String m : manual) L.append("- ").append(m).append("\n");
    L.append("\n").append(Report.render(after, p.getName(), null).replaceFirst("^# ", "## C. State after the fix - "));
    String text = L.toString();
    String name = "oracle-jdk-migration-record-" + after.day + ".md";
    String base = p.getBasePath();
    if (base == null) { JavaMap.open(p, name, text); return; }
    Path out = Path.of(base, name);
    try { Files.writeString(out, text, StandardCharsets.UTF_8); } catch (Exception e) { JavaMap.open(p, name, text); return; }
    ApplicationManager.getApplication().invokeLater(() -> {
      if (p.isDisposed()) return;
      VirtualFile vf = LocalFileSystem.getInstance().refreshAndFindFileByNioFile(out);
      if (vf != null) new com.intellij.openapi.fileEditor.OpenFileDescriptor(p, vf).navigate(true);
      else Messages.showInfoMessage(p, "Record written: " + out, Txt.TITLE);
    });
  }

  public static class FixFileAction extends AnAction {
    @Override public @NotNull ActionUpdateThread getActionUpdateThread() { return ActionUpdateThread.BGT; }
    @Override public void update(@NotNull AnActionEvent e) {
      VirtualFile vf = e.getData(CommonDataKeys.VIRTUAL_FILE);
      e.getPresentation().setEnabledAndVisible(e.getProject() != null && vf != null && !vf.isDirectory());
    }
    @Override public void actionPerformed(@NotNull AnActionEvent e) { fixFile(e.getProject(), e.getData(CommonDataKeys.VIRTUAL_FILE)); }
  }

  public static class FixProjectAction extends AnAction {
    @Override public @NotNull ActionUpdateThread getActionUpdateThread() { return ActionUpdateThread.BGT; }
    @Override public void update(@NotNull AnActionEvent e) { e.getPresentation().setEnabledAndVisible(e.getProject() != null); }
    @Override public void actionPerformed(@NotNull AnActionEvent e) { fixProject(e.getProject()); }
  }

  private FixActions() { }
}
