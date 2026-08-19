# 中间槽延迟写回与块导航锚点 实施计划

> **给 Agent 执行者：** 按本清单 TDD 实施。用户未要求时不提交。

**日期：** 2026-08-19 **状态：** 已完成 **关联设计：** `.docs/specs/2026-08-19-revert-unlock-chunk-anchor.md`

## Global Constraints

- 包管理器 pnpm；文案简体中文；单测 `describe` / `it` 中文
- 导出只认右栏；窄屏禁止 Merge 改成 column

---

## 文件

- 创建：`src/composables/chunkNavAnchor.ts` 及 `*.test.ts`
- 修改：`TwoWayMergeEditor.vue`、`HomeView.vue`、总览规格、PRODUCT / DESIGN / `.docs/ui` / README

### 任务 1：锚点纯函数

- [x] `activeChunkIndexOf`：与 merge `moveByChunk` 一致，返回 0 起下标
- [x] `chunkAnchorText`：无块 / 有块带当前序号

### 任务 2：槽与页眉

- [x] 默认只渲染 `→`；点过 `→` 后其余块追加 `←`
- [x] 文件名变化复位解锁；emit 当前块；页眉「N / M 个差异块」

### 任务 3：文档与验证

- [x] 活文档 + `pnpm lint` / `pnpm test:run` / `pnpm build`
