import * as vscode from 'vscode';

/**
 * 错误处理（限频通知）
 */
export class ErrorHandler {
  private lastErrorTime = 0;
  private lastErrorMsg = '';
  private cooldown = 30_000; // 同一错误 30 秒内只通知一次

  handle(err: unknown): void {
    const error = err as Error & { status?: number };
    const now = Date.now();

    // AbortError 静默处理
    if (error.name === 'AbortError') {
      return;
    }

    // 限频：同一错误 30 秒内只通知一次
    if (error.message === this.lastErrorMsg && now - this.lastErrorTime < this.cooldown) {
      return;
    }
    this.lastErrorTime = now;
    this.lastErrorMsg = error.message;

    // 根据错误类型显示不同提示
    if (error.status === 401) {
      vscode.window.showErrorMessage('DeepSeek API Key 无效，请检查配置');
    } else if (error.status === 429) {
      vscode.window.showWarningMessage('DeepSeek API 限频，稍后重试');
    } else if (error.status === 500 || error.status === 503) {
      vscode.window.showWarningMessage('DeepSeek 服务暂时不可用');
    } else {
      vscode.window.showWarningMessage(`AI Autocomplete 请求失败: ${error.message}`);
    }
  }
}
