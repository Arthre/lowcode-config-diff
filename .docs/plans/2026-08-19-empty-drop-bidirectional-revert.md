# 空态、拖放命中与双向采纳 实施计划

> **给 Agent 执行者：** 按本清单 TDD 实施。步骤 checkbox 跟踪。用户未要求时不提交。

**日期：** 2026-08-19 **状态：** 已完成 **关联设计：** `.docs/specs/2026-08-19-empty-drop-bidirectional-revert.md` **目标：** 空态提醒与落区、拖放按栏命中、`←` 把结果块写回参考 **架构：** 纯函数判栏与块写回；Merge 宿主叠空态层；`renderRevertControl` 双钮，`←` 拦截 mousedown。 **技术栈：** Vue 3、CodeMirror MergeView、Vitest

## Global Constraints

- 包管理器 pnpm；文案简体中文；单测 `describe`/`it` 中文
- 导出只认右栏；`src/core/*` 禁止依赖 Vue
- 窄屏禁止 `.cm-mergeViewEditors { flex-direction: column }`

---

## 文件

- 创建：`src/composables/sideFromClientX.ts`、`src/composables/chunkRevertChange.ts` 及对应 `*.test.ts`
- 修改：`src/components/TwoWayMergeEditor.vue`、总览规格、PRODUCT / DESIGN / `.docs/ui` / README

### 任务 1：纯函数

- [ ] `sideFromClientX`：中线以左为 left，否则 right
- [ ] `chunkRevertChange`：对齐 merge `revertClicked`（slice 到 `to-1`、必要时补 lineBreak）

### 任务 2：空态与拖放与双箭头

- [ ] 空态层、铺满、藏缩略图、clientX 拖放、`←`/`→`

### 任务 3：文档与验证

- [ ] 活文档 + `pnpm lint` / `pnpm test:run` / `pnpm build`
