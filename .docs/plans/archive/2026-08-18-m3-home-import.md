# M3：导入条与工作台换壳 实施计划

> **给 Agent 执行者：** 使用 [子代理驱动开发](../../workflows/subagent-driven-development.md) 或 [执行计划](../../workflows/executing-plans.md)。未经用户明确要求不要 `git commit`。

**日期：** 2026-08-18 **状态：** 已完成 **关联设计：** `.docs/specs/2026-08-18-m3-home-import.md`  
**目标：** 主路径改为 ImportBar + TwoWayMergeEditor + 页眉导出  
**依赖：** M1 store、M2 `TwoWayMergeEditor`  
**技术栈：** Vue 3、现有 `copyText` / `downloadJsonFile`

## Global Constraints

- 见 [总览](../../specs/2026-08-18-editable-two-way-merge.md) 与 [M3 规格](../../specs/2026-08-18-m3-home-import.md)
- 保留 `ThemeToggle`；无滚动开关；无「采纳当前块」；无脏标记
- 粘贴按钮文案「粘贴为该侧全文」：`navigator.clipboard.readText()` → `importSide`；失败中文提示。不要做成编辑器光标插入
- 导入条右侧展示名是「结果」不是「PROD」
- 窄屏仍并排；块导航绕回
- 本切片不 `git rm` 旧文件、不删 `exportConfig` 摘要函数、不删未引用的旧 `layout.scss` 规则（M4 再清）
- 不改 `TwoWayMergeEditor` 同步协议；不要为换壳去 destroy MergeView
- 未经用户确认不要归档计划；不要 git commit
- 手工验收由用户在浏览器完成；Agent 以 `pnpm lint` / `pnpm build` 为完成证据，不要声称手工清单已过

---

## 文件结构

- 创建：`src/components/ImportBar.vue`（可从 `JsonInputArea.vue` 改写，旧文件留到 M4）
- 修改：`src/views/HomeView.vue`（整页换壳，不要在旧布局角落里挂编辑器）
- 修改：`src/styles/layout.scss`（工作区改为满高单列：导入条 + 吃剩余高度的 Merge；Home 不再用 `is-split`）

---

### 任务 1：ImportBar

读 `useMergeWorkspace()`。两侧 `MergeSide`：`'left'` / `'right'`。

- 左/右：拖拽、隐藏 file input 点选、「粘贴为该侧全文」
- 成功后 `importSide(side, raw, fileName?)`（粘贴省略 fileName，会清空该侧旧文件名）
- 展示 `leftFileName` / `rightFileName`
- 标签：「TEST（参考）」/「结果」
- 无「开始 Diff」
- 每侧保留「清空」，走 `clearSide`
- 读取失败：该侧中文错误「读取文件失败，请重试」，**不要**因此 `importSide` 清空已有文档
- 剪贴板失败：「无法读取剪贴板，请检查浏览器权限」
- 复用现有 `ui-dropzone` / `ui-btn` 样式；可复制 `pickJsonFile` 进本文件（M4 会删旧输入区）

- [x] **步骤 1：** 实现 `ImportBar.vue`
- [x] **步骤 2：** 确认无「开始 Diff」；右侧文案不是「PROD」

---

### 任务 2：重写 HomeView + layout

**页眉锁定：** 产品名（`useAppStore().title`）、`ThemeToggle`、块计数、上一条/下一条、复制、下载。去掉「输入 → 差异 → 结果」流程条。可保留「本地处理 · 不上传」。

**块导航：**

```ts
const mergeEditorRef = ref<{ goToPrevChunk: () => void; goToNextChunk: () => void } | null>(null)
const chunkCount = ref(0)
function onChunks(n: number) {
  chunkCount.value = n
}
```

上一条/下一条调 expose（库命令已绕回）。无 chunk 时按钮可点，命令内部 no-op。

**复制/下载（不阻断）：**

```ts
function exportHintText(hint: RightDocExportHint): string | null {
  if (hint.kind === 'empty') return '结果为空，仍已导出'
  if (hint.kind === 'invalid') return hint.message
  return null
}

async function onCopy() {
  const hint = describeRightDocExport(workspace.rightDoc)
  try {
    await copyText(workspace.rightDoc) // 空串也允许
    statusText.value = exportHintText(hint) ?? '已复制'
  } catch {
    statusText.value = '复制失败'
  }
  // 约 2s 清除
}

function onDownload() {
  const hint = describeRightDocExport(workspace.rightDoc)
  downloadJsonFile(workspace.rightDoc) // 默认 config.json；空串允许
  statusText.value = exportHintText(hint) ?? '已下载'
  // 约 2s 清除
}
```

**主区：** `ImportBar` + 满高 `TwoWayMergeEditor`（侧标签已在 M2 组件内，Home 不要再叠一套）。

**layout.scss：** `.ui-workspace` 改为 `flex: 1; min-height: 0; display: flex; flex-direction: column`（或等价），让 Merge 吃剩余视口高度。Home **不要**再绑 `is-split`。旧 `.ui-side-summary` 等规则可留到 M4。

- [x] **步骤 1：** 重写 `HomeView.vue`；删除对 `useDiffSession`、`DiffTree`、`MergePreview`、`JsonInputArea`、`useWorkspaceSplit`、`buildMergeSummaryText` 的引用
- [x] **步骤 2：** `pnpm lint`；`pnpm build`
- [x] **步骤 3：** 不要声称手工验收已过；在报告里列出规格验收 1–7 供用户在 `pnpm dev` 点选

---

### 任务 3：本切片验证

- [x] `pnpm lint`；`pnpm build`
- [x] 规格状态改为「已完成」；计划已移入 `plans/archive/`
