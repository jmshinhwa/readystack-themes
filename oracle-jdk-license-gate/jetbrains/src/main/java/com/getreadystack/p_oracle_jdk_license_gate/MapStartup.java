package com.getreadystack.p_oracle_jdk_license_gate;

import com.intellij.ide.util.PropertiesComponent;
import com.intellij.notification.NotificationAction;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.startup.ProjectActivity;
import com.intellij.util.concurrency.AppExecutorUtil;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.concurrent.TimeUnit;

/** s175 - once per project, a Java project hears one line: how many places choose its Java, and the map that answers it. */
public class MapStartup implements ProjectActivity {
  static final String DONE = "readystack." + Txt.SLUG + ".mapOffered";

  @Override public @Nullable Object execute(@NotNull Project project, @NotNull Continuation<? super Unit> continuation) {
    AppExecutorUtil.getAppScheduledExecutorService().schedule(() -> offer(project), 15, TimeUnit.SECONDS);
    return Unit.INSTANCE;
  }

  static void offer(Project p) {
    try {
      if (p.isDisposed()) return;
      PropertiesComponent st = PropertiesComponent.getInstance(p);
      if (st.getValue(DONE) != null) return;
      JavaMap.Data d = JavaMap.collect(p, 300);
      int pins = d.pins(), finds = d.finds();
      if (pins == 0 && d.java == 0) return;            // not a Java project: say nothing
      st.setValue(DONE, d.day);
      String[] M = Txt.MAP[Paid.li()];
      String msg = (pins > 0 ? M[0] : M[1]).replace("{t}", Txt.TITLE).replace("{n}", String.valueOf(pins)).replace("{s}", pins == 1 ? "" : "s")
        .replace("{sum}", JavaMap.summary(d)).replace("{m}", String.valueOf(finds));
      Paid.count("use", "java_map_offer");
      Paid.notify(p, msg,
        NotificationAction.createSimpleExpiring(M[2], () -> JavaMap.show(p, d)),
        NotificationAction.createSimpleExpiring(M[3], () -> { }));
    } catch (Throwable ignored) { /* the offer never breaks the IDE */ }
  }
}
