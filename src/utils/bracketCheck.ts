/**
 * 括号配对检查（跳过字符串和注释中的括号）
 */
export function ensureBalanced(text: string): string {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  let lastSafePos = text.length;
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = i + 1 < text.length ? text[i + 1] : '';

    // 块注释处理
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++; // 跳过 '/'
      }
      continue;
    }

    // 行注释处理
    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
      }
      continue;
    }

    // 字符串处理
    if (inString) {
      if (ch === '\\') {
        i++; // 转义字符，跳过下一个
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      continue;
    }

    // 检测注释开始
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    // 检测字符串开始
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }

    // 括号检查
    if ('([{'.includes(ch)) {
      stack.push(ch);
    } else if (')]}'.includes(ch)) {
      if (stack.length === 0 || stack[stack.length - 1] !== pairs[ch]) {
        return text.substring(0, lastSafePos);
      }
      stack.pop();
    } else if (ch === '\n' && stack.length === 0) {
      lastSafePos = i + 1;
    }
  }

  if (stack.length > 0) {
    return text.substring(0, lastSafePos);
  }

  return text;
}
