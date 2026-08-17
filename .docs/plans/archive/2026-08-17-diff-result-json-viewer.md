# Diff / Result JSON 展示优化 实施计划

> **给 Agent 执行者：** 可按本清单逐步实施。步骤使用 checkbox 跟踪。

**日期：** 2026-08-17 **状态：** 已完成 **关联设计：** `.docs/specs/2026-08-17-diff-result-json-viewer.md` **目标：** CM6 只读/Merge 展示、同步展开、懒挂载、Result 压缩格式化 **架构：** 抽取编辑器主题与只读 Viewer / MergeView 组件；DiffTree 共享展开态；format 增加 compressConfig **技术栈：** Vue 3、CodeMirror 6、`@codemirror/merge`、Pinia

## Global Constraints

- 包管理器 pnpm；不引入 Monaco
- UI 文案简体中文；标识符英文
- Core 禁止依赖 Vue/DOM
- 不对 CM DOM 做脆弱单测

---

## 文件结构

- 创建：`src/composables/codemirrorTheme.ts` — 共享主题与只读扩展
- 创建：`src/components/JsonCodeViewer.vue` — 只读单栏
- 创建：`src/components/JsonMergeViewer.vue` — MergeView 双栏
- 创建：`src/components/DiffLeafViewer.vue` — 懒挂载对比
- 修改：`src/core/format.ts`、`format.test.ts`
- 修改：`src/components/JsonEditor.vue`、`DiffTree.vue`、`MergePreview.vue`
- 修改：`.docs/ui/README.md`、`.docs/core/README.md`

---

### 任务 1：Core compressConfig

- [x] `compressConfig` + 单测
- [x] Spec/Plan 落盘

### 任务 2：共享主题 + Viewer / MergeViewer

- [x] `codemirrorTheme.ts`
- [x] `JsonCodeViewer.vue` / `JsonMergeViewer.vue` / `DiffLeafViewer.vue`
- [x] `JsonEditor` 复用主题

### 任务 3：DiffTree UX

- [x] 共享展开 + 展开态懒挂载（后续增量去掉视口销毁，见同日 side-radio 计划）
- [x] 布局精简 + Merge/单栏接入

### 任务 4：MergePreview

- [x] CM 展示 + 格式化/压缩

### 任务 5：验证与文档

- [x] `pnpm test:run` / lint / build
- [x] 同步 `.docs/ui/README.md`；计划归档

---

## 后续增量

性能与选边 UX、两列空态、结果合并来源高亮见  
[`.docs/plans/archive/2026-08-17-side-radio-result-annotate.md`](./2026-08-17-side-radio-result-annotate.md)。
