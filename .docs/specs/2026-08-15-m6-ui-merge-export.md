# M6：UI Merge Preview & Export

**日期：** 2026-08-15  
**状态：** 已完成  
**依赖：** [总览](./2026-08-15-v0.1-config-diff-merge.md)、[M3](./2026-08-15-m3-core-merge.md)、[M4](./2026-08-15-m4-ui-json-input.md)、[M5](./2026-08-15-m5-ui-diff-tree.md)  
**关联计划：** [`.docs/plans/archive/2026-08-15-m6-ui-merge-export.md`](../plans/archive/2026-08-15-m6-ui-merge-export.md)  
**影响模块：** `src/components/MergePreview.vue`、`src/utils/exportConfig.ts`、`HomeView`

---

## 背景与目标

根据每叶选边实时 Merge，展示结果并支持复制/下载，闭环 V0.1 主路径。

---

## 需求变更

### + 新增

- [实时预览]：选边变化时用 `mergeConfig(test, prod, leaves)` 更新结果。
- [展示]：格式化 JSON（`formatConfig`）；可用只读 CM6 或 `<pre>`（成本低即可）。
- [复制]：`formatConfig(result)` 等价文本。
- [下载]：`config.json`，纯 JSON，无 metadata（逻辑在 UI/`utils`）。
- [摘要]：例如「共 N 项差异，其中 M 项取 PROD」（或等价；非审计）。

### ~ 修改（相对早期草案）

- [调用]：从 `mergeConfig(prod, selectedLeaves)` 改为传入 test+prod+带 side 的叶子。
- [验收]：默认 / 全 TEST / 全 PROD 三套语义。

### 非目标（本切片）

- 后端保存、发布、Git
- 本地默认可恢复敏感配置
- 改变 Merge 语义
- 新增大依赖

---

## 接口与规则

- 串联：M4 合法 Config → M2 diff → M5 选边 → M3 merge → 本区展示。
- 读 `diffSession` 的 test/prod/leaves；无 session 时占位。
- 用户 JSON 不上传、不写日志、不 localStorage。

**建议文件（收拢）：**

- `src/utils/exportConfig.ts` — `copyText` / `downloadJsonFile` / `summarizeMergeSides`（可单测摘要）
- `src/components/MergePreview.vue` — 预览 + 摘要 + 复制/下载
- `src/views/HomeView.vue` — Result 区嵌入 MergePreview

---

## 验收清单

1. 选边变化后结果即时更新。
2. 默认 / 全 TEST / 全 PROD 预览分别符合总览语义（由 M3 + 实时调用保证）。
3. 复制为格式化纯 JSON。
4. 下载 `config.json` 内容正确。
5. 可见选边摘要（取 PROD 的项数等）。
6. 刷新后无敏感 JSON 残留（不写 storage）。
7. 主路径可走通；未引入后端。

---

## 测试要点

`summarizeMergeSides` 等纯函数单测；merge 正确性依赖 M3；UI 手工。
