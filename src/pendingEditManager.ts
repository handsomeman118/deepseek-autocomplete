import { PendingEdit } from './llm/types';

/**
 * NES 队列管理（超时、失效、清理）
 */
export class PendingEditManager {
  private edits: PendingEdit[] = [];
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private timeout = 30_000) {}

  /**
   * 注册新编辑
   */
  set(edits: PendingEdit[]): void {
    this.edits = edits.map((e) => ({ ...e, timestamp: Date.now() }));
    this.scheduleCleanup();
  }

  /**
   * 获取当前位置的编辑
   */
  findAtPosition(uri: string, position: { line: number; character: number }): PendingEdit | null {
    this.cleanupExpired();
    return (
      this.edits.find(
        (edit) =>
          edit.document === uri &&
          edit.range.start.line === position.line &&
          edit.range.start.character === position.character
      ) ?? null
    );
  }

  /**
   * 获取下一个待处理编辑
   */
  getNext(uri: string): PendingEdit | null {
    this.cleanupExpired();
    return this.edits.find((edit) => edit.document === uri) ?? null;
  }

  /**
   * 移除已接受的编辑
   */
  remove(edit: PendingEdit): void {
    this.edits = this.edits.filter((e) => e !== edit);
  }

  /**
   * 清除所有
   */
  clear(): void {
    this.edits = [];
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 获取剩余数量
   */
  get count(): number {
    return this.edits.length;
  }

  /**
   * 文档变更时检查 pendingEdits 是否仍然有效
   */
  invalidateOnDocumentChange(
    uri: string,
    changes: readonly { range: { start: { line: number; character: number }; end: { line: number; character: number } } }[]
  ): void {
    for (const change of changes) {
      this.edits = this.edits.filter((edit) => {
        if (edit.document !== uri) return true;
        // 如果变更发生在 pendingEdit 范围内，移除
        const editRange = new RangeLike(edit.range);
        const changeRange = new RangeLike(change.range);
        if (editRange.intersects(changeRange)) return false;
        return true;
      });
    }
  }

  /**
   * 清理过期编辑
   */
  private cleanupExpired(): void {
    const now = Date.now();
    this.edits = this.edits.filter((e) => now - e.timestamp < this.timeout);
  }

  private scheduleCleanup(): void {
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    this.cleanupTimer = setTimeout(() => {
      this.cleanupTimer = null;
      this.cleanupExpired();
    }, this.timeout);
  }

  dispose(): void {
    this.clear();
  }
}

/**
 * 简单的范围交集判断
 */
class RangeLike {
  constructor(
    private range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    }
  ) {}

  intersects(other: RangeLike): boolean {
    // 如果一个范围在另一个之前，不相交
    if (this.range.end.line < other.range.start.line) return false;
    if (this.range.start.line > other.range.end.line) return false;
    // 同一行时检查字符位置
    if (this.range.end.line === other.range.start.line) {
      if (this.range.end.character < other.range.start.character) return false;
    }
    if (this.range.start.line === other.range.end.line) {
      if (this.range.start.character > other.range.end.character) return false;
    }
    return true;
  }
}
