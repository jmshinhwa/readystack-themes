package com.getreadystack.p_optout_signal_lint;

import com.intellij.ide.BrowserUtil;
import com.intellij.lang.annotation.AnnotationHolder;
import com.intellij.lang.annotation.ExternalAnnotator;
import com.intellij.lang.annotation.HighlightSeverity;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.editor.Document;
import com.intellij.openapi.util.TextRange;
import com.intellij.psi.PsiDocumentManager;
import com.intellij.psi.PsiFile;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Runs `npx @readystack/optout-signal-lint <file>` (the same engine as the VS Code extension / CLI) on files the user asked for. */
public class RsAnnotator extends ExternalAnnotator<RsAnnotator.Input, List<RsAnnotator.Finding>> {
  static final String NPM = "@readystack/optout-signal-lint";
  static final String NAME = "Opt-Out Signal Lint for US State Privacy Laws";
  static final String URL = "https://getreadystack.com/tools/optout-signal-lint";
  static final String PRICE = "29";
  static final Set<String> AUTO = new HashSet<>(Arrays.asList());
  static final Set<String> ON = ConcurrentHashMap.newKeySet();
  static final Set<String> TELL = ConcurrentHashMap.newKeySet();
  private static final Pattern LINE = Pattern.compile("^\\s*(\\d+)\\s+(error|warn|info|warning)\\s+(.*)$");
  private static final Pattern FIX = Pattern.compile("^\\s*->\\s*(.*)$");

  public static class Input { final String path; final String name; final String text; Input(String p, String n, String t) { path = p; name = n; text = t; } }
  public static class Finding { int line; String sev; String msg; String fix; }

  static String ext(String n) { int i = n.lastIndexOf('.'); return i < 0 ? "" : n.substring(i).toLowerCase(); }

  @Override public @Nullable Input collectInformation(@NotNull PsiFile file) {
    if (file.getVirtualFile() == null) return null;
    String path = file.getVirtualFile().getPath();
    String name = file.getName();
    if (!ON.contains(path) && !AUTO.contains(ext(name))) return null;
    return new Input(path, name, file.getText());
  }

  @Override public @Nullable List<Finding> doAnnotate(Input in) {
    List<Finding> out = new ArrayList<>();
    if (in == null) return out;
    Path dir = null;
    try {
      dir = Files.createTempDirectory("readystack");
      Path f = dir.resolve(in.name);
      Files.write(f, in.text.getBytes(StandardCharsets.UTF_8));
      boolean win = System.getProperty("os.name", "").toLowerCase().contains("win");
      ProcessBuilder pb = new ProcessBuilder(win ? "npx.cmd" : "npx", "-y", NPM, f.toString());
      pb.redirectErrorStream(false);
      Process p = pb.start();
      BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8));
      String ln; Finding cur = null;
      while ((ln = r.readLine()) != null) {
        Matcher m = LINE.matcher(ln);
        if (m.find()) { cur = new Finding(); cur.line = Integer.parseInt(m.group(1)); cur.sev = m.group(2); cur.msg = m.group(3).trim(); out.add(cur); continue; }
        Matcher x = FIX.matcher(ln);
        if (x.find() && cur != null) cur.fix = x.group(1).trim();
      }
      if (!p.waitFor(60, TimeUnit.SECONDS)) p.destroyForcibly();
    } catch (Exception e) {
      Finding err = new Finding(); err.line = -1; err.msg = "node"; out.add(err);
    } finally {
      try { if (dir != null) { Files.walk(dir).sorted(Comparator.reverseOrder()).forEach(q -> q.toFile().delete()); } } catch (Exception ignored) { }
    }
    return out;
  }

  @Override public void apply(@NotNull PsiFile file, List<Finding> findings, @NotNull AnnotationHolder holder) {
    if (findings == null) return;
    Document doc = PsiDocumentManager.getInstance(file.getProject()).getDocument(file);
    boolean failed = false; int n = 0;
    for (Finding f : findings) {
      if (f.line < 0) { failed = true; continue; }
      if (doc == null) continue;
      int ln = Math.max(0, Math.min(doc.getLineCount() - 1, f.line - 1));
      TextRange range = new TextRange(doc.getLineStartOffset(ln), doc.getLineEndOffset(ln));
      HighlightSeverity sev = "error".equals(f.sev) ? HighlightSeverity.ERROR : ("info".equals(f.sev) ? HighlightSeverity.WEAK_WARNING : HighlightSeverity.WARNING);
      holder.newAnnotation(sev, NAME + ": " + f.msg + (f.fix != null ? "  ->  " + f.fix : "")).range(range).create();
      n++;
    }
    String path = file.getVirtualFile() == null ? "" : file.getVirtualFile().getPath();
    if (!TELL.remove(path)) return;
    String body = failed
        ? "Node.js 18+ (npx) is needed to run the checks. The free web version needs nothing installed."
        : (n == 0 ? "No findings in this file." : n + (n == 1 ? " finding" : " findings") + " in this file (free).")
          + " Sweep the whole project and get the report with a licence ($" + PRICE + " once).";
    NotificationGroupManager.getInstance().getNotificationGroup("ReadyStack.optout-signal-lint")
        .createNotification(NAME, body, NotificationType.INFORMATION)
        .addAction(NotificationAction.createSimpleExpiring(failed ? "Open the web version" : "Get the licence", () -> BrowserUtil.browse(URL)))
        .notify(file.getProject());
  }
}
