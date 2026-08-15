# UI 模块

前端视图与组件层。编辑器与页面副作用可依赖 Vue；**不得**把 Vue / DOM 引入 `src/core/*`。

## 当前状态（M4 已完成）

| 文件                                 | 职责                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `src/components/JsonEditor.vue`      | 单栏 CodeMirror 6 封装（`basicSetup` + `@codemirror/lang-json`，`v-model` 文本）                       |
| `src/components/JsonInputArea.vue`   | TEST/PROD 双栏、导入/格式化/清空、Valid 态、「开始 Diff」门禁；`emit('start-diff', { test, prod })`    |
| `src/composables/useJsonDocument.ts` | 纯校验/格式化：`evaluateJsonDocument` / `formatJsonDocument`（复用 M1 `parseConfig` / `formatConfig`） |
| `src/views/HomeView.vue`             | 嵌入 `JsonInputArea`；Diff / Result 仍为占位                                                           |

校验状态：`empty` | `valid` | `invalid`；顶层须为 object 或 array。两侧均 `valid` 才可点「开始 Diff」。用户 JSON 不上传、不持久化。

单测：`src/composables/useJsonDocument.test.ts`（不对 CM6 做脆弱 DOM 单测）。

## 规格与计划

- 规格：[`.docs/specs/2026-08-15-m4-ui-json-input.md`](../specs/2026-08-15-m4-ui-json-input.md)
- 计划（已归档）：[`.docs/plans/archive/2026-08-15-m4-ui-json-input.md`](../plans/archive/2026-08-15-m4-ui-json-input.md)

## 尚未实现

M5 Diff 树选边、M6 合并预览与导出。
