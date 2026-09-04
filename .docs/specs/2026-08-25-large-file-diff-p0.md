# 大文件 Diff P0 止血

**日期：** 2026-08-25  
**状态：** 实施中  
**关联计划：** [`.docs/plans/archive/2026-08-25-large-file-diff-p0.md`](../plans/archive/2026-08-25-large-file-diff-p0.md)  
**前置：** [可编辑双栏文本合并工作台](./2026-08-18-editable-two-way-merge.md)、[工作台扫读、空态与折叠差异](./2026-08-21-workbench-scan-empty-collapse.md)  
**影响模块：** `prepareImportText`、`mergeWorkspace`、`TwoWayMergeEditor`、`HomeView`、`useMergeSideImport`、`diffByLine`、`chunkMinimapLayout`、`codemirrorTheme`  
**不改动：** Core `diffConfig` / `mergeConfig`、`scanLimit` / `timeout` 数值、`DIRECTORY_TREE_ENABLED`、MergeView 禁止因导入 `destroy`

---

## 背景与目标

整文件 Myers + 每次键入 `doc.toString()` 回写 Pinia + 导入强制 `formatConfig`，在大 JSON 上卡住主线程。滚动路径已优化，本变更只止血导入 / 首次 layout / 键入。

**成功标准：** 小文件语义不变；≥1MB 导入不强制排版；键入不在每次更新物化全文写 store；超阈值首次自动打开「仅显示差异」，用户关掉后本会话不再自动开。

## 方案概述

抽出 `largeDocPolicy` 与 idle 回写 / 折叠自动一次两个会话。编辑器为键入后的对照真相源；Pinia 在 idle 或导出 / 格式化前收下字符串。超阈值用 `Compartment` 卸掉 JSON 高亮与折叠 gutter，不重建 MergeView。

## 锁定决策

- 字节阈值：`1_000_000`（任一侧原文）
- 行数阈值：`15_000`（`\n` 个数 + 非空则 1；长度小于 15000 时可直接判否）
- 导入跳过格式化：只看字节
- lite 编辑器 / 自动折叠：任一侧满足字节或行数
- chrome layout 防抖：`150ms`
- store idle 回写：`200ms`
- 缩略轨色带上限：左右列各 `200`
- 折叠自动：首次超阈值打开；用户关掉后本会话抑制
- `highlightChanges`：`reconfigure` 不支持则不硬切
- 跳过格式化文案：`文件较大，已保留原文；需要排版请点栏头格式化`
- 差异过粗文案：`文档较大，差异块可能较粗`

## 需求变更

### + 新增

- [大文档策略]：字节 / 行数阈值决定是否大文档、是否跳过导入格式化、是否 lite 扩展
- [idle 回写]：键入只记下 `Text`，idle 或 flush 才 `toString` 写 store；空/非空切换立刻回写
- [折叠自动一次]：超阈值且未抑制时打开「仅显示差异」；用户关掉后本会话不再自动开
- [lite 扩展]：超阈值卸掉 `json()` / `syntaxHighlighting` / `foldGutter`，不 destroy MergeView
- [提示]：跳过导入格式化或 diff 过粗时，页眉 `UiMessage` 警告 4s

### ~ 修改

- [导入格式化]：从「合法 object/array 一律 `formatConfig` 一次」改为「原文 ≥1MB 保留原文，栏头格式化仍可用」
- [编辑器 ↔ store]：从「每次 `docChanged` 立刻 `toString` 写 Pinia」改为「idle 200ms 或复制/导出/格式化前 flush」

### - 移除

无。

### 非目标（明确不做）

- 不把 diff 搬进 Worker，不做结构切片
- 不因导入 `destroy` MergeView
- 不改 `scanLimit: 10000` / `timeout: 1000`
- 不重开差异目录树
- 不给产品加硬体积上限

## 技术决策

- 复制 / 导出走 `getRightDoc()`（先 flush）
- 栏头格式化前 `flushDocs()`
- `prepareImportText` 增加 `skippedFormat?: boolean`
- `importSide` 返回 `PreparedImport`，避免再 parse
- 单测 `describe` / `it` 用中文

## 潜在影响清单

- 忘记 flush 时复制 / 导出 / 格式化会读到旧 store
- 空/非空若延迟回写会闪空态
- 大文件导入不再自动排版
- 超阈值后语法高亮与折叠 gutter 消失
- 缩略轨极密差异会糊成更宽的带
