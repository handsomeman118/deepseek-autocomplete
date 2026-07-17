import * as vscode from 'vscode';

/**
 * 状态栏指示器
 */
export class StatusBarManager {
  private item: vscode.StatusBarItem;
  private loadingTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'ai-autocomplete.settings';
    this.showIdle();
    this.item.show();
  }

  showOn(): void {
    this.stopLoading();
    this.item.text = '$(sparkle) AI';
    this.item.tooltip = 'AI Autocomplete 已开启（点击设置）';
    this.item.backgroundColor = undefined;
  }

  showOff(): void {
    this.stopLoading();
    this.item.text = '$(circle-slash) AI';
    this.item.tooltip = 'AI Autocomplete 已关闭（点击设置）';
    this.item.backgroundColor = undefined;
  }

  showIdle(): void {
    this.stopLoading();
    this.item.text = '$(sparkle) AI';
    this.item.tooltip = 'AI Autocomplete 已就绪（点击设置）';
    this.item.backgroundColor = undefined;
  }

  showLoading(): void {
    if (this.loadingTimer) return; // 已经在 loading
    this.item.text = '$(loading~spin) AI';
    this.item.tooltip = 'Requesting completion...';
    // 5 秒后自动回到 idle，防止卡在 loading 状态
    this.loadingTimer = setTimeout(() => {
      this.showIdle();
    }, 5000);
  }

  private stopLoading(): void {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
  }

  showWarning(msg: string): void {
    this.stopLoading();
    this.item.text = '$(warning) AI';
    this.item.tooltip = msg;
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }

  showError(msg: string): void {
    this.stopLoading();
    this.item.text = '$(error) AI';
    this.item.tooltip = msg;
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  }

  showPendingEdits(count: number): void {
    this.stopLoading();
    this.item.text = `$(link) AI (${count})`;
    this.item.tooltip = `${count} pending edit(s) - Tab to accept, Esc to cancel`;
    this.item.backgroundColor = undefined;
  }

  dispose(): void {
    this.stopLoading();
    this.item.dispose();
  }
}
