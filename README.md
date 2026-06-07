# DeepSeek AI Autocomplete

基于 DeepSeek V4 FIM API 的 VS Code 代码补全插件，类似 GitHub Copilot。

## 功能

- **代码补全**：输入时自动出现 ghost text 预览，Tab 接受
- **FIM 补全**：同时理解光标前后的代码，补全更精准
- **NES 关联编辑**：修改变量名后自动提示其他引用位置同步修改
- **智能触发**：输入停顿后自动触发，换行立即触发
- **多级防抖**：避免快速输入时的无效请求
- **缓存**：相同位置不重复请求，减少 API 调用
- **错误处理**：限频通知，API Key 首次引导

## 安装

### 从 VSIX 安装

1. 下载 `deepseek-autocomplete-0.1.0.vsix`
2. VS Code 中按 `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. 选择下载的文件

### 从源码构建

```bash
git clone https://github.com/USER/deepseek-autocomplete.git
cd deepseek-autocomplete
npm install
npm run compile
npm run package
code --install-extension deepseek-autocomplete-0.1.0.vsix
```

## 使用

1. 安装后重启 VS Code
2. 首次使用会引导配置 DeepSeek API Key
3. 打开代码文件，开始输入即可看到补全建议

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Tab` | 接受补全 |
| `Esc` | 拒绝补全 |
| `Alt+\` | 手动触发补全 |
| `Alt+Shift+A` | 全局开关 |

## 配置

在 VS Code 设置中搜索 `ai-autocomplete`：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `endpoint` | `https://api.deepseek.com/beta` | API 端点 |
| `model` | `deepseek-v4-pro` | 模型名称 |
| `maxTokens` | 1024 | 最大生成 token |
| `temperature` | 0.2 | 采样温度 |
| `debounceMs` | 300 | 输入防抖毫秒 |
| `nes.enabled` | true | 关联编辑开关 |

## 调试

按 `Ctrl+Shift+U` 打开 Output 面板，选择 **AI Autocomplete** 查看日志。

## 许可证

MIT
