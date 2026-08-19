# M4：删除选边 UI 并同步文档 实施计划

> **给 Agent 执行者：** 使用 [子代理驱动开发](../../workflows/subagent-driven-development.md) 或 [执行计划](../../workflows/executing-plans.md)。未经用户明确要求不要 `git commit`。

**日期：** 2026-08-18 **状态：** 已完成 **关联设计：** `.docs/specs/2026-08-18-m4-remove-legacy-ui.md`  
**目标：** 删除死代码、瘦身 export、sync 活文档  
**依赖：** M3 已换壳，主路径不再引用下列文件

## Global Constraints

- 不删 `src/core/diff.ts` / `merge.ts` 及其测试
- 不改 `package.json` / lockfile（即使 `vue-codemirror` 在删 `JsonEditor` 后无引用，本切片也不卸载）
- V0.1 总览只加取代说明，不删正文
- M1–M4 与总计划已移入 `plans/archive/`
- 未经用户明确要求不要 `git commit`
- 验证：`pnpm test:run`、`pnpm lint`、`pnpm build`

---

## 删除清单

- `src/components/DiffTree.vue`
- `src/components/DiffLeafViewer.vue`
- `src/components/MergePreview.vue`
- `src/components/JsonMergeViewer.vue`
- `src/components/JsonCodeViewer.vue`
- `src/components/JsonEditor.vue`
- `src/components/JsonInputArea.vue`（若 ImportBar 已独立）
- `src/composables/diffTreeModel.ts` + `.test.ts`
- `src/composables/mergeAnnotations.ts` + `.test.ts`
- `src/composables/useWorkspaceSplit.ts` + `.test.ts`
- `src/stores/diffSession.ts`

---

### 任务 1：删除文件并清引用

- [x] 按清单删除（含对应 `*.test.ts`）；`JsonInputArea` 已由独立 `ImportBar` 取代，必须删
- [x] 全仓搜索确认无对已删符号的 import（含 `diffSession`、`summarizeMergeSides` 等）
- [x] 删除 `codemirrorTheme.ts` 中无引用的 `sideMarks` API（`SideMarkSpec` / `setSideMarksEffect` / `sideMarksField` / `buildSideMarkDecorations`）及 `.cm-merge-side-test` / `.cm-merge-side-prod` 主题规则
- [x] 若删除清单文件后 `createReadonlyJsonExtensions` / `createFocusScrollExtension` 已无调用方，一并删除；**保留** `createEditableJsonExtensions`、`mergeHighlightTheme`、`appEditorTheme`、`createSearchExtensions`
- [x] 删除仅服务旧壳的样式：`layout.scss` 的 `.is-split` / splitter / `.ui-side-summary` / `.ui-merge-sources` / `.ui-workspace-main|side|diff|result` 等；`semantic.scss` 的 `.ui-diff-leaf*` / `.ui-side-segment*`；无引用后的 `.ui-badge*`、`.ui-empty-slot`、`primitives.scss` 的 `.ui-flow*`
- [x] 保留现行页眉 / `.ui-workspace` 满高单列 / `.ui-result-toolbar` / `.ui-dropzone` / `.ui-label-test|prod`
- [x] `src/types/components.d.ts` 为 unplugin 生成：删组件后让下次构建重生，或手改去掉已删组件声明
- [x] 不要改 `package.json` / lockfile

---

### 任务 2：瘦身 exportConfig

- [x] 删除 `summarizeMergeSides` / `buildMergeSummaryText` 及 `DiffItem` 依赖
- [x] 更新 `exportConfig.test.ts`，只测 `copyText` / `downloadJsonFile`（为这两函数补测；删掉选边摘要用例）
- [x] `pnpm test:run src/utils/exportConfig.test.ts`

---

### 任务 3：文档 sync

- [x] `PRODUCT.md`：主路径改为文本合并工作台
- [x] `DESIGN.md`：Layout 改为满高双栏 Merge（并排、窄屏横滑）；删除 Diff 树 / 选边分栏描述
- [x] `.docs/ui/README.md`：当前状态表改为 ImportBar / TwoWayMergeEditor / mergeWorkspace；去掉已删文件行
- [x] `.docs/core/README.md`：`diff`/`merge` 备用、UI 不调用
- [x] `.docs/specs/2026-08-15-v0.1-config-diff-merge.md` 文首加：主路径已被 `2026-08-18-editable-two-way-merge` 取代
- [x] 总览与 M1–M4 规格标「已完成」；计划已移入 `plans/archive/`
- [x] 总计划索引同步状态（链接指向 `plans/archive/`）

---

### 任务 4：完成验证

- [x] `pnpm test:run`
- [x] `pnpm lint`
- [x] `pnpm build`
- [x] Core 测试仍绿
- [x] **不要**归档；手工主路径由用户点选，Agent 不声称手工清单已过
