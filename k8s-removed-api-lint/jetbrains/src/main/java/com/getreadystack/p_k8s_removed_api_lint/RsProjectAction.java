package com.getreadystack.p_k8s_removed_api_lint;

import com.intellij.ide.BrowserUtil;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.ProgressManager;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import org.jetbrains.annotations.NotNull;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/** Pro (JetBrains Marketplace licence): sweep every matching file in the project and write a dated HTML + CSV report. */
public class RsProjectAction extends AnAction {
  private static final Pattern LINE = Pattern.compile("^\\s*(\\d+)\\s+(error|warn|info|warning)\\s+(.*)$");
  private static final Pattern FIX = Pattern.compile("^\\s*->\\s*(.*)$");
  private static final String[] SKIP = {"node_modules", ".git", ".idea", "build", "dist", "out", "target", "vendor", ".gradle", "readystack-reports"};

  @Override public @NotNull ActionUpdateThread getActionUpdateThread() { return ActionUpdateThread.BGT; }

  @Override public void update(@NotNull AnActionEvent e) {
    e.getPresentation().setEnabledAndVisible(e.getProject() != null && e.getProject().getBasePath() != null);
  }

  @Override public void actionPerformed(@NotNull AnActionEvent e) { runFor(e.getProject()); }

  static void runFor(Project p) {
    if (p == null || p.getBasePath() == null) return;
    // ★the licence gate comes first — Pro never runs without a JetBrains licence stamp
    Boolean lic = RsLicense.isLicensed();
    if (!Boolean.TRUE.equals(lic)) {
      RsLicense.requestLicense(RsAnnotator.NAME + " Pro sweeps the whole project and writes a dated report. Checking the open file stays free.");
      return;
    }
    final String base = p.getBasePath();
    ProgressManager.getInstance().run(new Task.Backgroundable(p, RsAnnotator.NAME + ": checking the project", true) {
      @Override public void run(@NotNull ProgressIndicator ind) {
        List<Path> files = new ArrayList<>();
        try (Stream<Path> s = Files.walk(Paths.get(base))) {
          s.filter(Files::isRegularFile).filter(f -> !skipped(Paths.get(base).relativize(f)))
           .filter(f -> RsAnnotator.AUTO.isEmpty() || RsAnnotator.AUTO.contains(RsAnnotator.ext(f.getFileName().toString())))
           .limit(5000).forEach(files::add);
        } catch (Exception ignored) { }
        List<String[]> rows = new ArrayList<>();   // file, line, sev, msg, fix
        boolean failed = false;
        int i = 0;
        while (i < files.size() && !ind.isCanceled()) {
          List<String> cmd = new ArrayList<>();
          boolean win = System.getProperty("os.name", "").toLowerCase().contains("win");
          cmd.add(win ? "npx.cmd" : "npx"); cmd.add("-y"); cmd.add(RsAnnotator.NPM);
          int len = 0;
          while (i < files.size() && cmd.size() < 43 && len < 6000) { String f = files.get(i++).toString(); cmd.add(f); len += f.length() + 1; }
          ind.setFraction(files.isEmpty() ? 1.0 : (double) i / files.size());
          try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.environment().put("READYSTACK_NO_TELEMETRY", "1");
            Process pr = pb.start();
            BufferedReader r = new BufferedReader(new InputStreamReader(pr.getInputStream(), StandardCharsets.UTF_8));
            String ln, cur = null; String[] last = null;
            while ((ln = r.readLine()) != null) {
              if (!ln.isEmpty() && !Character.isWhitespace(ln.charAt(0))) { cur = ln.trim(); last = null; continue; }
              Matcher m = LINE.matcher(ln);
              if (m.find() && cur != null) { last = new String[]{cur, m.group(1), m.group(2), m.group(3).trim(), ""}; rows.add(last); continue; }
              Matcher x = FIX.matcher(ln);
              if (x.find() && last != null) last[4] = x.group(1).trim();
            }
            if (!pr.waitFor(180, TimeUnit.SECONDS)) pr.destroyForcibly();
          } catch (Exception ex) { failed = true; break; }
        }
        String msg;
        Path report = null;
        if (failed) {
          msg = "Node.js 18+ (npx) is needed to run the checks.";
        } else {
          try { report = write(base, files.size(), rows); } catch (Exception ignored) { }
          long withHits = rows.stream().map(a -> a[0]).distinct().count();
          msg = rows.size() + (rows.size() == 1 ? " finding" : " findings") + " in " + withHits + " of " + files.size() + " files."
              + (report != null ? " Dated report: " + Paths.get(base).relativize(report) : "");
        }
        final Path rep = report;
        var n = NotificationGroupManager.getInstance().getNotificationGroup("ReadyStack.k8s-removed-api-lint")
            .createNotification(RsAnnotator.NAME + " — whole project", msg, NotificationType.INFORMATION);
        if (rep != null) n.addAction(NotificationAction.createSimpleExpiring("Open the report", () -> BrowserUtil.browse(rep.toUri().toString())));
        n.notify(p);
      }
    });
  }

  private static boolean skipped(Path rel) {
    for (Path part : rel) { String s = part.toString(); for (String k : SKIP) if (s.equals(k)) return true; }
    return false;
  }

  private static String esc(String s) { return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;"); }

  private static String csv(String s) { return "\"" + (s == null ? "" : s.replace("\"", "\"\"")) + "\""; }

  private static Path write(String base, int scanned, List<String[]> rows) throws Exception {
    Path dir = Paths.get(base, "readystack-reports");
    Files.createDirectories(dir);
    String day = LocalDate.now().toString();
    StringBuilder h = new StringBuilder("<!doctype html><meta charset=\"utf-8\"><title>" + esc(RsAnnotator.NAME) + " report " + day + "</title>"
        + "<style>body{font:14px system-ui;margin:24px}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:4px 8px;font-size:13px}code{font-family:ui-monospace,monospace}</style>"
        + "<h1>" + esc(RsAnnotator.NAME) + "</h1><p>Checked on " + day + " · " + scanned + " files · " + rows.size() + " findings</p>"
        + "<table><tr><th>file</th><th>line</th><th>severity</th><th>finding</th><th>fix</th></tr>");
    StringBuilder c = new StringBuilder("file,line,severity,message,fix\n");
    for (String[] r : rows) {
      String rel = r[0].startsWith(base) ? r[0].substring(base.length()).replaceFirst("^[/\\\\]", "") : r[0];
      h.append("<tr><td><code>").append(esc(rel)).append("</code></td><td>").append(r[1]).append("</td><td>").append(esc(r[2]))
       .append("</td><td>").append(esc(r[3])).append("</td><td>").append(esc(r[4])).append("</td></tr>");
      c.append(csv(rel)).append(',').append(r[1]).append(',').append(r[2]).append(',').append(csv(r[3])).append(',').append(csv(r[4])).append('\n');
    }
    h.append("</table>");
    String stem = "k8s-removed-api-lint-" + day;
    Files.write(dir.resolve(stem + ".csv"), c.toString().getBytes(StandardCharsets.UTF_8));
    Path out = dir.resolve(stem + ".html");
    Files.write(out, h.toString().getBytes(StandardCharsets.UTF_8));
    return out;
  }
}
