import * as vscode from 'vscode';

export class ConfigManager {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration('ai-autocomplete');
  }

  refresh(): void {
    this.config = vscode.workspace.getConfiguration('ai-autocomplete');
  }

  get enabled(): boolean {
    return this.config.get<boolean>('enabled', true);
  }

  get endpoint(): string {
    return this.config.get<string>('endpoint', 'https://api.deepseek.com/beta');
  }

  get apiKey(): string {
    return this.config.get<string>('apiKey', '');
  }

  get model(): string {
    return this.config.get<string>('model', 'deepseek-v4-pro');
  }

  get maxTokens(): number {
    return this.config.get<number>('maxTokens', 1024);
  }

  get temperature(): number {
    return this.config.get<number>('temperature', 0.2);
  }

  get debounceMs(): number {
    return this.config.get<number>('debounceMs', 300);
  }

  get contextLinesBefore(): number {
    return this.config.get<number>('contextLines.before', 50);
  }

  get contextLinesAfter(): number {
    return this.config.get<number>('contextLines.after', 5);
  }

  get maxLines(): number {
    return this.config.get<number>('maxLines', 15);
  }

  get enabledLanguages(): string[] {
    return this.config.get<string[]>('enabledLanguages', ['*']);
  }

  get disabledLanguages(): string[] {
    return this.config.get<string[]>('disabledLanguages', ['markdown', 'json', 'jsonc', 'plaintext', 'log']);
  }

  get nesEnabled(): boolean {
    return this.config.get<boolean>('nes.enabled', true);
  }

  get nesDebounceMs(): number {
    return this.config.get<number>('nes.debounceMs', 800);
  }

  get nesTimeout(): number {
    return this.config.get<number>('nes.timeout', 30000);
  }

  get nesUseLlm(): boolean {
    return this.config.get<boolean>('nes.useLlm', false);
  }

  isLanguageEnabled(languageId: string): boolean {
    if (this.disabledLanguages.includes(languageId)) {
      return false;
    }
    const enabled = this.enabledLanguages;
    return enabled.includes('*') || enabled.includes(languageId);
  }
}
