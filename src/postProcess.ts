import * as vscode from 'vscode';
import { ensureBalanced } from './utils/bracketCheck';

/**
 * 后处理管道
 */
export function postProcess(
  raw: string,
  document: vscode.TextDocument,
  position: vscode.Position,
  maxLines: number
): string {
  let text = raw;

  // Step 1: 去除 LLM 重复的前缀
  text = removeDuplicatePrefix(text, document, position);

  // Step 2: 去除与 suffix 重复的尾部
  text = removeDuplicateSuffix(text, document, position);

  // Step 3: 缩进对齐
  text = alignIndentation(text, document, position);

  // Step 4: 括号/引号配对检查
  text = ensureBalanced(text);

  // Step 5: 清理尾部空行
  text = text.replace(/\n{3,}/g, '\n\n').trimEnd();

  // Step 6: 行数限制
  const lines = text.split('\n');
  if (lines.length > maxLines) {
    text = lines.slice(0, maxLines).join('\n');
  }

  return text;
}

/**
 * 去除 LLM 重复的前缀
 */
function removeDuplicatePrefix(
  text: string,
  document: vscode.TextDocument,
  position: vscode.Position
): string {
  const linePrefix = document.lineAt(position.line).text.substring(0, position.character);
  if (!linePrefix || !text) return text;

  // 从最长匹配开始尝试
  const maxCheck = Math.min(linePrefix.length, text.length);
  for (let len = maxCheck; len > 0; len--) {
    const suffix = linePrefix.substring(linePrefix.length - len);
    if (text.startsWith(suffix)) {
      return text.substring(len);
    }
  }
  return text;
}

/**
 * 去除与光标后代码重复的尾部
 */
function removeDuplicateSuffix(
  text: string,
  document: vscode.TextDocument,
  position: vscode.Position
): string {
  const lineSuffix = document.lineAt(position.line).text.substring(position.character);
  if (!lineSuffix || !text) return text;

  // 从最长匹配开始尝试
  const maxCheck = Math.min(lineSuffix.length, text.length);
  for (let len = maxCheck; len > 0; len--) {
    const prefix = lineSuffix.substring(0, len);
    if (text.endsWith(prefix)) {
      return text.substring(0, text.length - len);
    }
  }
  return text;
}

/**
 * 缩进对齐
 *
 * LLM 返回的文本已经包含正确的绝对缩进（基于 prompt 中的上下文行）。
 * VS Code 插入 ghost text 时也会处理自动缩进。
 * 所以我们不需要再额外添加 currentIndent，否则会导致双倍缩进。
 *
 * 只做一件事：确保第一行没有多余前导空白（因为第一行接在当前行光标位置后面）。
 */
function alignIndentation(
  text: string,
  document: vscode.TextDocument,
  position: vscode.Position
): string {
  const lines = text.split('\n');
  if (lines.length <= 1) return text;

  // 第一行：去除前导空白（它接在当前行光标后面，不需要额外缩进）
  lines[0] = lines[0].trimStart();

  // 后续行：保持 LLM 返回的原始缩进，不做任何修改
  // VS Code 的 autoIndent 会在插入时处理基础缩进

  return lines.join('\n');
}
