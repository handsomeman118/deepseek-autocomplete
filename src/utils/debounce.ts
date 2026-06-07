/**
 * 多级防抖工具
 */
export class Debouncer {
  private timer: NodeJS.Timeout | null = null;
  private pendingResolve: ((value: boolean) => void) | null = null;

  /**
   * 延迟执行 fn。每次调用会取消上一次的待执行 fn。
   * @returns 如果 fn 被执行返回 true，如果被取消返回 false
   */
  debounce<T>(fn: () => Promise<T>, delayMs: number): Promise<T | null> {
    return new Promise((resolve) => {
      // 取消上一个 timer
      if (this.timer) {
        clearTimeout(this.timer);
        if (this.pendingResolve) {
          this.pendingResolve(false);
        }
      }

      if (delayMs <= 0) {
        // 立即执行
        this.pendingResolve = null;
        fn().then(resolve).catch(() => resolve(null));
        return;
      }

      this.pendingResolve = (cancelled) => {
        if (cancelled) {
          resolve(null);
        }
      };

      this.timer = setTimeout(() => {
        this.timer = null;
        this.pendingResolve = null;
        fn().then(resolve).catch(() => resolve(null));
      }, delayMs);
    });
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.pendingResolve) {
      this.pendingResolve(false);
      this.pendingResolve = null;
    }
  }

  dispose(): void {
    this.cancel();
  }
}
