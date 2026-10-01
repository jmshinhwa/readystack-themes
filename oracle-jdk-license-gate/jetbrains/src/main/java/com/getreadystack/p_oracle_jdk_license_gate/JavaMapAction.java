package com.getreadystack.p_oracle_jdk_license_gate;

import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import org.jetbrains.annotations.NotNull;

public class JavaMapAction extends AnAction {
  @Override public @NotNull ActionUpdateThread getActionUpdateThread() { return ActionUpdateThread.BGT; }
  @Override public void update(@NotNull AnActionEvent e) { e.getPresentation().setEnabledAndVisible(e.getProject() != null); }
  @Override public void actionPerformed(@NotNull AnActionEvent e) { if (e.getProject() != null) JavaMap.show(e.getProject(), null); }
}
