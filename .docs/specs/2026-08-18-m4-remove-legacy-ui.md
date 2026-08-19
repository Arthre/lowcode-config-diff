# M4：删除选边 UI 并同步文档

**日期：** 2026-08-18  
**状态：** 已完成  
**依赖：** [总览](./2026-08-18-editable-two-way-merge.md)、[M3](./2026-08-18-m3-home-import.md)（主路径已换壳）  
**关联计划：** [`.docs/plans/archive/2026-08-18-m4-remove-legacy-ui.md`](../plans/archive/2026-08-18-m4-remove-legacy-ui.md)  
**影响模块：** 旧选边组件 / store / composable；`exportConfig`；`PRODUCT.md`、`DESIGN.md`、`.docs/ui`、`.docs/core`、V0.1 总览

---

## 背景与目标

换壳完成后删除死代码与选边单测，瘦身导出工具，并把活文档改成现行主路径。Core 引擎文件**不删**。

---

## 需求变更

### - 移除

- 组件：`DiffTree`、`DiffLeafViewer`、`MergePreview`、`JsonMergeViewer`、`JsonCodeViewer`、`JsonEditor`、`JsonInputArea`（若已迁入 ImportBar）
- 逻辑：`diffTreeModel`、`mergeAnnotations`、`diffSession`、`useWorkspaceSplit` 及对应 `*.test.ts`
- `exportConfig` 的 `summarizeMergeSides` / `buildMergeSummaryText`
- `codemirrorTheme` 中仅 `sideMarks` 使用的 API（无引用后删）

### ~ 修改

- 活文档描述现行「左参考、右结果、文本合并」
- `DESIGN.md`：Layout 从「输入/Diff | 统计+结果」改为满高双栏 Merge（并排、窄屏横滑）；去掉 Diff 树 / 选边统计叙事
- V0.1 总览文首：主路径已被 `2026-08-18-editable-two-way-merge` 取代（正文当历史保留）
- `.docs/core`：标明 `diffConfig`/`mergeConfig` 备用、UI 不调用

### 非目标

- 不删 `src/core/diff.ts` / `merge.ts` 及其单测
- 不改 V0.1 历史 spec 正文口径（只加取代说明）

---

## 验收清单

1. 全仓无对已删符号的 import
2. `pnpm test:run`、`pnpm lint`、`pnpm build` 通过
3. Core 单测仍绿
4. `PRODUCT.md` / `DESIGN.md` / `.docs/ui/README.md` / `.docs/core/README.md` 与代码一致
5. 本包总览与 M1–M4 规格状态为「已完成」；对应 plan 已移入 `plans/archive/`
