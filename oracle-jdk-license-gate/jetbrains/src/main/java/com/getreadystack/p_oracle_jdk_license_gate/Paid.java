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
 * s175 2026-10-01 - the money moment inside IntelliJ. Free: the inline check and the Java map. Paid: the dated project
 * report. Keys are checked by our own server (/api/lic, which asks Whop) - the same key a VS Code buyer gets.
 * One anonymous count per action, only when the IDE's own usage-statistics consent is on (and never in CI).
 */
final class Paid {
  static final String GROUP = "ReadyStack." + Txt.SLUG;
  static final String KEY = "readystack.key." + Txt.SLUG;
  static final String KEY_DAY = KEY + ".day";
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

  static String buyUrl() { return Txt.BUY_URL + "?ref=jetbrains"; }
  static String teamUrl() { return Txt.TEAM_URL + "?ref=jetbrains"; }

  /** true = valid · false = refused · null = could not reach the server */
  static Boolean validate(String key) {
    try {
      String u = "https://getreadystack.com/api/lic?key=" + URLEncoder.encode(key, StandardCharsets.UTF_8) + "&slug=" + Txt.SLUG;
      String s = HttpRequests.request(u).userAgent(UA).accept("application/json").connectTimeout(8000).readTimeout(8000).readString();
      return s != null && s.replace(" ", "").contains("\"ok\":true");
    } catch (HttpRequests.HttpStatusException e) {
      return false;
    } catch (Throwable t) {
      return null;
    }
  }

  static String storedKey() { String k = PropertiesComponent.getInstance().getValue(KEY); return k == null || k.trim().isEmpty() ? null : k.trim(); }
  static boolean hasKey() { return storedKey() != null; }

  private static Boolean validateWithProgress(Project p, String key) {
    Boolean[] r = new Boolean[1];
    ProgressManager.getInstance().runProcessWithProgressSynchronously(() -> r[0] = validate(key), "Checking licence key", true, p);
    return r[0];
  }

  /** EDT. true when a valid key is in hand (stored key re-checked; offline keeps a key that was valid before). */
  static boolean ensureKey(Project p, String why) {
    String k = storedKey();
    if (k != null) {
      Boolean ok = validateWithProgress(p, k);
      if (Boolean.TRUE.equals(ok)) { PropertiesComponent.getInstance().setValue(KEY_DAY, Engine.today()); return true; }
      if (ok == null && PropertiesComponent.getInstance().getValue(KEY_DAY) != null) return true;
    }
    count("paywall", why);
    String[] T = Txt.TEAM[li()];
    String msg = "The dated project report is the paid part: every line that pulls an Oracle-licensed Java build, the free Temurin or "
      + "Corretto line for each, the JDKs this IDE uses and the SHA-256 of every file read - written as a file for your team lead, "
      + "an auditor or CI.\n\nLicence key: $" + Txt.PRICE + " once.  " + T[0];
    int pick = Messages.showDialog(p, msg, Txt.TITLE,
      new String[]{"Enter licence key", "Get a licence ($" + Txt.PRICE + " once)", T[1], Messages.getCancelButton()}, 0, Messages.getInformationIcon());
    if (pick == 1) { BrowserUtil.browse(buyUrl()); return false; }
    if (pick == 2) { BrowserUtil.browse(teamUrl()); return false; }
    if (pick != 0) return false;
    String in = Messages.showInputDialog(p, "Paste the licence key from your receipt or the thanks page.", Txt.TITLE, null);
    if (in == null || in.trim().isEmpty()) return false;
    Boolean ok = validateWithProgress(p, in.trim());
    if (Boolean.TRUE.equals(ok)) {
      PropertiesComponent.getInstance().setValue(KEY, in.trim());
      PropertiesComponent.getInstance().setValue(KEY_DAY, Engine.today());
      count("use", "key_ok");
      return true;
    }
    Messages.showWarningDialog(p, ok == null
      ? "getreadystack.com could not be reached to check the key. Check the connection and try again."
      : "That key was not accepted for " + Txt.TITLE + ". Copy it again from the thanks page or the Whop receipt.", Txt.TITLE);
    return false;
  }

  static void notify(Project p, String body, NotificationAction... actions) {
    Notification n = NotificationGroupManager.getInstance().getNotificationGroup(GROUP).createNotification(Txt.TITLE, body, NotificationType.INFORMATION);
    for (NotificationAction a : actions) n.addAction(a);
    n.notify(p);
  }

  /** After the map: the line that answers the company, once per project (clean) or with the count (findings). */
  static void offerAfterMap(Project p, int finds) {
    if (hasKey()) return;
    String[] T = Txt.TEAM[li()];
    if (finds > 0) {
      count("paywall", "map_finds");
      notify(p, finds + (finds == 1 ? " line pulls" : " lines pull") + " an Oracle-licensed Java build. The dated project report "
          + "(every line, the free line for each, the SHA-256 of every file read) is the paid part: $" + Txt.PRICE + " once. " + T[0],
        NotificationAction.createSimpleExpiring("Write the dated report", () -> Report.run(p)),
        NotificationAction.createSimpleExpiring(T[1], () -> BrowserUtil.browse(teamUrl())));
      return;
    }
    PropertiesComponent app = PropertiesComponent.getInstance();
    PropertiesComponent prj = PropertiesComponent.getInstance(p);
    if (app.getValue(CLEAN_OFF) != null || prj.getValue(CLEAN_OFF) != null) return;
    prj.setValue(CLEAN_OFF, Engine.today());
    count("paywall", "clean_offer");
    notify(p, Txt.CLEAN[li()] + " " + T[0],
      NotificationAction.createSimpleExpiring(T[1], () -> BrowserUtil.browse(teamUrl())),
      NotificationAction.createSimpleExpiring("Dated all-clear report ($" + Txt.PRICE + ")", () -> Report.run(p)),
      NotificationAction.createSimpleExpiring("Don't show again", () -> app.setValue(CLEAN_OFF, Engine.today())));
  }

  private Paid() { }
}
