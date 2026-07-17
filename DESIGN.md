# DeepSeek AI Autocomplete — 技术方案 v2

> 基于 VS Code `InlineCompletionItemProvider` API + DeepSeek Coder FIM，实现类 Copilot 的代码补全插件

---

## 一、功能清单（44 项）

### 核心补全功能

| # | 功能 | 说明 |
|---|------|------|
| F1 | **行内代码补全（Ghost Text）** | 用户输入时自动出现灰色半透明补全预览，Tab 接受 |
| F2 | **FIM 补全（Fill-in-the-Middle）** | 调用 DeepSeek 的 FIM 端点（`{base_url}/completions`），同时理解光标前后的代码 |
| F3 | **多行补全** | 补全整个代码块（函数体、if 块、循环等），自适应行数上限 |
| F4 | **流式渲染** | SSE 流式返回，ghost text 逐字增长，用户即时看到补全内容 |
| F5 | **智能触发** | 输入停顿后自动触发；换行立即触发；跳过无意义场景 |
| F6 | **请求取消** | 用户继续输入时自动取消上一次请求，防止过时补全干扰 |
| F7 | **上下文感知** | 收集光标前 50 行 + 后 5 行 + 文件路径 + 语言 + imports 作为 prompt 上下文 |
| F8 | **手动触发** | 快捷键 `Alt+\` 手动触发补全，绕过防抖 |
| F9 | **全局开关** | 命令面板一键开启/关闭补全，状态栏显示当前状态 |

### 接受与交互功能

| # | 功能 | 说明 |
|---|------|------|
| F10 | **Tab 全部接受** | 按 Tab 一次性接受整个补全 |
| F11 | **逐词接受** | `Ctrl+→` 只接受下一个单词，剩余部分保持 ghost text |
| F12 | **逐行接受** | `Ctrl+Shift+→` 接受下一行，剩余部分保持 ghost text |
| F13 | **Esc 拒绝** | 按 Esc 关闭当前补全，不做任何修改 |
| F14 | **循环切换** | 多候选时 `Alt+]` / `Alt+[` 在候选间切换 |

### 关联编辑功能（NES — Next Edit Suggestions）

| # | 功能 | 说明 |
|---|------|------|
| F35 | **变量重命名关联** | 用户修改变量名后，自动检测同文件内所有旧变量名出现位置，ghost text 提示新名称 |
| F36 | **函数签名变更关联** | 修改函数参数列表后，自动在所有调用点提示更新参数 |
| F37 | **import 路径变更关联** | 修改 import 路径后，自动在文件内其他引用处提示更新 |
| F38 | **Tab 跳转接受** | 在位置 A Tab 接受后，光标自动跳到下一个关联位置 B，继续 Tab 接受 |
| F39 | **编辑历史追踪** | 记录最近的文档变更，保存变更前快照用于比对 |
| F40 | **标识符提取** | 使用正则提取变更前后的标识符，判断是否为重命名操作 |
| F41 | **作用域感知** | 只在相同作用域内查找关联（函数内、类内、文件级） |
| F42 | **NES 独立开关** | 关联编辑可独立于代码补全开关 |
| F43 | **NES 延迟触发** | 编辑完成后延迟 800ms 再触发关联分析 |
| F44 | **LLM 辅助判断（可选）** | 复杂场景调用 DeepSeek 判断哪些位置需要同步修改 |
| F45 | **NES 取消** | Esc 一键取消所有待处理的关联编辑 |
| F46 | **NES 超时自动清除** | pendingEdits 超过 30 秒未操作自动清除 |
| F47 | **NES 文档变更失效** | 文档发生新编辑时，过期的 pendingEdits 自动失效 |

### 后处理功能

| # | 功能 | 说明 |
|---|------|------|
| F15 | **重复前缀去除** | LLM 有时会重复光标前已有的文字，自动去除 |
| F16 | **缩进对齐** | 多行补全的缩进自动对齐到当前行的缩进级别 |
| F17 | **括号/引号配对检查** | 检查补全内容的括号和引号是否配对，不配对则截断 |
| F18 | **自适应行数限制** | 单行补全限 1 行，块补全限 15 行，可配置上限 |
| F19 | **尾部空行清理** | 移除补全末尾多余的空行 |
| F20 | **重复内容去重** | 如果补全内容与光标后已有代码重复，自动截断 |

### 缓存功能

| # | 功能 | 说明 |
|---|------|------|
| F21 | **结果缓存** | 按 (文件 URI, 光标位置, 前缀 hash) 缓存，30 秒 TTL，最多 100 条 |
| F22 | **前缀匹配复用** | 用户逐字接受补全时，剩余部分可从缓存复用 |
| F23 | **文档变更失效** | 文件内容变化时自动失效相关缓存 |

### 配置功能

| # | 功能 | 说明 |
|---|------|------|
| F24 | **Settings UI 配置** | 通过 VS Code 设置界面配置所有选项 |
| F25 | **API 端点配置** | 支持自定义 DeepSeek API 地址（兼容第三方代理） |
| F26 | **API Key 管理** | 支持直接输入或环境变量引用，存储在 SecretStorage |
| F27 | **模型选择** | 使用 `deepseek-v4-pro`（官方确认支持 FIM） |
| F28 | **语言过滤** | 配置启用/禁用补全的语言列表 |
| F29 | **Token 预算** | 配置最大生成 token 数（默认 1024，最大 4096） |
| F30 | **温度参数** | 可调（默认 0.2，范围 0-2），越低补全越确定 |

### 状态与反馈功能

| # | 功能 | 说明 |
|---|------|------|
| F31 | **状态栏指示器** | 显示 "$(sparkle) AI"，点击可切换开关 |
| F32 | **加载状态** | 请求中时状态栏显示旋转动画 |
| F33 | **错误通知** | API 失败时显示错误，限频保护（同一错误 30 秒内只弹一次） |
| F34 | **请求延迟显示** | 状态栏 tooltip 显示最近一次请求的延迟和 token 用量 |

### 功能统计

| 类别 | 数量 | 功能编号 |
|------|------|---------|
| 核心补全 | 9 | F1-F9 |
| 接受交互 | 5 | F10-F14 |
| 关联编辑 NES | 13 | F35-F47 |
| 后处理 | 6 | F15-F20 |
| 缓存 | 3 | F21-F23 |
| 配置 | 7 | F24-F30 |
| 状态反馈 | 4 | F31-F34 |
| **合计** | **47** | |

---

## 二、DeepSeek 适配设计

### 2.1 FIM 端点（官方文档）

DeepSeek FIM 补全 API（Beta）：

| 项目 | 值 |
|------|---|
| 端点 | `POST https://api.deepseek.com/beta/completions` |
| Base URL 配置 | `https://api.deepseek.com/beta`（SDK 自动拼接 `/completions`） |
| 模型 | `deepseek-v4-pro`（官方文档确认） |

**官方 cURL 示例**：

```bash
curl -L -X POST 'https://api.deepseek.com/beta/completions' \
-H 'Content-Type: application/json' \
-H 'Accept: application/json' \
-H 'Authorization: Bearer <TOKEN>' \
--data-raw '{
  "model": "deepseek-v4-pro",
  "prompt": "def fib(a):",
  "suffix": "    return fib(a-1) + fib(a-2)",
  "max_tokens": 1024,
  "temperature": 1,
  "stream": false
}'
```

**我们的 TypeScript 实现**：

```typescript
const response = await fetch('https://api.deepseek.com/beta/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'deepseek-v4-pro',
    prompt: buildPrefix(ctx),      // imports + precedingLines + prefix
    suffix: buildSuffix(ctx),      // suffix + followingLines
    max_tokens: 1024,
    temperature: 0.2,
    stream: true,
  }),
});
```

### 2.2 完整请求参数（来自官方文档）

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `model` | string | **是** | — | 模型 ID：`deepseek-v4-pro` |
| `prompt` | string | **是** | — | 前缀代码（FIM 的 prefix 部分） |
| `suffix` | string | 否 | null | 后缀代码（FIM 的 suffix 部分） |
| `max_tokens` | integer | 否 | null | 最大生成 token 数 |
| `temperature` | number | 否 | **1** | 采样温度，0-2 之间 |
| `top_p` | number | 否 | **1** | nucleus sampling，0-1 之间 |
| `stream` | boolean | 否 | false | 是否以 SSE 流式返回 |
| `stop` | object | 否 | null | 停止序列 |
| `echo` | boolean | 否 | false | 是否在输出中包含 prompt |
| `logprobs` | integer | 否 | null | 返回最可能 token 的对数概率（最大 20） |
| ~~`frequency_penalty`~~ | — | — | — | **已废弃，不再支持** |
| ~~`presence_penalty`~~ | — | — | — | **已废弃，不再支持** |

> ⚠️ **重要**：`frequency_penalty` 和 `presence_penalty` 已废弃，传入无效。

### 2.3 响应格式（来自官方文档）

```json
{
  "id": "cmpl-xxx",
  "object": "text_completion",
  "created": 1715392000,
  "model": "deepseek-v4-pro",
  "choices": [
    {
      "text": "    if a <= 1:\n        return a\n",
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30,
    "prompt_cache_hit_tokens": 8,
    "prompt_cache_miss_tokens": 2,
    "completion_tokens_details": {
      "reasoning_tokens": 0
    }
  }
}
```

**流式响应**：`stream: true` 时以 SSE 格式返回，每个 chunk 的 `choices[0].text` 包含增量文本，以 `data: [DONE]` 结尾。

### 2.4 模型选型

| 模型 | FIM 支持 | 特点 | 推荐场景 |
|------|---------|------|---------|
| `deepseek-v4-pro` | ✅ | 高质量，官方文档确认 | **首选** |

### 2.5 请求参数调优

```typescript
const FIM_PARAMS = {
  model: 'deepseek-v4-pro',    // 官方确认的 FIM 模型
  stream: true,                 // 流式返回
  max_tokens: 1024,             // 可配置，文档示例用 1024
  temperature: 0.2,             // 低温度 = 高确定性（官方默认 1，我们调低）
  top_p: 0.95,
  // 注意：frequency_penalty 和 presence_penalty 已废弃，不传
  stop: null,                   // 不设停止序列，由后处理控制
};
```

---

## 三、核心技术问题与修正

### 3.1 流式渲染方案（修正）

**原方案的问题**：修改已返回的 `InlineCompletionItem.insertText` 不会触发 VS Code 重新渲染。VS Code 将返回值视为不可变对象。

**修正方案**：流式渲染有两种可行策略，我们选择 **策略 A**：

```
策略 A：等待首个完整 token 块（推荐）
  ├── 优点：实现简单，ghost text 稳定不闪烁
  ├── 缺点：首个 token 出现稍慢（+50-100ms）
  └── 实现：收集 20-30ms 内的 token，合并后一次性返回

策略 B：多次触发 provider（复杂）
  ├── 优点：真正的逐字渲染
  ├── 缺点：需要主动移动光标或编辑文档来触发重调用，副作用大
  └── 实现：每次 token 到达时做一次 "虚拟编辑" 触发 provider
```

**策略 A 实现**：

```typescript
async streamCompletion(ctx, options): Promise<string> {
  // ...发起 SSE 请求...

  let buffer = '';
  let flushTimer: NodeJS.Timeout | null = null;
  let resolveFn: (text: string) => void;

  const result = new Promise<string>(r => { resolveFn = r; });

  // 流式读取，但不逐 token 回调
  // 而是等流结束后一次性返回完整文本
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split('\n');
    sseBuffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;
      try {
        const json = JSON.parse(data);
        buffer += json.choices?.[0]?.text ?? '';
      } catch { /* skip */ }
    }
  }

  resolveFn!(buffer);
  return result;
}
```

### 3.2 NES Tab 跳转机制（修正）

**原方案的问题**：
- `editor.action.inlineSuggest.trigger` 不接受位置参数
- `InlineCompletionItemProvider` 只在光标位置被调用
- 无法在非光标位置显示 ghost text

**修正方案**：接受后通过命令移动光标到下一个位置，再触发 suggest

```typescript
// NES 接受流程
async function acceptCurrentAndJumpNext(
  editor: TextEditor,
  pendingEdits: PendingEdit[]
): Promise<void> {
  // 1. 当前位置的 ghost text 已被 Tab 接受（VS Code 自动完成）

  // 2. 从 pendingEdits 移除当前位置
  const currentPos = editor.selection.active;
  const currentIndex = pendingEdits.findIndex(edit =>
    edit.range.contains(currentPos)
  );
  if (currentIndex >= 0) {
    pendingEdits.splice(currentIndex, 1);
  }

  // 3. 找到下一个待处理位置
  const nextEdit = pendingEdits[0];
  if (!nextEdit) {
    // 全部处理完毕
    statusBar.showIdle();
    return;
  }

  // 4. 移动光标到下一个位置
  editor.selection = new Selection(nextEdit.range.start, nextEdit.range.start);

  // 5. 短暂延迟后触发 inline suggest（让 VS Code 感知到光标变化）
  await new Promise(r => setTimeout(r, 50));
  commands.executeCommand('editor.action.inlineSuggest.trigger');
}
```

**关键点**：Tab 接受当前补全后，我们通过 `editor.selection` 移动光标，然后调用 `trigger`。VS Code 会在新光标位置再次调用 `provideInlineCompletionItems`，此时返回 NES 的下一个编辑建议。

### 3.3 编辑追踪方案（修正）

**原方案的问题**：`onDidChangeTextDocument` 触发时，`document.getText(change.range)` 返回的是变更后的新文本，无法获取旧文本。

**修正方案**：维护文档快照

```typescript
class EditTracker {
  private snapshots = new Map<string, string>();  // URI → 文档内容快照

  // 在编辑前保存快照
  onWillChangeDocument(event: vscode.TextDocumentWillSaveEvent): void {
    this.snapshots.set(
      event.document.uri.toString(),
      event.document.getText()
    );
  }

  // 编辑后比对差异
  onDidChangeDocument(event: vscode.TextDocumentChangeEvent): void {
    const uri = event.document.uri.toString();
    const oldText = this.snapshots.get(uri);
    if (!oldText) return;

    for (const change of event.contentChanges) {
      // change.range = 旧文档中的被替换范围
      // 用快照获取旧文本
      const offset = this.getOffset(oldText, change.range);
      const oldFragment = oldText.substring(offset, offset + change.rangeLength);
      const newFragment = change.text;

      this.recentEdits.push({
        document: event.document.uri,
        range: change.range,
        oldText: oldFragment,
        newText: newFragment,
        timestamp: Date.now(),
      });
    }

    // 更新快照为当前状态
    this.snapshots.set(uri, event.document.getText());
  }

  private getOffset(text: string, range: vscode.Range): number {
    // 将 (line, character) 转换为文本偏移量
    const lines = text.split('\n');
    let offset = 0;
    for (let i = 0; i < range.start.line; i++) {
      offset += lines[i].length + 1;  // +1 for \n
    }
    return offset + range.start.character;
  }
}
```

### 3.4 NES pendingEdits 生命周期管理（新增）

原方案缺少对 pendingEdits 的生命周期管理。新增以下机制：

```typescript
class PendingEditManager {
  private edits: PendingEdit[] = [];
  private timeout = 30_000;  // 30 秒超时

  // 注册新编辑
  set(edits: PendingEdit[]): void {
    this.edits = edits.map(e => ({ ...e, timestamp: Date.now() }));
    this.scheduleCleanup();
  }

  // 获取当前位置的编辑
  findAtPosition(uri: string, position: Position): PendingEdit | null {
    this.cleanupExpired();
    return this.edits.find(edit =>
      edit.document === uri && edit.range.contains(position)
    ) ?? null;
  }

  // 移除已接受的编辑
  remove(edit: PendingEdit): void {
    this.edits = this.edits.filter(e => e !== edit);
  }

  // 清除所有（用户按 Esc 或文档大幅变更）
  clear(): void {
    this.edits = [];
  }

  // 获取剩余数量
  get count(): number { return this.edits.length; }

  // 定时清理过期编辑
  private cleanupExpired(): void {
    const now = Date.now();
    this.edits = this.edits.filter(e => now - e.timestamp < this.timeout);
  }

  private scheduleCleanup(): void {
    setTimeout(() => this.cleanupExpired(), this.timeout);
  }

  // 文档变更时，检查 pendingEdits 的范围是否仍然有效
  invalidateOnDocumentChange(event: TextDocumentChangeEvent): void {
    const uri = event.document.uri.toString();
    for (const change of event.contentChanges) {
      // 如果变更发生在 pendingEdit 之前，需要调整其位置
      // 如果变更发生在 pendingEdit 范围内，说明该位置已被编辑，移除
      this.edits = this.edits.filter(edit => {
        if (edit.document !== uri) return true;
        if (edit.range.intersection(change.range)) return false;  // 被覆盖，移除
        return true;
      });
    }
  }
}
```

---

## 四、人机交互参数优化

### 4.1 防抖策略（细化）

不同场景需要不同的防抖延迟：

| 场景 | 延迟 | 原因 |
|------|------|------|
| 正常输入中 | **300ms** | 太短（200ms）会在快速打字时产生大量无效请求；太长（500ms）用户会感觉迟钝 |
| 换行 | **0ms**（立即） | 换行后用户通常等待补全，应立即触发 |
| 手动触发 `Alt+\` | **0ms** | 用户明确要求，无需防抖 |
| 输入到已有补全中间 | **150ms** | 用户可能在接受过程中微调，快速响应 |
| NES 编辑后 | **800ms** | 用户可能还在连续编辑（如逐字母改名），需要等编辑稳定 |

**防抖决策树**：

```
触发事件
  │
  ├── Explicit 触发（手动） → 立即请求，0ms
  │
  ├── 换行 → 立即请求，0ms
  │
  ├── 输入到已有 ghost text 中 → 150ms 防抖
  │
  ├── 普通输入 → 300ms 防抖
  │
  └── NES 编辑后 → 800ms 防抖
```

### 4.2 停止序列优化

```
原方案:  stop: ['\n\n\n', '```']
问题:    '\n\n\n' 过于激进 → 函数体内的空行会被截断
修正:    stop: ['\n\n']
原因:    双换行通常意味着代码块结束或逻辑段落分隔
         单换行（空行）在函数体内很常见，不应作为停止信号
```

### 4.3 行数限制（自适应）

```
原方案:  固定 20 行上限
问题:    单行补全不需要 20 行；复杂块补全 20 行可能不够
修正:    根据触发上下文自适应

规则:
  - 光标在行中间（续写） → 最多 1 行
  - 光标在行末尾（换行后） → 最多 3 行
  - 光标在 { 后面（代码块开始） → 最多 15 行
  - 光标在空行（新段落） → 最多 10 行
  - 用户配置的 maxLines 为硬上限
```

### 4.4 shouldSkip 过滤条件（完善）

```typescript
function shouldSkip(doc, pos, context): boolean {
  // ── 硬性跳过 ──
  if (doc.lineCount === 0) return true;                    // 空文件
  if (isLanguageDisabled(doc.languageId)) return true;     // 语言被禁用

  // ── IME 输入中 ──
  // VS Code 无直接 API，但可通过 suggest widget 状态间接判断
  // 如果 suggest widget 可见，说明用户在选择补全，此时不触发 inline suggest
  if (context.selectedCompletionInfo) return true;

  // ── 空行判断（更精细） ──
  const lineText = doc.lineAt(pos.line).text;
  if (lineText.trim().length === 0) {
    // 连续两个空行 → 跳过（用户可能在分隔代码段）
    if (pos.line > 0 && doc.lineAt(pos.line - 1).text.trim().length === 0) {
      return true;
    }
    // 单个空行 → 不跳过（可能是新代码块的开始）
  }

  // ── 纯注释行（可选跳过） ──
  // 用户可能在写注释，不需要代码补全
  const trimmed = lineText.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('#') ||
      trimmed.startsWith('*') || trimmed.startsWith('/*')) {
    // 但如果光标在注释符号之后的代码区域，不跳过
    if (pos.character <= lineText.indexOf(trimmed) + trimmed.length) {
      return true;
    }
  }

  // ── 字符串内部（简化判断） ──
  const textBeforeCursor = lineText.substring(0, pos.character);
  const singleQuotes = (textBeforeCursor.match(/'/g) || []).length;
  const doubleQuotes = (textBeforeCursor.match(/"/g) || []).length;
  const backticks = (textBeforeCursor.match(/`/g) || []).length;
  if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0) {
    // 在字符串内部，跳过（字符串内容补全意义不大）
    return true;
  }

  return false;
}
```

### 4.5 缓存键设计（精确化）

```
原方案:  key = URI:line:character:hash(prefix)
问题:    用户修改了文件其他位置 → 光标位置相同但上下文已变 → 缓存应失效
修正:    加入文档版本号

key = URI:version:line:character:hash(prefix[−200..])

其中 version = document.version（VS Code 每次编辑自动递增）
```

### 4.6 错误处理策略（限频）

```typescript
class ErrorHandler {
  private lastErrorTime = 0;
  private lastErrorMsg = '';
  private cooldown = 30_000;  // 同一错误 30 秒内只通知一次

  handle(err: Error): void {
    const now = Date.now();
    if (err.message === this.lastErrorMsg && now - this.lastErrorTime < this.cooldown) {
      return;  // 静默
    }
    this.lastErrorTime = now;
    this.lastErrorMsg = err.message;

    if (err.status === 401) {
      window.showErrorMessage('DeepSeek API Key 无效，请检查配置');
    } else if (err.status === 429) {
      statusBar.showWarning('API 限频，稍后重试');
    } else if (err.status === 500 || err.status === 503) {
      statusBar.showWarning('DeepSeek 服务暂时不可用');
    } else if (err.name === 'AbortError') {
      return;  // 被取消，不显示错误
    } else {
      statusBar.showWarning(`请求失败: ${err.message}`);
    }
  }
}
```

### 4.7 API Key 首次配置引导

```typescript
// extension.ts activate()
async function ensureApiKey(config: Config, secretStorage: SecretStorage): Promise<boolean> {
  // 1. 优先从 SecretStorage 读取
  let apiKey = await secretStorage.get('deepseek-api-key');
  if (apiKey) return true;

  // 2. 其次从环境变量读取
  apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey) {
    await secretStorage.store('deepseek-api-key', apiKey);
    return true;
  }

  // 3. 最后从配置读取（向后兼容）
  apiKey = config.get<string>('apiKey', '');
  if (apiKey) {
    await secretStorage.store('deepseek-api-key', apiKey);
    return true;
  }

  // 4. 都没有 → 引导用户配置
  const action = await window.showInformationMessage(
    'AI Autocomplete 需要 DeepSeek API Key',
    '配置', '获取 Key'
  );
  if (action === '获取 Key') {
    env.openExternal(Uri.parse('https://platform.deepseek.com/api_keys'));
  } else if (action === '配置') {
    const input = await window.showInputBox({
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
```

---

## 五、完整项目结构

```
ai-autocomplete/
├── package.json                   # 扩展清单 + 配置项
├── tsconfig.json
├── src/
│   ├── extension.ts               # 入口：activate/deactivate，API Key 引导
│   ├── provider.ts                # InlineCompletionItemProvider 核心实现
│   ├── context.ts                 # 上下文收集（文档、光标、imports）
│   ├── postProcess.ts             # 后处理管道（6 步）
│   ├── cache.ts                   # LRU + TTL 缓存（带文档版本号）
│   ├── config.ts                  # 配置读取 + SecretStorage 管理
│   ├── statusBar.ts               # 状态栏指示器（6 种状态）
│   ├── editTracker.ts             # 编辑历史追踪（含文档快照）
│   ├── renameDetector.ts          # 重命名检测 + 关联位置查找
│   ├── pendingEditManager.ts      # NES 队列管理（超时、失效、清理）
│   ├── errorHandler.ts            # 错误处理（限频通知）
│   ├── llm/
│   │   ├── types.ts               # 请求/响应类型定义
│   │   ├── deepseek.ts            # DeepSeek FIM 客户端（SSE 流式）
│   │   └── prompt.ts              # Prompt 构建（FIM 格式）
│   └── utils/
│       ├── debounce.ts            # 多级防抖工具
│       ├── hash.ts                # 简单 hash 函数
│       └── bracketCheck.ts        # 括号配对检查（跳过字符串/注释）
├── .vscodeignore
└── README.md
```

---

## 六、配置项完整定义

```jsonc
{
  // ── 基础配置 ──
  "ai-autocomplete.enabled": {
    "type": "boolean",
    "default": true,
    "description": "全局开关"
  },
  "ai-autocomplete.endpoint": {
    "type": "string",
    "default": "https://api.deepseek.com/beta",
    "markdownDescription": "DeepSeek API Base URL。FIM 功能需要 `/beta` 路径。插件会自动拼接 `/completions`"
  },
  "ai-autocomplete.apiKey": {
    "type": "string",
    "default": "",
    "markdownDescription": "API Key。也可通过 `DEEPSEEK_API_KEY` 环境变量或首次使用时引导配置"
  },
  "ai-autocomplete.model": {
    "type": "string",
    "default": "deepseek-v4-pro",
    "enum": ["deepseek-v4-pro"],
    "enumDescriptions": [
      "Pro — 高质量，官方文档确认支持 FIM"
    ],
    "description": "使用的模型"
  },

  // ── 补全参数 ──
  "ai-autocomplete.maxTokens": {
    "type": "number",
    "default": 1024,
    "minimum": 16,
    "maximum": 4096,
    "description": "单次补全最大 token 数"
  },
  "ai-autocomplete.temperature": {
    "type": "number",
    "default": 0.2,
    "minimum": 0,
    "maximum": 2,
    "description": "采样温度（0-2），越低越确定。官方默认 1，补全建议调低"
  },

  // ── 触发参数 ──
  "ai-autocomplete.debounceMs": {
    "type": "number",
    "default": 300,
    "minimum": 100,
    "maximum": 1000,
    "description": "输入防抖毫秒数（换行和手动触发不受此限制）"
  },

  // ── 上下文参数 ──
  "ai-autocomplete.contextLines.before": {
    "type": "number",
    "default": 50,
    "minimum": 10,
    "maximum": 200,
    "description": "光标前取多少行作为上下文"
  },
  "ai-autocomplete.contextLines.after": {
    "type": "number",
    "default": 5,
    "minimum": 0,
    "maximum": 50,
    "description": "光标后取多少行作为上下文"
  },
  "ai-autocomplete.maxLines": {
    "type": "number",
    "default": 15,
    "minimum": 1,
    "maximum": 50,
    "description": "单次补全最大行数（硬上限）"
  },

  // ── 语言过滤 ──
  "ai-autocomplete.enabledLanguages": {
    "type": "array",
    "default": ["*"],
    "items": { "type": "string" },
    "description": "启用补全的语言，* 表示全部"
  },
  "ai-autocomplete.disabledLanguages": {
    "type": "array",
    "default": ["markdown", "json", "jsonc", "plaintext", "log"],
    "items": { "type": "string" },
    "description": "禁用补全的语言（优先级高于 enabledLanguages）"
  },

  // ── NES 关联编辑 ──
  "ai-autocomplete.nes.enabled": {
    "type": "boolean",
    "default": true,
    "description": "NES 关联编辑：修改变量名后自动提示其他引用位置同步修改"
  },
  "ai-autocomplete.nes.debounceMs": {
    "type": "number",
    "default": 800,
    "minimum": 300,
    "maximum": 3000,
    "description": "NES 触发延迟：编辑完成后等待多久再分析关联（太短会在连续编辑时误触发）"
  },
  "ai-autocomplete.nes.timeout": {
    "type": "number",
    "default": 30000,
    "minimum": 5000,
    "maximum": 120000,
    "description": "NES pendingEdits 超时时间（毫秒），超时自动清除"
  },
  "ai-autocomplete.nes.useLlm": {
    "type": "boolean",
    "default": false,
    "description": "NES 是否调用 LLM 辅助判断复杂关联（会增加 API 调用）"
  }
}
```

---

## 七、快捷键定义

| 快捷键 | 命令 | 说明 | 冲突检查 |
|--------|------|------|---------|
| `Tab` | `editor.action.inlineSuggest.commit` | 接受全部补全 | VS Code 内置，无冲突 |
| `Ctrl+→` | `editor.action.inlineSuggest.acceptNextWord` | 逐词接受 | VS Code 内置，无冲突 |
| `Ctrl+Shift+→` | `editor.action.inlineSuggest.acceptNextLine` | 逐行接受 | VS Code 内置，无冲突 |
| `Esc` | `editor.action.inlineSuggest.hide` | 拒绝补全 / 取消 NES | VS Code 内置，无冲突 |
| `Alt+\` | `ai-autocomplete.trigger` | 手动触发补全 | 需确认不与输入法冲突 |
| `Alt+Shift+A` | `ai-autocomplete.toggle` | 全局开关 | 需确认不与其他扩展冲突 |
| `Alt+]` | `ai-autocomplete.nextCandidate` | 下一个候选 | 常见于括号匹配，改为 `Ctrl+Alt+]` |
| `Alt+[` | `ai-autocomplete.prevCandidate` | 上一个候选 | 同上，改为 `Ctrl+Alt+[` |

---

## 八、核心流程图

```
═══════════════════════════════════════════════════
  流程 A：代码补全
═══════════════════════════════════════════════════

  用户输入 / 换行 / 手动触发
          │
          ▼
    ┌─ shouldSkip? ──yes──> 返回空
    │     │ no
    │     ▼
    │  ┌─ 有 pendingEdits 且光标在其中? ──yes──> 返回 NES 编辑（流程 B）
    │  │     │ no
    │  │     ▼
    │  │  ┌─ 缓存命中? ──yes──> 返回缓存
    │  │  │     │ no
    │  │  │     ▼
    │  │  │  收集上下文 → 构建 FIM Prompt
    │  │  │     │
    │  │  │     ▼
    │  │  │  debounce (换行=0ms, 手动=0ms, 输入=300ms)
    │  │  │     │
    │  │  │     ▼
    │  │  │  SSE 流式请求 DeepSeek FIM API
    │  │  │     │
    │  │  │     ▼
    │  │  │  后处理（去前缀、去后缀、缩进、括号检查、行数限制）
    │  │  │     │
    │  │  │     ▼
    │  │  │  返回 InlineCompletionItem → ghost text 渲染
    │  │  │     │
    │  │  │     ▼
    │  │  │  Tab 接受 / Esc 拒绝 / 继续输入重新触发
    └──┘──┘

═══════════════════════════════════════════════════
  流程 B：NES 关联编辑
═══════════════════════════════════════════════════

  用户编辑代码
          │
          ▼
  EditTracker.onWillChangeDocument() → 保存快照
          │
          ▼
  EditTracker.onDidChangeDocument() → 比对差异，记录 edit
          │
          ▼
  debounce 800ms（等编辑稳定）
          │
          ▼
  EditTracker.detectRename()
          │
          ├── null → 不是重命名 → 结束
          │
          └── RenameInfo{oldName, newName}
                    │
                    ▼
          findRelatedOccurrences(document, oldName, excludeRange)
                    │
                    ├── 0 个 → 无关联 → 结束
                    │
                    └── N 个 → PendingEditManager.set(edits)
                              状态栏: "$(link) 3 处关联编辑"
                              │
                              ▼
                    光标在关联位置 → provider 被调用
                    → 检测到 pendingEdit → 返回 ghost text
                    → Tab → 替换 → 移动光标到下一个位置
                    → trigger → 再次调用 provider → 返回下一个
                    → 全部完成 → 状态栏恢复
```

---

## 九、开发路线

### Phase 1: 最小可用（MVP）
**目标**：输入代码 → ghost text 出现 → Tab 接受

- [ ] 项目脚手架（package.json, tsconfig, 目录结构）
- [ ] `extension.ts` — 注册 provider + 命令 + API Key 引导
- [ ] `provider.ts` — `InlineCompletionItemProvider` 基本实现
- [ ] `context.ts` — 收集 prefix/suffix/前后行/语言
- [ ] `llm/deepseek.ts` — DeepSeek FIM Completions API 调用（**不是 chat/completions**）
- [ ] `llm/prompt.ts` — FIM prompt 构建（prompt + suffix 格式）
- [ ] `postProcess.ts` — 基本后处理（去前缀、缩进）
- [ ] `config.ts` — 基本配置读取 + SecretStorage
- [ ] 配置项：endpoint, apiKey, model
- **验证**：TypeScript/Python 文件中输入 → ghost text → Tab 插入

### Phase 2: 流式 + 体验优化
**目标**：补全即时出现，快速输入不卡顿

- [ ] SSE 流式请求（等待完整结果返回，后续优化为流式）
- [ ] AbortController 取消机制
- [ ] 多级防抖（换行=0ms, 手动=0ms, 输入=300ms）
- [ ] `shouldSkip` 过滤（空文件、语言、空行、注释、字符串）
- [ ] `statusBar.ts` 状态栏指示器
- [ ] `errorHandler.ts` 错误限频通知
- [ ] 全局开关命令
- [ ] 手动触发快捷键 `Alt+\`
- **验证**：快速输入不卡，状态栏显示状态

### Phase 3: 缓存 + 后处理增强
**目标**：减少 API 调用，补全质量提升

- [ ] `cache.ts` — LRU + TTL 缓存（带文档版本号）
- [ ] 括号/引号配对检查 + 截断
- [ ] 重复 suffix 去除
- [ ] 自适应行数限制
- [ ] `disabledLanguages` 配置
- **验证**：相同位置不重复请求，补全文本格式正确

### Phase 4: 高级交互
**目标**：交互接近 Copilot

- [ ] 逐词接受 `Ctrl+→`
- [ ] 逐行接受 `Ctrl+Shift+→`
- [ ] 多候选切换 `Ctrl+Alt+]` / `Ctrl+Alt+[`
- [ ] API Key SecretStorage + 环境变量 + 首次引导
- [ ] 错误处理 + 重试（指数退避）
- **验证**：全部快捷键可用，错误场景不崩溃

### Phase 5: NES 关联编辑
**目标**：修改一处，自动提示关联位置同步修改

- [ ] `editTracker.ts` — 文档快照 + 编辑历史追踪
- [ ] `renameDetector.ts` — 标识符重命名检测 + 全文搜索关联位置
- [ ] `pendingEditManager.ts` — NES 队列管理（超时、失效、清理）
- [ ] `provider.ts` — 集成 pendingEdits，优先返回关联编辑
- [ ] Tab 接受后光标跳转到下一个关联位置
- [ ] Esc 取消所有 pendingEdits
- [ ] 状态栏显示 "N 处关联编辑"
- [ ] NES 独立开关 + debounce + timeout 配置
- **验证**：改 `userName` → `fullName`，其他位置出现 ghost text → 逐个 Tab 接受

### Phase 6: 上下文增强（可选）
**目标**：补全更精准

- [ ] imports 提取作为额外上下文
- [ ] 打开的文件列表信息
- [ ] 按语言定制 system prompt
- [ ] NES: LLM 辅助判断复杂关联
- **验证**：有 import 的文件中补全能正确引用导入的模块

---

## 十、技术风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| DeepSeek FIM 端点不可用 | 无法补全 | 1. 支持自定义 endpoint 2. 降级到 chat/completions（质量降低但可用） |
| API 延迟 > 1s | ghost text 出现太慢 | 1. 300ms 防抖减少请求 2. 状态栏显示 loading 3. 缓存复用 |
| API 限频 (429) | 补全间歇性失败 | 指数退避重试（1s, 2s, 4s，最多 3 次），30 秒内不重复通知 |
| 网络断开 | 无法补全 | 静默失败，状态栏显示错误图标，不弹窗 |
| FIM 补全质量差 | 补全不合理 | 1. 精调 prompt 2. 低 temperature 3. 后处理截断 |
| 大文件上下文超限 | 请求体过大 | 截取光标周围固定行数，总 token 控制在 4096 以内 |
| NES 误检测 | 非重命名被当成重命名 | 1. 严格正则 `\b` 词边界 2. 800ms 延迟等编辑稳定 3. 用户可关闭 |
| NES 子串误匹配 | `name` 匹配到 `username` | 使用 `\b` 词边界正则，精确匹配完整标识符 |
| NES 跨作用域误改 | 函数内 `i` 匹配另一个函数的 `i` | Phase 1 只做文件级匹配 + 用户逐个确认（Tab） |
| Tab 与 suggest widget 冲突 | Tab 优先接受 IntelliSense | VS Code 内置互斥，suggest 可见时自动隐藏 ghost text |

---

## 十一、API 费用估算

以 DeepSeek V4 Pro 为例：

| 场景 | 输入 token | 输出 token | 单次费用 |
|------|-----------|-----------|---------|
| 短补全（1 行） | ~500 | ~30 | ~$0.0003 |
| 中补全（5 行） | ~800 | ~100 | ~$0.001 |
| 长补全（15 行） | ~1500 | ~250 | ~$0.002 |

假设每天 200 次触发（缓存命中后实际 API 调用 ~80 次）：
- 日费用：~$0.08
- 月费用：~$2.4

NES 关联编辑：纯本地正则匹配，**零 API 费用**（`nes.useLlm: true` 时除外）。
