# M4：UI JSON Input

**日期：** 2026-08-15  
**状态：** 已完成  
**依赖：** [总览](./2026-08-15-v0.1-config-diff-merge.md)、[M1](./2026-08-15-m1-core-parse.md)  
**关联计划：** [`.docs/plans/archive/2026-08-15-m4-ui-json-input.md`](../plans/archive/2026-08-15-m4-ui-json-input.md)  
**影响模块：** `src/views/*`、`src/components/*`、`src/composables/useJsonDocument.ts`（Json 输入区）

---

## 背景与目标

提供 TEST / PROD 双栏输入与校验，作为后续 Diff 的入口。本切片不要求完成 Diff 树与 Merge 预览。

编辑器采用 **CodeMirror 6**（非裸 textarea），以支撑较大 JSON 的编辑、折叠与行号体验。

---

## 需求变更

### + 新增

- [双栏输入]：TEST JSON、PROD JSON 左右布局。
- [CodeMirror 6]：两侧均为 CM6 JSON 编辑器（`codemirror` + `@codemirror/lang-json`；Vue 封装可用 `vue-codemirror` 或等价薄封装）。
- [导入方式]：文件导入、文本粘贴/编辑、格式化、清空。
- [校验展示]：Valid / Invalid；Invalid 显示错误信息（及行/列，若可提供）。
- [门禁]：两侧均合法才允许触发「开始 Diff」（按钮可先只调用 parse 或预留回调）。

### ~ 修改（相对早期草案）

- [编辑器]：从「优先 textarea + 校验」改为「引入 CodeMirror 6 作为本切片交付」。

### 非目标（本切片）

- Diff 树、勾选、Merge 预览、复制下载成品
- 本地持久化用户 JSON
- Monaco / vanilla-jsoneditor / 其它大型编辑器
- JSON Schema 自动补全、Diff 高亮（可留后续）

---

## 接口与规则

- 解析 / 格式化调用 M1 `parseConfig` / `formatConfig`；校验错误优先使用 `ParseConfigError` 的 message / line / column。
- 单页结构中本切片只交付 **JSON Input Area**（可保留空的 Diff/Result 占位）。
- 不上传 JSON；刷新后不恢复敏感内容。
- Core 仍禁止依赖 Vue；编辑器只存在于 UI 层。
- 依赖：允许新增 CM6 相关包；不引入 Element Plus 等第二套 UI 框架；样式优先 UnoCSS。

**建议文件（收拢）：**

- `src/components/JsonEditor.vue` — 单栏 CM6 封装（`v-model` 文本）
- `src/components/JsonInputArea.vue` — 双栏 + 工具栏 + 校验态 +「开始 Diff」
- `src/composables/useJsonDocument.ts` — 纯校验/格式化逻辑（可单测）
- `src/views/HomeView.vue` — 嵌入输入区

---

## 验收清单

1. 可粘贴 / 编辑 TEST、PROD 文本（CM6）。
2. 可从文件导入（`.json` 文本读入编辑器）。
3. 可格式化、可清空。
4. 非法 JSON 显示 Invalid 与错误信息（尽量含行/列）。
5. 顶层须为 object 或 array；`null` / primitive 视为非法。
6. 仅当两侧 Valid 时可点击「开始 Diff」。
7. 手工走通上述路径；相关 composable 单测通过（若有）。

---

## 测试要点

- `useJsonDocument`（或等价）：合法 / 非法 / 顶层拒绝 / 格式化往返。
- UI：手工验收双栏、导入、门禁；不强制对 CM6 做脆弱 DOM 单测。
