# M6：UI Merge Preview & Export

**日期：** 2026-08-15  
**状态：** 草案  
**依赖：** [总览](./2026-08-15-v0.1-config-diff-merge.md)、[M3](./2026-08-15-m3-core-merge.md)、[M4](./2026-08-15-m4-ui-json-input.md)、[M5](./2026-08-15-m5-ui-diff-tree.md)  
**关联计划：** （M3–M5 就绪后确认本切片再写 plan）  
**影响模块：** `src/components/MergePreview`、复制/下载 utils、主流程串联

---

## 背景与目标

根据每叶选边实时 Merge，展示结果并支持复制/下载，闭环 V0.1 主路径。

---

## 需求变更

### + 新增

- [实时预览]：选边变化时用 `mergeConfig(test, prod, leaves)` 更新结果。
- [展示]：格式化 JSON；可折叠（若成本低）。
- [复制]：`formatConfig(result)` 等价文本。
- [下载]：`config.json`，纯 JSON，无 metadata（逻辑在 UI/`utils`）。
- [摘要]：例如「以 TEST 为主，N 项取 PROD」（或等价文案；非审计）。

### ~ 修改（相对早期草案）

- [调用]：从 `mergeConfig(prod, selectedLeaves)` 改为传入 test+prod+带 side 的叶子。
- [验收]：从「全不选≡PROD / 全选≡TEST」改为「默认 / 全 TEST / 全 PROD」三套语义。

### 非目标（本切片）

- 后端保存、发布、Git
- 本地默认可恢复敏感配置
- 改变 Merge 语义

---

## 接口与规则

- 串联：M4 合法 Config → M2 diff → M5 选边 → M3 merge → 本区展示。
- 默认 side 预览 ≡ TEST ∪ 仅 PROD 有；全部 TEST ≡ TEST；全部 PROD ≡ PROD。
- 用户 JSON 不上传、不写日志。

**建议：** `src/components/MergePreview`；`utils` 内 download/copy。

---

## 验收清单

1. 选边变化后结果即时更新。
2. 默认 / 全 TEST / 全 PROD 预览分别符合总览语义。
3. 复制为格式化纯 JSON。
4. 下载 `config.json` 内容正确。
5. 可见选边摘要（如取 PROD 的项数）。
6. 刷新后无敏感 JSON 残留。
7. 主路径手工走通；未引入后端。

---

## 测试要点

以手工主路径为主；merge 正确性由 M3 单测保证。
