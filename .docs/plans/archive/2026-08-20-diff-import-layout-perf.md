# 导入后目录定位性能 实施计划

> **给 Agent 执行者：** 使用 [执行计划](../workflows/executing-plans.md) 内联实施。步骤使用 checkbox 跟踪。

**日期：** 2026-08-20 **状态：** 已完成 **关联设计：** `.docs/specs/2026-08-20-diff-import-layout-perf.md` **目标：** 导入后目录偏移与行号一次扫描完成 **架构：** 路径 trie + 单次 JSON 扫描；换行索引二分行号；jump maps 顺带给出 groupOffsets。 **技术栈：** 现有 Vitest / TypeScript，无新依赖

## Global Constraints

- 标识符英文，单测 `describe` / `it` 与注释用简体中文
- 不改 Core、不启用 `collapseUnchanged`、不新增依赖
- 公开 `jsonPathOffset` 语义不变

---

## 文件

- 改 `src/composables/jsonPathOffset.ts`（+ 单测）
- 改 `src/composables/lineNumberAtOffset.ts`（+ 单测）
- 改 `src/composables/jumpLineNumbers.ts`（+ 单测）
- 改 `src/components/TwoWayMergeEditor.vue`：layout 用 `groupOffsets`
- 改 `.docs/ui/README.md`

---

## 任务

### 任务 1：批量路径偏移

- [x] 写 `jsonPathOffsets` 失败单测
- [x] 实现 trie 一次扫描 + skip 不建串
- [x] 确认既有 `jsonPathOffset` 单测通过

### 任务 2：行号索引与 jump maps

- [x] 写 `createLineNumberLocator` 与 `groupOffsets` 失败单测
- [x] 实现 locator；maps 批量定位并返回偏移
- [x] 编辑器 layout 去掉第二遍组扫描

### 任务 3：文档与验证

- [x] 更新 `.docs/ui/README.md`
- [x] `pnpm lint` / `pnpm test:run` / `pnpm build`
