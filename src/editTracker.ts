import * as vscode from 'vscode';
import { EditRecord, RenameInfo } from './llm/types';

/**
 * 编辑历史追踪（含文档快照）
 */
export class EditTracker {
  private snapshots = new Map<string, string>();
  private recentEdits: EditRecord[] = [];
  private maxHistory = 50;

  /**
   * 文档变更时记录编辑
   */
  onDidChangeDocument(event: vscode.TextDocumentChangeEvent): void {
    const uri = event.document.uri.toString();

    // 获取快照（变更前的文档内容）
    const oldText = this.snapshots.get(uri);

    for (const change of event.contentChanges) {
      let oldFragment = '';
      if (oldText) {
        const offset = this.getOffset(oldText, change.range);
        oldFragment = oldText.substring(offset, offset + change.rangeLength);
      }

      this.recentEdits.push({
        document: uri,
        range: {
          start: { line: change.range.start.line, character: change.range.start.character },
          end: { line: change.range.end.line, character: change.range.end.character },
        },
        oldText: oldFragment,
        newText: change.text,
        timestamp: Date.now(),
      });
    }

    // 保留最近 N 条
    if (this.recentEdits.length > this.maxHistory) {
      this.recentEdits = this.recentEdits.slice(-this.maxHistory);
    }

    // 更新快照
    this.snapshots.set(uri, event.document.getText());
  }

  /**
   * 检测最近的编辑是否为标识符重命名
   */
  detectRename(document: vscode.TextDocument): RenameInfo | null {
    const uri = document.uri.toString();
    const now = Date.now();

    // 取最近 500ms 内的编辑
    const recent = this.recentEdits.filter(
      (e) => e.document === uri && now - e.timestamp < 500
    );
    if (recent.length === 0) return null;

    // 合并相邻的编辑
    const merged = this.mergeAdjacentEdits(recent);

    // 检查是否符合标识符重命名模式
    for (const edit of merged) {
      const oldId = this.extractIdentifier(edit.oldText);
      const newId = this.extractIdentifier(edit.newText);

      if (oldId && newId && oldId !== newId) {
        return {
          oldName: oldId,
          newName: newId,
          changeRange: edit.range,
        };
      }
    }

    return null;
  }

  /**
   * 提取标识符
   */
  private extractIdentifier(text: string): string | null {
    if (!text) return null;
    const match = text.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/);
    return match ? match[0] : null;
  }

  /**
   * 合并相邻的编辑
   */
  private mergeAdjacentEdits(edits: EditRecord[]): EditRecord[] {
    if (edits.length <= 1) return edits;

    // 按位置排序
    const sorted = [...edits].sort((a, b) => {
      if (a.range.start.line !== b.range.start.line) {
        return a.range.start.line - b.range.start.line;
      }
      return a.range.start.character - b.range.start.character;
    });

    // 简单合并：取第一个和最后一个
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    return [
      {
        ...first,
        oldText: sorted.map((e) => e.oldText).join(''),
        newText: sorted.map((e) => e.newText).join(''),
        range: {
          start: first.range.start,
          end: last.range.end,
        },
      },
    ];
  }

  /**
   * 将 (line, character) 转换为文本偏移量
   */
  private getOffset(text: string, range: { start: { line: number; character: number } }): number {
    const lines = text.split('\n');
    let offset = 0;
    for (let i = 0; i < range.start.line; i++) {
      offset += lines[i].length + 1; // +1 for \n
    }
    return offset + range.start.character;
  }

  /**
   * 初始化文档快照
   */
  initSnapshot(document: vscode.TextDocument): void {
    this.snapshots.set(document.uri.toString(), document.getText());
  }

  /**
   * 清理
   */
  dispose(): void {
    this.snapshots.clear();
    this.recentEdits = [];
  }
}
