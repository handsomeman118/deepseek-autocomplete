import { CompletionContext } from './types';

/**
 * 构建 FIM prompt（prefix + suffix 格式）
 */
export function buildFimPrompt(ctx: CompletionContext): { prompt: string; suffix: string } {
  // 构建 prefix：imports + 前面的行 + 当前行前缀
  const parts: string[] = [];

  // 添加 imports
  if (ctx.imports.length > 0) {
    parts.push(ctx.imports.join('\n'));
    parts.push('');
  }

  // 添加前面的行
  if (ctx.precedingLines.length > 0) {
    parts.push(ctx.precedingLines.join('\n'));
  }

  // 添加当前行前缀
  parts.push(ctx.prefix);

  const prompt = parts.join('\n');

  // 构建 suffix：当前行后缀 + 后面的行
  const suffixParts: string[] = [];
  if (ctx.suffix) {
    suffixParts.push(ctx.suffix);
  }
  if (ctx.followingLines.length > 0) {
    suffixParts.push(ctx.followingLines.join('\n'));
  }

  const suffix = suffixParts.join('\n');

  return { prompt, suffix };
}

/**
 * 从文档中提取 import 语句
 */
export function extractImports(text: string, maxLines: number = 30): string[] {
  const lines = text.split('\n');
  const imports: string[] = [];
  const importPatterns = [
    /^\s*import\s+/,
    /^\s*from\s+\S+\s+import\s+/,
    /^\s*require\s*\(/,
    /^\s*const\s+\w+\s*=\s*require\s*\(/,
    /^\s*#include\s+/,
    /^\s*using\s+/,
    /^\s*import\s*\(/,
  ];

  for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
    const line = lines[i];
    if (importPatterns.some(pattern => pattern.test(line))) {
      imports.push(line);
    }
  }

  return imports;
}
