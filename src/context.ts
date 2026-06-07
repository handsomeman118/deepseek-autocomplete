import * as vscode from 'vscode';
import * as path from 'path';
import { CompletionContext } from './llm/types';
import { extractImports } from './llm/prompt';
import { ConfigManager } from './config';

/**
 * 收集补全上下文
 */
export function gatherContext(
  document: vscode.TextDocument,
  position: vscode.Position,
  config: ConfigManager
): CompletionContext {
  const beforeCount = config.contextLinesBefore;
  const afterCount = config.contextLinesAfter;

  // 光标前的行
  const startLine = Math.max(0, position.line - beforeCount);
  const precedingLines: string[] = [];
  for (let i = startLine; i < position.line; i++) {
    precedingLines.push(document.lineAt(i).text);
  }

  // 光标后的行
  const endLine = Math.min(document.lineCount - 1, position.line + afterCount);
  const followingLines: string[] = [];
  for (let i = position.line + 1; i <= endLine; i++) {
    followingLines.push(document.lineAt(i).text);
  }

  // 当前行拆分
  const currentLine = document.lineAt(position.line).text;
  const prefix = currentLine.substring(0, position.character);
  const suffix = currentLine.substring(position.character);

  // 提取 imports
  const fullText = document.getText();
  const imports = extractImports(fullText);

  // 相对路径
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const relativePath = workspaceFolder
    ? path.relative(workspaceFolder.uri.fsPath, document.fileName)
    : path.basename(document.fileName);

  return {
    language: document.languageId,
    fileName: path.basename(document.fileName),
    relativePath,
    prefix,
    suffix,
    precedingLines,
    followingLines,
    imports,
    cursorLine: position.line,
    cursorColumn: position.character,
  };
}
