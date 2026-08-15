# M5：UI Diff Tree

**日期：** 2026-08-15  
**状态：** 已完成  
**依赖：** [总览](./2026-08-15-v0.1-config-diff-merge.md)、[M2](./2026-08-15-m2-core-diff.md)、[M4](./2026-08-15-m4-ui-json-input.md)  
**关联计划：** [`.docs/plans/archive/2026-08-15-m5-ui-diff-tree.md`](../plans/archive/2026-08-15-m5-ui-diff-tree.md)  
**影响模块：** `src/components/DiffTree.vue`、`src/composables/diffTreeModel.ts`、`src/stores/diffSession.ts`、`HomeView`

---

## 背景与目标

将叶子 Diff 展示为树；每叶在 **TEST | PROD** 间选择。父节点仅批量设 side。工具聚焦「有差异」：默认不展示无差异节点。可不接 Merge 预览，但选边状态须可供 M6 读取。

---

## 需求变更

### + 新增

- [Diff Tree]：按 path 前缀组装；区分 added / removed / modified。
- [仅差异展示]：**默认只渲染有差异的叶子及其为定位所需的祖先容器**；双方相同的 key/子树默认不出现在树上。
- [显示无差异]：提供选项（如开关「显示无差异」），开启后可对照展示相同节点；这些节点**只读、无选边**，不进入 `mergeConfig`。
- [展示]：差异叶显示 path、类型、两侧值（或仅一侧存在标识）、当前 side；object/array 差异值可展开。
- [选边]：每叶 TEST | PROD；父级批量把后代**差异叶子**设为同一 side（可表现混合态）。
- [批量]：全部选 TEST、全部选 PROD、恢复默认（按 M2 默认 side 表）。
- [默认 side]：进入树时采用引擎默认 side（modified/added→test，removed→prod）。
- [高危]：`removed` 用更醒目样式（如红色标签）。

### ~ 修改（相对早期草案）

- [交互]：从复选「是否应用」改为单选「用哪一侧」。
- [默认]：从「全不选」改为「按默认 side 表，TEST 为主、仅 PROD 有取 PROD」。
- [可视范围]：明确默认隐藏无差异；可选开启显示。

### 非目标（本切片）

- 调用 `mergeConfig`、结果预览、复制下载
- 把父节点或无差异节点当作 merge 输入
- 三方冲突 UI
- V0.1 不要求无差异模式下可编辑相同节点

---

## 接口与规则

- 输入：`DiffItem[]`（含默认 `side`）；开启「显示无差异」时另需 test/prod Config 以渲染相同子树。
- 输出/状态：Pinia `diffSession` 持有可改 side 的叶子列表，供 M6 交给 `mergeConfig`。
- merge **只吃差异叶子 + side**；显示无差异不影响合并结果。
- Core `diffConfig` 仍只产出差异叶子；「显示无差异」纯属 UI 层。

**建议文件（收拢）：**

- `src/composables/diffTreeModel.ts` — 纯函数：组树、批量 side、混合态（可单测）
- `src/stores/diffSession.ts` — test/prod、leaves、showUnchanged
- `src/components/DiffTree.vue` — 树 UI（递归节点写在同文件或必要子组件，勿再拆多文件）
- `src/views/HomeView.vue` — 接入 `start-diff` payload → `diffConfig` → DiffTree

---

## 验收清单

1. 开始 Diff 后默认只看到有差异的节点，看不到双方相同的子树。
2. 开启「显示无差异」后可看到相同节点；关闭后恢复仅差异。
3. 无差异节点不可选边，且不进入 merge 叶子列表。
4. 每叶可在 TEST / PROD 间切换；深层差异 path 正确。
5. 父级批量只影响差异叶子；混合态可感知。
6. 「全部选 TEST / 全部选 PROD / 恢复默认」正确；初始 side 符合 M2 默认表。
7. 手工验收通过；树模型相关单测通过。

---

## 测试要点

`diffTreeModel`：组树（仅差异 / 含无差异）、批量设 side、混合态、恢复默认；UI 手工。
