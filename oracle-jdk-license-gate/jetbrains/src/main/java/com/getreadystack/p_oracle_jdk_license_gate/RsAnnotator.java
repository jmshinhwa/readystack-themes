package com.getreadystack.p_oracle_jdk_license_gate;

import com.intellij.lang.annotation.AnnotationHolder;
import com.intellij.lang.annotation.ExternalAnnotator;
import com.intellij.lang.annotation.HighlightSeverity;
import com.intellij.notification.NotificationAction;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.util.TextRange;
import com.intellij.psi.PsiDocumentManager;
import com.intellij.psi.PsiFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/** s175 - the engine runs in the IDE itself (no Node.js): build files are checked as they open, any other file on request. */
public class RsAnnotator extends ExternalAnnotator<RsAnnotator.Input, List<Engine.Finding>> {
  static final Set<String> ON = ConcurrentHashMap.newKeySet();
  static final Set<String> TELL = ConcurrentHashMap.newKeySet();

  public static class Input { final String path; final String text; Input(String p, String t) { path = p; text = t; } }

  @Override public @Nullable Input collectInformation(@NotNull PsiFile file) {
    if (file.getVirtualFile() == null) return null;
    String path = file.getVirtualFile().getPath();
    if (!ON.contains(path) && !Engine.mapFile(file.getName())) return null;
    return new Input(path, file.getText());
  }

  @Override public @Nullable List<Engine.Finding> doAnnotate(Input in) {
    return in == null ? null : Engine.check(in.text, Engine.today());
  }

  @Override public void apply(@NotNull PsiFile file, List<Engine.Finding> findings, @NotNull AnnotationHolder holder) {
    if (findings == null) return;
    Document doc = PsiDocumentManager.getInstance(file.getProject()).getDocument(file);
    if (doc == null) return;
    for (Engine.Finding f : findings) {
      int ln = Math.max(0, Math.min(doc.getLineCount() - 1, f.line - 1));
      TextRange range = new TextRange(doc.getLineStartOffset(ln), doc.getLineEndOffset(ln));
      HighlightSeverity sev = "err".equals(f.sev) ? HighlightSeverity.ERROR : HighlightSeverity.WARNING;
      holder.newAnnotation(sev, Txt.TITLE + ": " + f.msg).range(range).create();
    }
    String path = file.getVirtualFile() == null ? "" : file.getVirtualFile().getPath();
    if (!TELL.remove(path)) return;
    int n = findings.size();
    Paid.count("use", "check");
    Paid.notify(file.getProject(), (n == 0 ? "No Oracle-licensed Java line in this file." : n + (n == 1 ? " finding" : " findings") + " in this file (free).")
        + " See which Java every part of this project pulls, with the free Temurin or Corretto line for each:",
      NotificationAction.createSimpleExpiring("Show the Java map", () -> JavaMap.show(file.getProject(), null)));
  }
}
