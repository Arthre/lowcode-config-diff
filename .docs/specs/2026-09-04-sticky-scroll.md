# Sticky Scroll（真 sticky 行）

**日期：** 2026-09-04  
**状态：** 已完成  
**关联计划：** [`.docs/plans/archive/2026-09-04-sticky-scroll.md`](../plans/archive/2026-09-04-sticky-scroll.md)  
**前置：** [可编辑双栏文本合并工作台](./2026-08-18-editable-two-way-merge.md)、[大文件 Diff P0 止血](./2026-08-25-large-file-diff-p0.md)  
**影响模块：** `stickyScrollAncestors`、`stickyScrollExtension`、`codemirrorTheme`、`TwoWayMergeEditor`、`.docs/ui/README.md`  
**不改动：** Core `diffConfig` / `mergeConfig`、缩略轨 / chunk 锚点算法、`jsonPathOffset`、MergeView 禁止因导入 `destroy`

---

## 背景与目标

深嵌套 JSON（及日后其它语言）在 Merge 双栏中下滚时，用户容易丢失当前所在对象/数组上下文。采用 Sticky **面包屑**（`key › …`，最多 5 段）钉在该侧编辑器视口顶，可点击跳回。

**成功标准：** 左右各自钉住最多 5 层真源码行（含大文件 lite）；竖滚跟 `.cm-mergeView` 视口顶；lite 无 language 时用括号栈回退 fold；逻辑语言无关（假 fold 区间即可测）。

## 方案概述

- **纯函数** `stickyAncestorsOf`：输入文档位置 + 可折叠区间列表，输出有序祖先行（截断到 `STICKY_SCROLL_MAX_LAYERS = 5`）。
- **CM 扩展** `stickyScrollExtension`：`ViewPlugin` + 绝对定位层；`top` 按滚动根视口锚定；`getScrollRoot` 注入外层滚动根；横滚与 `scrollDOM.scrollLeft` 同步；点击行滚入视口顶部附近。
- **接线**：Sticky 挂在 `createEditableJsonExtensions`（**lite 仍启用**）；语言/高亮/foldGutter 仍由 `createLiteVariableExtensions` 热切；`getScrollRoot → mergeView.dom`。

## 锁定决策

| 项             | 决定                                                                              |
| -------------- | --------------------------------------------------------------------------------- |
| 形态           | 单行面包屑（`key › key › {…}`），段可点跳回；非整段源码行堆叠                     |
| 双栏           | 左右各自计算与渲染                                                                |
| 深度           | 最多 **5** 层（常量 `STICKY_SCROLL_MAX_LAYERS`，超出保留最内层）                  |
| 滚动根         | Merge 竖滚在 `mergeView.dom`（`.cm-mergeView`）；禁止假定 `view.scrollDOM` 竖滚   |
| lite           | 卸掉 language / 高亮 / foldGutter；**Sticky 仍启用**（无语法树时括号栈回退 fold） |
| 多语言         | 祖先行优先 `foldNodeProp`；否则 `{}`/`[]` 括号栈；不绑 `jsonPathOffset`           |
| 视口锚定       | sticky 层 `top = max(0, rootTop - editorTop)`，钉在 Merge 视口顶而非文档顶        |
| 交互           | 点击 sticky 行 → 将该行滚到滚动根顶部附近                                         |
| 「仅显示差异」 | 祖先行仍在文档中则照常钉住；已被 collapse 吃掉的区间不伪造行                      |
| 主题           | CSS 变量 `--code-bg` / `--border-subtle` / `--muted` / `--text-h` / `--mono`      |

## 需求变更

### + 新增

- [sticky 纯逻辑]：`stickyAncestorsOf` + 中文单测（嵌套、根视口、深度截断、无 fold → 空）
- [sticky 扩展]：`stickyScrollExtension({ getScrollRoot, maxLayers? })`：滚动监听、重绘、横滚同步、点击跳转
- [Merge 接线]：左右 Sticky 常驻（含 lite），共用 `getScrollRoot → mergeView.dom`

### ~ 修改

- [lite 可变扩展]：`createLiteVariableExtensions` 只管语言/高亮/foldGutter；Sticky 在 `createEditableJsonExtensions`
- [活文档]：`.docs/ui/README.md` 记录 sticky 行为与约束
- [大文件]：lite 仍有 sticky；视口锚定修复

### - 移除

无。

### 非目标（明确不做）

- JSON path 提示条、跨栏共用一条 sticky
- 改动 Core diff/merge 引擎
- 引入第三方 sticky 包
- 在已折叠（collapse）吃掉的区间伪造祖先行

## 技术决策

- 视口顶文档位：`view.lineBlockAtHeight(scrollRoot.scrollTop).from`（与现有 `goToDocOffset` 的 `scrollTop ↔ lineBlock.top` 约定一致）
- 祖先判定：fold 开区间严格包含视口顶，且开行已滚出（`lineAt(from).to < pos`）
- 性能：滚动只重算祖先；禁止每帧 `doc.toString()`；fold 从当前 `syntaxTree` 收集
- `getScrollRoot` 在 Merge 构造完成前可能返回 `null`，扩展需安全跳过并在后续 update 再挂监听

## 验收

- JSON 深嵌套下滚时顶部钉住祖先 `"key": {` / `[` 行，最多 5 层
- 点击 sticky 行跳到对应位置；左右栏互不影响
- lite 大文件仍有 sticky（括号栈回退），无报错
- 下滚后 sticky 钉在视口顶（非整篇文档顶）
- 单测用假 fold 区间证明语言无关；`pnpm test:run` 相关用例通过

## 潜在影响清单

- sticky 层遮挡顶部点击（仅钉住行可点跳转）
- 横滚不同步时 key 与正文错位（扩展必须同步 `scrollLeft`）
- 语法树未解析完时回退括号栈（大文件可接受 O(n) 扫一次并按文档缓存）
