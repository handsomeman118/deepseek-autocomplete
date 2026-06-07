import * as vscode from 'vscode';

/**
 * 重命名检测 + 关联位置查找
 */
export class RenameDetector {
  /**
   * 查找文档中所有出现旧标识符的位置
   */
  findRelatedOccurrences(
    document: vscode.TextDocument,
    oldName: string,
    excludeRange: { start: { line: number; character: number }; end: { line: number; character: number } }
  ): vscode.Range[] {
    const text = document.getText();
    const ranges: vscode.Range[] = [];

    // 构建标识符精确匹配正则（避免匹配子串）
    const regex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const start = document.positionAt(match.index);
      const end = document.positionAt(match.index + oldName.length);
      const range = new vscode.Range(start, end);

      // 排除已经被修改的位置
      const excludeVsRange = new vscode.Range(
        new vscode.Position(excludeRange.start.line, excludeRange.start.character),
        new vscode.Position(excludeRange.end.line, excludeRange.end.character)
      );
      if (range.intersection(excludeVsRange)) continue;

      ranges.push(range);
    }

    return ranges;
  }
}

/**
 * 转义正则特殊字符
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
