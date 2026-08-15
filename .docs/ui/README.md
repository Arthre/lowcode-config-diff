# UI 模块

前端视图与组件层。编辑器与页面副作用可依赖 Vue；**不得**把 Vue / DOM 引入 `src/core/*`。

## 当前状态（M4 / M5 已完成）

| 文件                                 | 职责                                                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/JsonEditor.vue`      | 单栏 CodeMirror 6 封装（`basicSetup` + `@codemirror/lang-json`，`v-model` 文本）                                                    |
| `src/components/JsonInputArea.vue`   | TEST/PROD 双栏、导入/格式化/清空、Valid 态、「开始 Diff」门禁；`emit('start-diff', { test, prod })`                                 |
| `src/composables/useJsonDocument.ts` | 纯校验/格式化：`evaluateJsonDocument` / `formatJsonDocument`（复用 M1 `parseConfig` / `formatConfig`）                              |
| `src/composables/diffTreeModel.ts`   | 纯函数：`buildDiffTree` 组树；`withSide` / `withAllSides` / `withDefaultSides` / `withDescendantSides`；`sideStateForPrefix` 混合态 |
| `src/stores/diffSession.ts`          | Pinia：`startSession` → `diffConfig`；持有 test/prod、可改 `leaves`、`showUnchanged`；批量选边 API                                  |
| `src/components/DiffTree.vue`        | Diff 树 UI：仅差异默认、显示无差异开关、叶选边、父级批量、全部 TEST/PROD/恢复默认；`removed` 红色徽章                               |
| `src/views/HomeView.vue`             | 嵌入 `JsonInputArea`；`start-diff` → `diffSession.startSession` → `<DiffTree />`；Result 仍为占位                                   |

### 输入区（M4）

校验状态：`empty` | `valid` | `invalid`；顶层须为 object 或 array。两侧均 `valid` 才可点「开始 Diff」。用户 JSON 不上传、不持久化。

单测：`src/composables/useJsonDocument.test.ts`（不对 CM6 做脆弱 DOM 单测）。

### Diff 树（M5）

- 默认只渲染差异叶及其祖先容器；「显示无差异」开启后相同节点为 `equal`（只读、无选边），不进入 merge 叶子列表。
- 默认 side：`modified` / `added` → `test`；`removed` → `prod`（引擎产出；恢复默认按 type 重算）。
- `diffSession.leaves` 供后续 M6 交给 `mergeConfig`。

单测：`src/composables/diffTreeModel.test.ts`。

## 规格与计划

- 规格：[M4](../specs/2026-08-15-m4-ui-json-input.md)、[M5](../specs/2026-08-15-m5-ui-diff-tree.md)
- 计划（已归档）：[M4](../plans/archive/2026-08-15-m4-ui-json-input.md)、[M5](../plans/archive/2026-08-15-m5-ui-diff-tree.md)

## 尚未实现

M6 合并预览与导出。
