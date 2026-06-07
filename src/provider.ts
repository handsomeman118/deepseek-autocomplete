import * as vscode from 'vscode';
import { ConfigManager } from './config';
import { DeepSeekClient } from './llm/deepseek';
import { gatherContext } from './context';
import { postProcess } from './postProcess';
import { CompletionCache } from './cache';
import { ErrorHandler } from './errorHandler';
import { StatusBarManager } from './statusBar';
import { Debouncer } from './utils/debounce';
import { PendingEditManager } from './pendingEditManager';
import { log, logError } from './logger';

export class DeepSeekCompletionProvider implements vscode.InlineCompletionItemProvider {
  private abortController: AbortController | null = null;
  private debouncer: Debouncer;
  private llmClient: DeepSeekClient;
  private cache: CompletionCache;
  private errorHandler: ErrorHandler;
  private statusBar: StatusBarManager;
  private pendingEditManager: PendingEditManager;
  private config: ConfigManager;
  private secretStorage: vscode.SecretStorage;
  private requestCount = 0;

  constructor(
    config: ConfigManager,
    secretStorage: vscode.SecretStorage,
    statusBar: StatusBarManager,
    pendingEditManager: PendingEditManager
  ) {
    this.config = config;
    this.secretStorage = secretStorage;
    this.statusBar = statusBar;
    this.pendingEditManager = pendingEditManager;
    this.llmClient = new DeepSeekClient(config);
    this.cache = new CompletionCache();
    this.errorHandler = new ErrorHandler();
    this.debouncer = new Debouncer();
    log('Provider constructed');
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    this.requestCount++;
    const reqId = this.requestCount;

    log(`[#${reqId}] Provider called: ${document.fileName}:${position.line}:${position.character} trigger=${context.triggerKind}`);

    // 1. 全局开关检查
    if (!this.config.enabled) {
      log(`[#${reqId}] Skipped: disabled`);
      return undefined;
    }

    // 2. shouldSkip 检查
    if (this.shouldSkip(document, position, context)) {
      log(`[#${reqId}] Skipped: shouldSkip=true lang=${document.languageId}`);
      return undefined;
    }

    // 3. 检查是否有 pending NES edits
    const pendingEdit = this.pendingEditManager.findAtPosition(
      document.uri.toString(),
      position
    );
    if (pendingEdit) {
      log(`[#${reqId}] Returning NES pending edit`);
      const item = new vscode.InlineCompletionItem(pendingEdit.newText);
      item.range = new vscode.Range(
        new vscode.Position(pendingEdit.range.start.line, pendingEdit.range.start.character),
        new vscode.Position(pendingEdit.range.end.line, pendingEdit.range.end.character)
      );
      item.command = {
        command: 'ai-autocomplete.acceptAndNext',
        title: 'Accept and next',
      };
      return [item];
    }

    // 4. 检查缓存
    const cached = this.cache.get(document, position);
    if (cached) {
      log(`[#${reqId}] Cache hit`);
      const item = new vscode.InlineCompletionItem(cached);
      item.range = new vscode.Range(position, position);
      return [item];
    }

    // 5. 取消旧请求
    if (this.abortController) {
      log(`[#${reqId}] Aborting previous request`);
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    // 6. 获取 API Key
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      log(`[#${reqId}] No API key, skipping`);
      return undefined;
    }

    // 7. 确定防抖延迟
    const delayMs = this.getDebounceDelay(context);
    log(`[#${reqId}] Debounce: ${delayMs}ms`);

    // 8. 防抖 + 请求
    const result = await this.debouncer.debounce(async () => {
      log(`[#${reqId}] Starting API request...`);
      this.statusBar.showLoading();

      try {
        // 收集上下文
        const ctx = gatherContext(document, position, this.config);
        log(`[#${reqId}] Context: lang=${ctx.language} prefix="${ctx.prefix.substring(0, 50)}..." suffix="${ctx.suffix.substring(0, 30)}..."`);

        // 调用 DeepSeek FIM API
        const completion = await this.llmClient.stream(ctx, apiKey, {
          signal: this.abortController!.signal,
        });

        log(`[#${reqId}] API response: ${completion.length} chars`);
        this.statusBar.showOn();
        return completion;
      } catch (err) {
        logError(`[#${reqId}] API request failed`, err);
        this.statusBar.showOn();
        this.errorHandler.handle(err);
        return null;
      }
    }, delayMs);

    if (!result) {
      log(`[#${reqId}] No result (debounced or failed)`);
      return undefined;
    }

    // 9. 后处理
    const finalText = postProcess(result, document, position, this.config.maxLines);
    if (!finalText.trim()) {
      log(`[#${reqId}] Empty after postProcess`);
      return undefined;
    }

    log(`[#${reqId}] Returning completion: ${finalText.length} chars, ${finalText.split('\n').length} lines`);

    // 10. 缓存结果
    this.cache.set(document, position, finalText);

    // 11. 返回 InlineCompletionItem
    const item = new vscode.InlineCompletionItem(finalText);
    item.range = new vscode.Range(position, position);
    return [item];
  }

  private shouldSkip(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext
  ): boolean {
    if (document.lineCount === 0) return true;
    if (!this.config.isLanguageEnabled(document.languageId)) return true;
    if (context.selectedCompletionInfo) return true;

    const lineText = document.lineAt(position.line).text;
    if (lineText.trim().length === 0) {
      if (position.line > 0 && document.lineAt(position.line - 1).text.trim().length === 0) {
        return true;
      }
    }

    const trimmed = lineText.trim();
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('/*')
    ) {
      return true;
    }

    const textBeforeCursor = lineText.substring(0, position.character);
    const singleQuotes = (textBeforeCursor.match(/'/g) || []).length;
    const doubleQuotes = (textBeforeCursor.match(/"/g) || []).length;
    const backticks = (textBeforeCursor.match(/`/g) || []).length;
    if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0) {
      return true;
    }

    return false;
  }

  private getDebounceDelay(context: vscode.InlineCompletionContext): number {
    if (context.triggerKind === vscode.InlineCompletionTriggerKind.Invoke) {
      return 0;
    }
    return this.config.debounceMs;
  }

  private async getApiKey(): Promise<string | undefined> {
    const stored = await this.secretStorage.get('deepseek-api-key');
    if (stored) return stored;

    const envKey = process.env.DEEPSEEK_API_KEY;
    if (envKey) {
      await this.secretStorage.store('deepseek-api-key', envKey);
      return envKey;
    }

    const configKey = this.config.apiKey;
    if (configKey) {
      await this.secretStorage.store('deepseek-api-key', configKey);
      return configKey;
    }

    return undefined;
  }

  dispose(): void {
    this.debouncer.dispose();
    if (this.abortController) {
      this.abortController.abort();
    }
    this.cache.clear();
  }
}
