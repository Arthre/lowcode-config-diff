# 差异块工作台后续 实施计划

> 已完成并归档。曾按 F1 → F2 → F3 分切片执行；落地后合并为本文件，不再保留独立切片计划。  
> 未经用户明确要求不要 `git commit`。

**日期：** 2026-08-20 **状态：** 已完成  
**关联设计：** [`.docs/specs/2026-08-20-chunk-workbench-followup.md`](../../specs/2026-08-20-chunk-workbench-followup.md)

**目标：** 在现行文本差异块 + 仅 `→` 主路径上，补齐类型统计、gutter 可扫读、块目录跳转。  
**架构：** 分类纯函数先落地；UI 只消费计数与 kind；滚动不重分类、不重算预览。  
**技术栈：** Vue 3、CodeMirror MergeView、Vitest、现有 token（`diff-added` / `diff-removed` / `diff-modified`）

## Global Constraints

- 包管理器仅 pnpm；界面与单测 `describe` / `it` 用简体中文
- 采纳单位是 CM 差异块，不是 JSON path；中间只保留 `→`；`←` 下线
- UI 不调用 `diffConfig` / `mergeConfig`
- 滚动热路径禁止对每块 `lineBlockAt`、禁止重跑分类与预览
- 窄屏 Merge 仍并排，禁止 `.cm-mergeViewEditors { flex-direction: column }`
- 用户未明确要求时不提交、不推送
- `kindOfChunk`：仅 B 非空 → added；仅 A 非空 → removed；其余（含两侧皆空）→ modified
- revert 槽保持 `2.4em`；库设置按钮 `top`；槽内不写「新增」整词
- 无 checkbox、无「应用选中」、不替换缩略轨

---

## 交付文件

- 创建：`src/composables/chunkKind.ts`、`src/composables/chunkKind.test.ts`
- 创建：`src/composables/chunkJumpPreview.ts`、`src/composables/chunkJumpPreview.test.ts`
- 创建：`src/components/ChunkJumpList.vue`
- 修改：`src/components/TwoWayMergeEditor.vue`、`src/views/HomeView.vue`、`src/styles/primitives.scss`
- 活文档：`.docs/ui/README.md`、`PRODUCT.md`、`DESIGN.md`

## 接口（落地）

```ts
type ChunkKind = 'added' | 'removed' | 'modified'
type ChunkKindCounts = { added: number; removed: number; modified: number }
kindOfChunk(chunk: MergeChunkRange): ChunkKind
countChunkKinds(chunks: readonly MergeChunkRange[]): ChunkKindCounts
chunkKindSummaryText(counts: ChunkKindCounts): string
revertControlHint(kind: ChunkKind): string  // 「新增：将此差异写入目标配置」
chunkJumpPreview(source: string, from: number, to: number, maxChars?: number): string

emit('chunks', count, current, kinds)
goToChunkAt(index: number)  // 滚到 cachedChunkBands[index].start，选中 fromB
```

`countChunkKinds` / `kindOfChunk`（对齐 revert meta）/ `chunkJumpPreview` 只在 `shouldLayout`（文档或块数变化）运行。滚动只更新 current、`is-current` 与目录 `activeIndex`。

预览源：`added` / `modified` 用 B；`removed` 用 A。`renderRevertControl` 库不传 chunk，layout 时按 DOM 顺序对齐 `.cm-merge-revert button`。

## 实施顺序（已完成）

1. **F1** 分类纯函数 + 页眉副行：`chunkKind` TDD → `chunks` 第三参 → HomeView 分色副行
2. **F2** gutter：`data-chunk-kind` / `data-chunk-index` 类型色 → 滚动只切 `is-current`
3. **F3** 目录：`chunkJumpPreview` TDD → `ChunkJumpList` + `goToChunkAt`，缩略轨左侧

## 验证

- `pnpm lint` 通过
- `pnpm test:run`：25 文件 / 154 项通过（含 `chunkKind`、`chunkJumpPreview`）
- `pnpm build`（`vue-tsc` + vite）通过

手工仍建议点一次：无差异无副行；副行三数之和 = 总数；滚动只改当前序号；`→` 三色与当前态；目录点击与缩略轨拖动。

## 提交

未提交。仅当用户明确要求时再 `git commit`。
