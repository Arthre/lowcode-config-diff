# 选边单选、两列空态与结果合并高亮 实施计划

> 本计划为 2026-08-17 Diff/Result JSON 展示优化的后续增量，已执行完毕。

**日期：** 2026-08-17 **状态：** 已完成 **关联设计：** `.docs/specs/2026-08-17-diff-result-json-viewer.md` **目标：** radio 选边降卡顿、单侧两列空态、结果合并来源列表与高亮 **技术栈：** Vue 3、CodeMirror 6、Pinia

## Global Constraints

- 不改 Core `mergeConfig` / `diffConfig` 语义
- UI 文案简体中文；不对 CM DOM 做脆弱单测

---

## 文件结构

- 创建：`src/composables/mergeAnnotations.ts`、`mergeAnnotations.test.ts`
- 修改：`DiffTree.vue`、`DiffLeafViewer.vue`、`JsonCodeViewer.vue`、`MergePreview.vue`、`codemirrorTheme.ts`、`semantic.scss`
- 修改：`.docs/ui/README.md`、本规格与归档

---

### 任务 1：DiffTree radio + 树与 side 解耦

- [x] 叶选边改为原生 radio
- [x] `leafStructureKey` + `watch` 重建树；`sideById` 独立更新

### 任务 2：DiffLeafViewer 两列空态

- [x] modified 双侧有值 → MergeView
- [x] 其余 → `grid` 两列；缺失侧「无此配置」

### 任务 3：合并来源与高亮

- [x] `buildMergeAnnotations` / `locateJsonPathRange` / `buildSideMarksFromAnnotations`
- [x] `JsonCodeViewer` `sideMarks` + CM Decoration
- [x] `MergePreview` 合并来源列表；格式化模式高亮

### 任务 4：验证与文档

- [x] `pnpm test:run` / `pnpm lint`
- [x] 同步 `.docs/ui/README.md` 与规格
