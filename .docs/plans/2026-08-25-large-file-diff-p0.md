# 大文件 Diff P0 止血 实施计划

> **给 Agent 执行者：** 必须使用 [子代理驱动开发](../workflows/subagent-driven-development.md)（推荐）或 [执行计划](../workflows/executing-plans.md) 逐步实施。步骤使用 checkbox（`- [ ]`）语法跟踪。

**日期：** 2026-08-25 **状态：** 执行中  
**关联设计：** [`.docs/specs/2026-08-25-large-file-diff-p0.md`](../specs/2026-08-25-large-file-diff-p0.md)  
**目标：** 压住大 JSON 导入后的主线程卡顿与键入卡顿，不改 Diff 算法、不引入 Worker、不重建 MergeView。  
**架构：** 抽出纯策略 `largeDocPolicy` 与 idle 回写 / 折叠自动一次两个会话。编辑器为对照真相源；Pinia 在 idle 或导出 / 格式化前收下字符串。  
**技术栈：** Vue 3、Pinia、CodeMirror 6 MergeView、Vitest、现有 composable

## Global Constraints

- 包管理器仅 pnpm；界面文案、注释、单测 `describe` / `it` 用简体中文
- 不改 `scanLimit: 10000` / `timeout: 1000`
- 不因导入 `destroy` MergeView
- UI 不调用 `diffConfig` / `mergeConfig`；不改 Core
- 用户未明确要求时不提交、不推送
- 不引入新依赖；标识符英文，文案中文
- 禁止无必要的 `any` 和非空断言 `!`
- 实现后做行为等价精简，不顺手重构无关代码
- 字节阈值 `1_000_000`；行数阈值 `15_000`；chrome 防抖 `150ms`；idle 回写 `200ms`；色带 cap `200`
- 跳过格式化文案：`文件较大，已保留原文；需要排版请点栏头格式化`
- 差异过粗文案：`文档较大，差异块可能较粗`
- 不触碰仓库里已有的未跟踪 `scripts/`、`.gitignore` 中 `fixtures` 相关改动（与本任务无关）

---

## 任务

### Task 1: 策略纯函数

**对应需求：** 阈值与跳过导入格式化

**文件：**

- 创建：`src/composables/largeDocPolicy.ts`
- 创建：`src/composables/largeDocPolicy.test.ts`
- 修改：`src/composables/prepareImportText.ts`
- 修改：`src/composables/prepareImportText.test.ts`

**接口：**

```ts
export const LARGE_DOC_BYTES = 1_000_000
export const LARGE_DOC_LINES = 15_000

export function isLargeDoc(text: string): boolean
export function shouldSkipImportFormat(raw: string): boolean
```

`PreparedImport` 增加 `skippedFormat?: boolean`。

`prepareImportText`：`shouldSkipImportFormat(raw)` 为真时直接 `{ text: raw, didFormat: false, skippedFormat: true }`，**不**走 `formatJsonDocument`。

测试（中文 `it`）：

- `长度不足行数阈值且小于 1MB 时不是大文档`
- `长度达到 1MB 时是大文档且应跳过导入格式化`
- `换行数达到 15000 时是大文档但不因行数跳过格式化`（短行拼 15000 行，总字节 < 1MB）
- `prepareImportText`：小合法 JSON 仍格式化；`skippedFormat` 默认 false；跳过时原文不变且不调用 format

小文件既有用例保持不变。先写失败测试再实现（TDD）。本任务不提交。

### Task 2: 编辑器文档 idle 回写

**对应需求：** 键入不再每次 `toString` 写 Pinia

**文件：** 创建 `src/composables/editorDocSync.ts` / `editorDocSync.test.ts`；改 `TwoWayMergeEditor.vue` 的 `createSideListener` 与左右 `watch`；改 `HomeView.vue` 复制/导出

**接口：**

```ts
export function createEditorDocSync(options: {
  idleMs: number
  readStore: (side: 'left' | 'right') => string
  writeStore: (side: 'left' | 'right', text: string) => void
}): {
  onEditorDoc: (side: 'left' | 'right', doc: { length: number; toString: () => string }) => void
  flush: () => void
}
```

行为：记下 `doc` 引用，idle 到期才 `toString` + write；空/非空不一致立刻 flush；`flush()` 取消防抖并立刻写下两侧 pending。

组件：`docChanged` 只调 `onEditorDoc`；`defineExpose` 增加 `flushDocs`、`getRightDoc`；栏头 `formatSide` 前 `flushDocs`。`HomeView` 复制/导出走 `getRightDoc()`。

先写失败测试再实现。本任务不提交。

### Task 3: chrome 防抖 + 缩略轨 cap

**对应需求：** 键入不立刻对所有块 `lineBlockAt`

**文件：** 改 `TwoWayMergeEditor.vue`；改 `chunkMinimapLayout.ts` + 测试

- `docChanged` 触发的 `syncEditorChrome(true)` 用 `useDebounceFn(..., 150)`；折叠开关、`afterEditorMeasure`、resize 仍立即重测
- `bandsFromPixelSpans`（或分列之后）若长度 > 200：按比例合并相邻带（保序，结果 ≤ 200）
- 测试：201 条互不重叠的带 → 输出长度 ≤ 200 且覆盖原起止范围

先写失败测试再实现。本任务不提交。

### Task 4: lite 扩展 + 折叠自动一次 + 提示

**对应需求：** 超阈值降级编辑器、自动打开折叠、跳过格式化/过粗 diff 提示

**文件：** `collapseAutoOnce.ts` + 测试；`codemirrorTheme.ts` + 测试；`diffByLine.ts` + 测试；`TwoWayMergeEditor.vue`；`HomeView.vue`；`useMergeSideImport.ts`

`createCollapseAutoOnce()`：`nextEnabled(current, isLarge)`；`onUserSet(enabled)` 在 `false` 时抑制。

`createEditableJsonExtensions(extra, onOpenSearch, lite?)`：`lite === true` 不加入 `json()` / `syntaxHighlighting` / `foldGutter`。用 `Compartment` 热切，不 destroy。

token 化抽成 `tokenizeLines(lines, maxUnique)`，测 `maxUnique: 1` 时返回 null → coarse。

导入 `skippedFormat` 与过粗 diff 走 `notice` → `UiMessage`。

先写失败测试再实现。本任务不提交。

### Task 5: 文档与验证

- spec 已由控制器落盘；本任务同步 `.docs/ui/README.md`、`.docs/specs/README.md`、`.docs/plans/README.md`
- 跑 `pnpm test:run`、`pnpm lint`
- 本任务不提交
