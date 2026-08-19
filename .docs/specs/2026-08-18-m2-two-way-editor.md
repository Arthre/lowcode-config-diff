# M2：可编辑双栏 Merge 宿主

**日期：** 2026-08-18  
**状态：** 已完成  
**依赖：** [总览](./2026-08-18-editable-two-way-merge.md)、[M1](./2026-08-18-m1-merge-workspace.md)  
**关联计划：** [`.docs/plans/2026-08-18-m2-two-way-editor.md`](../plans/2026-08-18-m2-two-way-editor.md)  
**影响模块：** `src/composables/codemirrorTheme.ts`、`src/components/TwoWayMergeEditor.vue`  
**不改动：** `HomeView` 主路径（本切片可不挂页；M3 再接入）；不删只读 `JsonMergeViewer`

---

## 背景与目标

交付整页可用的可编辑 MergeView：**读 M1 store**，双侧可写，中间 `→` 把左块写入右栏。本切片不负责导入条与页眉导出。

---

## 需求变更

### + 新增

- [`createEditableJsonExtensions`]：对照 `createReadonlyJsonExtensions`（行号、折叠 gutter、`drawSelection`、`json`、高亮、括号、`appEditorTheme`）；`createSearchExtensions({ replaceable: true })`；**必须**含 `history()`、`keymap.of(historyKeymap)`、`keymap.of(defaultKeymap)`。`defaultKeymap` **不含** Undo；没有 `historyKeymap` 则 Ctrl+Z 不存在。**不要** `EditorState.readOnly.of(true)`，**不要** `createFocusScrollExtension`。签名：`(extra: Extension[] = []) => Extension[]`。
- [`TwoWayMergeEditor`]：读 `useMergeWorkspace()`；`MergeView` `a`=左 `b`=右；`revertControls: 'a-to-b'`；`renderRevertControl` 返回 `button`，文本 `→`，`title`/`aria-label`「将此差异写入右侧」（点击由 MergeView 处理，不要自绑 click）；`gutter` + `highlightChanges`；**不传** `collapseUnchanged`；`diffConfig: { scanLimit: 10000, timeout: 1000 }`（禁止叶级 `800/250`）。侧标签写在本组件：「TEST（参考）」/「结果」，三列对齐中间 revert 槽；不要用会忽略中间列的 `grid-cols-2`。
- 文档回写：遵守总览「编辑器 ↔ store 同步」。两侧各挂 `updateListener`：仅 `docChanged` 且 `toString()` ≠ store 时 `setLeftDoc` / `setRightDoc`。store 因导入/清空变化时，只对**变化侧** `dispatch({ changes: { from: 0, to: doc.length, insert } })`；禁止 `destroy` 整份 MergeView。比较用字符串，不用引用。
- 导航：`expose` `goToPrevChunk` / `goToNextChunk`。**复用** `@codemirror/merge` 的 `goToPreviousChunk` / `goToNextChunk`（已按 chunks 绕回），对 **b（结果栏）** 调用。无 chunk 时 no-op。`emit('chunks', n)` 仅在 `mergeView.chunks.length` 变化时（含挂载后第一次）。
- 滚动：外层 `.cm-mergeView { height: 100%; overflow: auto }`，**始终可滚**。禁止抄 `JsonMergeViewer` 的 `scrollArmed` / 点入才滚。
- 窄屏：保持左右并排；宿主 `overflow-x: auto`；**不要** `.cm-mergeViewEditors { flex-direction: column }`。

### 非目标（本切片）

- **不改** `HomeView`、不新增长期路由、不做导入条、不做复制下载
- 不自绘箭头叠层、不启用 Unified、不做 `←`
- 不对 MergeView DOM 做脆弱单测；拷块/Undo 的手工验收在 **M3** 换壳后做

---

## 验收清单

1. 代码：可写扩展含 `history()` + `historyKeymap` + `defaultKeymap`；`diffConfig` 为整文件档；无「doc 变就 destroy」
2. 导入一侧时实现上只替换该侧文档（代码审查可确认；完整手工在 M3）
3. `goToPrevChunk` / `goToNextChunk` 与 `chunks` emit 已暴露；导航走 merge 包命令
4. 样式：始终左右两列，无窄屏 column；始终可滚
5. `pnpm lint` / `pnpm build` 通过；未改 `HomeView`
