# UI 模块

前端视图与组件层。编辑器与页面副作用可依赖 Vue；**不得**把 Vue / DOM 引入 `src/core/*`。

## 当前状态（V0.1 UI 已完成：M4 / M5 / M6）

| 文件                                 | 职责                                                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/JsonEditor.vue`      | 单栏 CodeMirror 6 封装（`basicSetup` + `@codemirror/lang-json`，`v-model` 文本）                                                    |
| `src/components/JsonInputArea.vue`   | TEST/PROD 双栏、导入/格式化/清空、Valid 态、「开始 Diff」门禁；`emit('start-diff', { test, prod })`                                 |
| `src/composables/useJsonDocument.ts` | 纯校验/格式化：`evaluateJsonDocument` / `formatJsonDocument`（复用 M1 `parseConfig` / `formatConfig`）                              |
| `src/composables/diffTreeModel.ts`   | 纯函数：`buildDiffTree` 组树；`withSide` / `withAllSides` / `withDefaultSides` / `withDescendantSides`；`sideStateForPrefix` 混合态 |
| `src/stores/diffSession.ts`          | Pinia：`startSession` → `diffConfig`；持有 test/prod、可改 `leaves`、`showUnchanged`；批量选边 API 供 DiffTree / MergePreview 读取  |
| `src/components/DiffTree.vue`        | Diff 树 UI：仅差异默认、显示无差异开关、叶选边、父级批量、全部 TEST/PROD/恢复默认；`removed` 红色徽章                               |
| `src/utils/exportConfig.ts`          | 纯工具：`summarizeMergeSides` / `buildMergeSummaryText` / `copyText` / `downloadJsonFile`（下载固定 `config.json`）                 |
| `src/components/MergePreview.vue`    | 读 session：`mergeConfig` + `formatConfig` 实时预览；摘要；复制 / 下载；无 session 时占位                                           |
| `src/views/HomeView.vue`             | 嵌入 `JsonInputArea`；`start-diff` → `diffSession.startSession` → `<DiffTree />` + `<MergePreview />`                               |

### 输入区（M4）

校验状态：`empty` | `valid` | `invalid`；顶层须为 object 或 array。两侧均 `valid` 才可点「开始 Diff」。用户 JSON 不上传、不持久化。

单测：`src/composables/useJsonDocument.test.ts`（不对 CM6 做脆弱 DOM 单测）。

### Diff 树（M5）

- 默认只渲染差异叶及其祖先容器；「显示无差异」开启后相同节点为 `equal`（只读、无选边），不进入 merge 叶子列表。
- 默认 side：`modified` / `added` → `test`；`removed` → `prod`（引擎产出；恢复默认按 type 重算）。
- `diffSession.leaves` 交给 `mergeConfig`（由 MergePreview 调用）。

单测：`src/composables/diffTreeModel.test.ts`。

### 合并预览与导出（M6）

- 选边变化时 `MergePreview` 用 `mergeConfig(test, prod, leaves)` 即时更新；预览为 `formatConfig` 文本（`<pre>`）。
- 摘要文案由 `buildMergeSummaryText`；复制 / 下载内容为纯 JSON，无 metadata；不写 localStorage。

单测：`src/utils/exportConfig.test.ts`（摘要纯函数；不对 clipboard/DOM 做脆弱单测）。

## 规格与计划

- 规格：[M4](../specs/2026-08-15-m4-ui-json-input.md)、[M5](../specs/2026-08-15-m5-ui-diff-tree.md)、[M6](../specs/2026-08-15-m6-ui-merge-export.md)
- 计划（已归档）：[M4](../plans/archive/2026-08-15-m4-ui-json-input.md)、[M5](../plans/archive/2026-08-15-m5-ui-diff-tree.md)、[M6](../plans/archive/2026-08-15-m6-ui-merge-export.md)

## V0.1 UI

V0.1 UI 主路径已完成（输入 → Diff 选边 → 合并预览 / 复制下载）。
