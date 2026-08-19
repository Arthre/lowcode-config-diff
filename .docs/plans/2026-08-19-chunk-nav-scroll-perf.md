# 块导航与缩略轨滚动性能 实施计划

> **给 Agent 执行者：** 按本清单 TDD 实施。用户未要求时不提交。

**日期：** 2026-08-19 **状态：** 已完成 **关联设计：** `.docs/specs/2026-08-19-chunk-nav-scroll-perf.md`

## Global Constraints

- 包管理器 pnpm；文案简体中文；单测 `describe` / `it` 中文
- 不改页眉语义、不改 Core

---

## 文件

- 修改：`src/composables/minimapSnapshot.ts` 及 `*.test.ts`
- 修改：`TwoWayMergeEditor.vue`、`DiffMinimap.vue`、`.docs/ui/README.md`、PRODUCT

### 任务 1：偏移区间直接收带

- [x] `lineStartsOf` / `lineIndexAt`：一次扫描行起点，二分取行号
- [x] `conflictBandsFromOffsetRanges`：与 `changedLineFlags` + `conflictBandsOf` 等价
- [x] `changedLineFlags` 改为共用行起点索引

### 任务 2：滚动热路径

- [x] 滚动只更新锚点与视口带；冲突带仅文档/块数变化时重建
- [x] 上一条/下一条用缓存像素带做视口重叠锚点（禁止 `lineBlockAtHeight` 文档位置）
- [x] 活文档 + `pnpm lint` / `pnpm test:run` / `pnpm build`
