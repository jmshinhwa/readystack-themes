package com.getreadystack.p_k8s_removed_api_lint;

import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.fileEditor.FileEditorManager;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.psi.PsiFile;
import com.intellij.psi.PsiManager;
import org.jetbrains.annotations.NotNull;

public class RsCheckAction extends AnAction {
  @Override public @NotNull ActionUpdateThread getActionUpdateThread() { return ActionUpdateThread.BGT; }

  @Override public void update(@NotNull AnActionEvent e) {
    VirtualFile vf = e.getData(CommonDataKeys.VIRTUAL_FILE);
    e.getPresentation().setEnabledAndVisible(e.getProject() != null && vf != null && !vf.isDirectory());
  }

  @Override public void actionPerformed(@NotNull AnActionEvent e) {
    Project p = e.getProject();
    VirtualFile vf = e.getData(CommonDataKeys.VIRTUAL_FILE);
    if (p == null || vf == null || vf.isDirectory()) return;
    RsAnnotator.ON.add(vf.getPath());
    RsAnnotator.TELL.add(vf.getPath());
    FileEditorManager.getInstance(p).openFile(vf, true);
    PsiFile pf = PsiManager.getInstance(p).findFile(vf);
    if (pf != null) DaemonCodeAnalyzer.getInstance(p).restart(pf);
  }
}
