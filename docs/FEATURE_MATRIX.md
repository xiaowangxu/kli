# KLI 功能、优先级与 Demo 矩阵

本页是当前实现清单，也是回归验收入口。优先级含义：P0 为基础正确性，P1 为真实应用核心交互，P2 为组件生态与工程体验，P3 为高级终端能力。

## P0：基础闭环

| 能力 | 状态 | 实现与验收 |
|---|---:|---|
| Yoga 整数布局与响应式刷新 | 完成 | `pointScaleFactor=1`；布局 setter 会通知 Scene；奇偶列宽下余数单元格稳定分配。 |
| Wheel 与滚动语义 | 完成 | line delta 为 `±1`；方向键、Page、Home/End、Wheel 与 Shift+Wheel 统一。 |
| 差分渲染 | 完成（默认开启） | 前后帧 cell diff、绝对坐标重锚、宽字符 continuation 和背景空 cell 处理；复杂 grapheme 会先预填完整逻辑跨度再落字，避免终端宽度判断不同造成选择背景断裂；可用 `dirtyDraw: false` 显式关闭。 |
| 安全生命周期 | 完成 | 可配置 Ctrl+C；SIGINT/SIGTERM 恢复光标、鼠标、粘贴、焦点和备用屏幕模式。 |
| Bracketed Paste | 完成 | 支持跨 packet 状态机；一次派发完整多行/CJK/Emoji `PasteInputEvent`。 |
| 全局文本选择 | 完成 | TextContainer 跨行/跨节点选择，宽 grapheme 端点吸附、空选择抑制，可导出纯文本并复制。 |
| Clipboard | 完成 | host、OSC52、memory backend；原始 paste bytes、UTF-8/Windows code-page 解码；PowerShell UTF-8 I/O；SSH 默认避免写远端主机剪贴板。 |
| EditBuffer / InputBox / Textarea | 完成 | 共享缓存的 grapheme/cell/UTF-16 映射与 visual lines；word/char/no-wrap、光标、选择、撤销重做和内部滚动。 |
| Select | 完成 | 高亮与提交分离、禁用项、空态、描述、typeahead、键鼠操作和自动显露。 |
| ScrollBox / ScrollBar | 完成 | 独立 X/Y、指标、scrollIntoView、嵌套链、粘边；横纵 bar、箭头、轨道、thumb 拖动与双向同步。 |

## P1：完整交互体验

| 能力 | 状态 | 实现与验收 |
|---|---:|---|
| 通用 Drag & Drop | 完成 | `dragstart/drag/dragenter/dragover/dragleave/drop/dragend`、阈值、DataTransfer、pointer capture、Escape 取消。 |
| 拖拽自动滚动与键盘等价 | 完成 | ScrollBox 边缘自动滚动；FocusGroup 中 Alt+方向键派发 `dragreorder`。 |
| Kitty keyboard / CSI-u | 完成 | press/repeat/release、修饰键、raw sequence；legacy 模式保持默认兼容。 |
| 焦点显露与焦点组 | 完成 | 聚焦节点自动滚入视口；roving focus、方向导航、trap 和关闭恢复。 |
| Layer / Modal / Menu | 完成 | z-index 绘制与命中顺序；Modal trap/Escape；Menu 外点关闭与子菜单。Layer 应放在 Scene 顶层 JSX 位置。 |
| Command Palette | 完成 | Ctrl+P、搜索过滤、快捷键说明、键盘确认。 |
| Tabs 与表单组件 | 完成 | Tabs、RadioGroup、Switch、Slider、FormField、Label，以及 disabled/error 状态。 |
| 异步状态 | 完成 | Spinner、Progress、ToastHost。 |
| VirtualList | 完成 | 固定行高、overscan、只格式化/绘制可见项；10,000 行自动测试。 |
| Unicode 宽度 | 完成 | CJK、ambiguous width、Keycap、ZWJ、VS16 与 combining-only grapheme；分段和 viewport wrap 结果有界缓存；emoji 选择背景兼容终端 1/2 cell 宽度差异。 |

## P2：组件生态与工程体验

| 类别 | 已实现 |
|---|---|
| 数据展示 | List、VirtualList、Table、Tree、TreeSelect、DescriptionList |
| 代码内容 | CodeView、LineNumber、DiffView、MarkdownView |
| 布局 | SplitPane、Resizable、Collapsible、Accordion |
| 导航 | Breadcrumb、Pagination、Tabs、StatusBar |
| 输入辅助 | SearchBox、Autocomplete、Combobox、MultiSelect |
| 主题 | `KliTheme`、`darkTheme`、`lightTheme` 与 Scene theme |
| 测试 | TestRenderer、MockKeyboard、MockMouse、文本/ANSI 帧输出 |
| 调试 | DebugOverlay、frame time、输出字节、dirty cells、最后事件路径 |
| 可访问性 | role、aria label/description、键盘替代路径、可导出 semantic tree |
| API | 关键 API 同时提供 camelCase/snake_case；render 返回稳定、幂等 dispose handle |

## P3：高级终端协议

| 能力 | 状态 |
|---|---:|
| OSC 8 超链接 | `openHyperlink` / `closeHyperlink` |
| OSC 10/11 主题色 | 查询命令与 `TerminalColorInputEvent` 响应解析 |
| Focus reporting | Renderer 开关与 `TerminalFocusInputEvent` |
| Synchronized Output | Renderer 开关，逐帧 `CSI ? 2026 h/l` |
| 终端能力探测 | color depth、Unicode、OSC52、Kitty、Sixel、SSH 等能力模型 |
| Kitty Graphics / Sixel | 分块 Kitty graphics 与 Sixel 写入 API |
| 桌面通知 | OSC 777 `notifyDesktop` |
| SSH 适配 | 剪贴板目的地安全策略与 remote capability |
| 自动化协议 | `exportSemanticTree()` 可生成稳定语义快照 |

## Demo 列表

| Demo | 重点 | 验收 |
|---|---|---|
| D01 Layout Reactivity | flex、gap、padding、尺寸、绝对定位 | 动态刷新；79/80/81、119/120/121 列无错缝 |
| D02 Protocol Inspector | key/raw/modifier/paste/focus/mouse | Paste 只发一次；CSI-u 事件类型正确 |
| D03 Selection & Clipboard | 跨 TextBox 中英 Emoji 选择 | Ctrl+C/X/V；宽字符边界正确 |
| D04 Input & Textarea | 单行/多行编辑 | 词移动、undo/redo、粘贴、长内容滚动 |
| D05 Select Gallery | 禁用、空态、描述、1000 项 | typeahead、active/committed、自动显露 |
| D06 Scroll Laboratory | 横向、纵向、嵌套、粘底 | Wheel/Page/Home/End 和链式滚动 |
| D07 ScrollBar | 横纵 bar | thumb、轨道、箭头、双向同步 |
| D08 Drag & Drop | 重排、跨列、取消、非法目标 | capture、边缘滚动、Escape、Alt+Arrow |
| D09 Focus & Overlay | Modal、Menu、Command Palette | trap、恢复、外点关闭、键盘全覆盖 |
| D10 Virtual Data | 10,000 行 List/Table/Tree | 可见区裁剪，无全量绘制 |
| D11 Component Gallery | 全组件与状态 | 视觉回归入口 |
| D12 Renderer Benchmark | 日志、进度、帧指标 | frame time、bytes、dirty cells 可见 |

运行入口：

```bash
npm run demo:gallery
npm run demo:workbench
```

`demo:gallery` 是 D01–D12 的目录和组合回归页。`demo:workbench` 是 All-in-One Issue Triage Studio，覆盖 1,000 项 Select、编辑/预览、拖放状态、Inspector、sticky log、滚动条、右键菜单、Ctrl+P、焦点 trap 与渲染指标。
