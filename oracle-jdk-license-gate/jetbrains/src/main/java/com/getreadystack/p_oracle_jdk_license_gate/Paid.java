package com.getreadystack.p_oracle_jdk_license_gate;

import com.intellij.ide.BrowserUtil;
import com.intellij.ide.util.PropertiesComponent;
import com.intellij.notification.Notification;
import com.intellij.notification.NotificationAction;
import com.intellij.notification.NotificationGroupManager;
import com.intellij.notification.NotificationType;
import com.intellij.openapi.progress.ProgressManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.Messages;
import com.intellij.util.concurrency.AppExecutorUtil;
import com.intellij.util.io.HttpRequests;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * s175 2026-10-01 / s185 2026-10-10 - the money moment inside IntelliJ. Free: the inline check, the Java map and Fix This File.
 * Pro (JetBrains Marketplace freemium licence, product code PRSORACLEJDK): Fix All in project + the dated migration record.
 * One anonymous count per action, only when the IDE's own usage-statistics consent is on (and never in CI).
 */
final class Paid {
  static final String GROUP = "ReadyStack." + Txt.SLUG;
  static final String CLEAN_OFF = "readystack." + Txt.SLUG + ".cleanOff";
  static final String UA = "readystack-jb/" + Txt.SLUG;

  static String lang() {
    try { return com.intellij.DynamicBundle.getLocale().getLanguage(); } catch (Throwable t) { return Locale.getDefault().getLanguage(); }
  }
  static int li() { return Txt.li(lang()); }

  static boolean countingAllowed() {
    if (System.getenv("READYSTACK_NO_TELEMETRY") != null || System.getenv("CI") != null) return false;
    try {
      Class<?> c = Class.forName("com.intellij.ide.gdpr.ConsentOptions");
      Object o = c.getMethod("getInstance").invoke(null);
      return Boolean.TRUE.equals(c.getMethod("isSendingUsageStatsAllowed").invoke(o));
    } catch (Throwable t) { return false; }
  }

  /** t = use | paywall · why = [a-z_]{1,16} */
  static void count(String t, String why) {
    if (!countingAllowed()) return;
    AppExecutorUtil.getAppExecutorService().execute(() -> {
      try {
        String path = ("paywall".equals(t) ? "/paywall/jetbrains/" : "/use/jetbrains/") + Txt.SLUG;
        String body = "{\"t\":\"" + t + "\",\"slug\":\"" + Txt.SLUG + "\",\"src\":\"jetbrains\",\"why\":\"" + why + "\",\"path\":\"" + path + "\"}";
        HttpRequests.post("https://getreadystack.com/api/ev", "application/json").userAgent(UA)
          .connectTimeout(4000).readTimeout(4000).connect(r -> { r.write(body); return r.readString(); });
      } catch (Throwable ignored) { /* counting never breaks the product */ }
    });
  }

  /** s185 - JetBrains Marketplace freemium: the store sells, the IDE carries the licence (no key of our own). */
  static boolean licensed() { return Boolean.TRUE.equals(RsLicense.isLicensed()); }

  /** EDT. true when a JetBrains Marketplace licence for this plugin is active; otherwise explains the Pro part and opens the IDE's own licence dialog. */
  static boolean ensureLicense(Project p, String why) {
    Boolean lic = RsLicense.isLicensed();
    if (Boolean.TRUE.equals(lic)) return true;
    count("paywall", why);
    if (lic == null) {
      Messages.showInfoMessage(p, "The IDE is still loading licences. Try again in a few seconds.", Txt.TITLE);
      return false;
    }
    String msg = "Pro (JetBrains Marketplace licence): fix every Oracle JDK line across the whole project in one step "
      + "- GitHub Actions, Dockerfiles, Gradle toolchains, dev containers, Homebrew, winget - and write a dated migration record "
      + "(every line changed, every line that still needs a choice, the SHA-256 of every file read) for your team lead or an auditor.\n\n"
      + "Free stays free: the Java map, the inline check and Fix This File.";
    int pick = Messages.showDialog(p, msg, Txt.TITLE, new String[]{"Get a licence", Messages.getCancelButton()}, 0, Messages.getInformationIcon());
    if (pick == 0) RsLicense.requestLicense("Fix every Oracle JDK line in the project and write a dated migration record.");
    return false;
  }

  static void notify(Project p, String body, NotificationAction... actions) {
    Notification n = NotificationGroupManager.getInstance().getNotificationGroup(GROUP).createNotification(Txt.TITLE, body, NotificationType.INFORMATION);
    for (NotificationAction a : actions) n.addAction(a);
    n.notify(p);
  }

  /** After the map: findings get the Pro fix; a clean project hears the company line once. */
  static void offerAfterMap(Project p, int finds) {
    if (licensed()) return;
    if (finds > 0) {
      count("paywall", "map_finds");
      notify(p, finds + (finds == 1 ? " line pulls" : " lines pull") + " an Oracle-licensed Java build. Fix This File is free. "
          + "Pro fixes every line across the project in one step and writes the dated migration record.",
        NotificationAction.createSimpleExpiring("Fix all in project (Pro)", () -> FixActions.fixProject(p)));
      return;
    }
    PropertiesComponent app = PropertiesComponent.getInstance();
    PropertiesComponent prj = PropertiesComponent.getInstance(p);
    if (app.getValue(CLEAN_OFF) != null || prj.getValue(CLEAN_OFF) != null) return;
    prj.setValue(CLEAN_OFF, Engine.today());
    count("paywall", "clean_offer");
    notify(p, Txt.CLEAN[li()],
      NotificationAction.createSimpleExpiring("Dated all-clear record (Pro)", () -> Report.run(p)),
      NotificationAction.createSimpleExpiring("Don't show again", () -> app.setValue(CLEAN_OFF, Engine.today())));
  }

  private Paid() { }
}
