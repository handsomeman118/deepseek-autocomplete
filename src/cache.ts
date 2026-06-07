import * as vscode from 'vscode';
import { hash } from './utils/hash';

interface CacheEntry {
  text: string;
  version: number;
  timestamp: number;
}

/**
 * LRU + TTL 缓存（带文档版本号）
 */
export class CompletionCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 100, ttlMs: number = 30000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  /**
   * 从缓存获取补全结果
   */
  get(document: vscode.TextDocument, position: vscode.Position): string | null {
    const key = this.buildKey(document, position);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // 检查 TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 检查文档版本（文档已变更则缓存失效）
    if (entry.version !== document.version) {
      this.cache.delete(key);
      return null;
    }

    return entry.text;
  }

  /**
   * 存入缓存
   */
  set(document: vscode.TextDocument, position: vscode.Position, text: string): void {
    const key = this.buildKey(document, position);

    // LRU 淘汰
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, {
      text,
      version: document.version,
      timestamp: Date.now(),
    });
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 构建缓存键：URI:version:line:character:hash(prefix)
   */
  private buildKey(document: vscode.TextDocument, position: vscode.Position): string {
    const line = document.lineAt(position.line).text;
    const prefix = line.substring(Math.max(0, position.character - 200), position.character);
    return `${document.uri.toString()}:${document.version}:${position.line}:${position.character}:${hash(prefix)}`;
  }
}
