import * as vscode from 'vscode';
import { ConfigManager } from './config';
import { DeepSeekCompletionProvider } from './provider';
import { StatusBarManager } from './statusBar';
import { PendingEditManager } from './pendingEditManager';
import { EditTracker } from './editTracker';
import { RenameDetector } from './renameDetector';
import { log, logError } from './logger';

let provider: DeepSeekCompletionProvider | undefined;
let statusBar: StatusBarManager | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  log('=== AI Autocomplete activating ===');

  const config = new ConfigManager();
  const secretStorage = context.secrets;
  statusBar = new StatusBarManager();
  const pendingEditManager = new PendingEditManager();

  log(`Config: enabled=${config.enabled}, endpoint=${config.endpoint}, model=${config.model}`);
  log(`Config: debounceMs=${config.debounceMs}, maxTokens=${config.maxTokens}, temperature=${config.temperature}`);
  log(`Config: disabledLanguages=${JSON.stringify(config.disabledLanguages)}`);

  // API Key 检查
  const hasKey = await ensureApiKey(config, secretStorage);
  if (hasKey) {
    log('API Key: found');
  } else {
    log('API Key: NOT found - completions will not work until configured');
  }

  // 注册 InlineCompletionItemProvider
  log('Registering InlineCompletionItemProvider...');
  provider = new DeepSeekCompletionProvider(
    config,
    secretStorage,
    statusBar,
    pendingEditManager
  );

  const providerDisposable = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    provider
  );
  log('InlineCompletionItemProvider registered for all languages');

  // 注册命令
  const toggleCmd = vscode.commands.registerCommand('ai-autocomplete.toggle', () => {
    const current = config.enabled;
    vscode.workspace.getConfiguration('ai-autocomplete').update('enabled', !current, true);
    config.refresh();
    log(`Toggled: enabled=${!current}`);
    if (!current) {
      statusBar?.showOn();
    } else {
      statusBar?.showOff();
    }
  });

  const triggerCmd = vscode.commands.registerCommand('ai-autocomplete.trigger', () => {
    log('Manual trigger requested');
    vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
  });

  const acceptAndNextCmd = vscode.commands.registerCommand('ai-autocomplete.acceptAndNext', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const pos = editor.selection.active;
    const uri = editor.document.uri.toString();
    const edit = pendingEditManager.findAtPosition(uri, pos);
    if (edit) {
      pendingEditManager.remove(edit);
    }

    const next = pendingEditManager.getNext(uri);
    if (next) {
      const nextPos = new vscode.Position(next.range.start.line, next.range.start.character);
      editor.selection = new vscode.Selection(nextPos, nextPos);
      await new Promise(r => setTimeout(r, 50));
      vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
      statusBar?.showPendingEdits(pendingEditManager.count);
    } else {
      statusBar?.showIdle();
    }
  });

  // NES：编辑追踪
  if (config.nesEnabled) {
    log('NES enabled, registering edit tracker...');
    const editTracker = new EditTracker();
    const renameDetector = new RenameDetector();

    const changeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
      editTracker.onDidChangeDocument(event);

      setTimeout(() => {
        const rename = editTracker.detectRename(event.document);
        if (!rename) return;

        log(`NES: detected rename "${rename.oldName}" -> "${rename.newName}"`);

        const occurrences = renameDetector.findRelatedOccurrences(
          event.document,
          rename.oldName,
          rename.changeRange
        );

        if (occurrences.length > 0) {
          log(`NES: found ${occurrences.length} related occurrences`);
          const edits = occurrences.map(range => ({
            document: event.document.uri.toString(),
            range: {
              start: { line: range.start.line, character: range.start.character },
              end: { line: range.end.line, character: range.end.character },
            },
            newText: rename.newName,
            timestamp: Date.now(),
          }));
          pendingEditManager.set(edits);
          statusBar?.showPendingEdits(edits.length);
        }
      }, config.nesDebounceMs);
    });

    context.subscriptions.push(changeDisposable);
  } else {
    log('NES disabled');
  }

  // 配置变更监听
  const configDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('ai-autocomplete')) {
      config.refresh();
      log('Config reloaded');
    }
  });

  // 注册所有 disposables
  context.subscriptions.push(
    providerDisposable,
    toggleCmd,
    triggerCmd,
    acceptAndNextCmd,
    configDisposable,
    { dispose: () => provider?.dispose() },
    { dispose: () => statusBar?.dispose() }
  );

  // 初始化状态栏
  if (config.enabled) {
    statusBar.showOn();
  } else {
    statusBar.showOff();
  }

  log('=== AI Autocomplete activated successfully ===');
  log('View logs: Output panel > "AI Autocomplete"');
}

export function deactivate(): void {
  provider?.dispose();
  statusBar?.dispose();
}

/**
 * API Key 首次配置引导
 */
async function ensureApiKey(
  config: ConfigManager,
  secretStorage: vscode.SecretStorage
): Promise<boolean> {
  // 1. SecretStorage
  const stored = await secretStorage.get('deepseek-api-key');
  if (stored) return true;

  // 2. 环境变量
  const envKey = process.env.DEEPSEEK_API_KEY;
  if (envKey) {
    await secretStorage.store('deepseek-api-key', envKey);
    return true;
  }

  // 3. 配置
  if (config.apiKey) {
    await secretStorage.store('deepseek-api-key', config.apiKey);
    return true;
  }

  // 4. 都没有 → 引导用户配置
  const action = await vscode.window.showInformationMessage(
    'AI Autocomplete 需要 DeepSeek API Key',
    '配置',
    '获取 Key'
  );

  if (action === '获取 Key') {
    vscode.env.openExternal(vscode.Uri.parse('https://platform.deepseek.com/api_keys'));
  } else if (action === '配置') {
    const input = await vscode.window.showInputBox({
      prompt: '请输入 DeepSeek API Key',
      password: true,
    });
    if (input) {
      await secretStorage.store('deepseek-api-key', input);
      return true;
    }
  }
  return false;
}
