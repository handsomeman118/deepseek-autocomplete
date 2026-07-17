# DeepSeek AI Autocomplete

基于 DeepSeek FIM API 的 VS Code 智能代码补全插件，提供类似 GitHub Copilot 的行内补全体验。

- 项目主页：https://github.com/handsomeman118/deepseek-autocomplete
- 问题反馈：https://github.com/handsomeman118/deepseek-autocomplete/issues
- 版本记录：https://github.com/handsomeman118/deepseek-autocomplete/blob/main/CHANGELOG.md

## 功能

- 输入代码时显示 Ghost Text，按 `Tab` 接受建议。
- 使用光标前后文进行 FIM 补全。
- 支持 SSE 流式响应、请求取消、结果缓存和补全后处理。
- NES 关联编辑：重命名标识符后提示同步修改其他引用。
- 可视化开关：点击状态栏右下角的 `AI` 图标即可开启或关闭补全。
- 可按语言启用或禁用补全。

## 安装 VSIX

1. 在 VS Code 中打开“扩展”视图。
2. 点击右上角 `...`，选择“从 VSIX 安装...”。
3. 选择生成的 `deepseek-autocomplete-0.0.2.vsix`。
4. 安装后按提示重新加载 VS Code。

也可以在终端中运行：

```shell
code --install-extension deepseek-autocomplete-0.0.2.vsix
```

## 首次使用

1. 安装插件后配置 DeepSeek API Key。
2. 打开代码文件并开始输入。
3. 出现补全建议后按 `Tab` 接受，按 `Esc` 忽略。
4. 点击状态栏的 `AI` 图标，可以查看当前状态、手动开关补全或进入完整设置。

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Tab` | 接受当前补全 |
| `Esc` | 忽略当前补全 |
| `Alt+\` | 手动触发补全 |
| `Alt+Shift+A` | 快速开启或关闭补全 |

## 配置

在 VS Code 设置中搜索 `AI Autocomplete`，可以配置：

- DeepSeek API 地址、API Key 和模型名称。
- 最大 token 数、采样温度和输入防抖时间。
- 光标前后的上下文行数以及最大补全行数。
- 启用或禁用补全的语言。
- NES 关联编辑开关、延迟和超时时间。

API Key 会优先从 VS Code SecretStorage 读取，也支持 `DEEPSEEK_API_KEY` 环境变量。

## 开发与打包

```shell
npm install
npm run compile
npm run package
```

## 版本

当前版本：`0.0.2`。具体变更参见 [CHANGELOG.md](https://github.com/handsomeman118/deepseek-autocomplete/blob/main/CHANGELOG.md)。
