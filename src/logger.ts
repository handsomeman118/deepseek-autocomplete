import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

export function getLogger(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('AI Autocomplete');
  }
  return outputChannel;
}

export function log(message: string): void {
  const logger = getLogger();
  const time = new Date().toLocaleTimeString();
  logger.appendLine(`[${time}] ${message}`);
}

export function logError(message: string, err?: unknown): void {
  const logger = getLogger();
  const time = new Date().toLocaleTimeString();
  logger.appendLine(`[${time}] ERROR: ${message}`);
  if (err instanceof Error) {
    logger.appendLine(`  ${err.message}`);
    if (err.stack) {
      logger.appendLine(`  ${err.stack}`);
    }
  }
}
