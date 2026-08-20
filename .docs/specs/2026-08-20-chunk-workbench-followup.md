# 差异块工作台后续

**日期：** 2026-08-20  
**状态：** 已完成  
**关联计划：** [`.docs/plans/archive/2026-08-20-chunk-workbench-followup.md`](../plans/archive/2026-08-20-chunk-workbench-followup.md)  
**前置：** [Operate 扫读优化](./2026-08-20-ui-operate-pass.md)（已落地）  
**继承：** [可编辑双栏文本合并工作台](./2026-08-18-editable-two-way-merge.md)（口径与锁定决策，除本文件 delta 外不得改写）  
**影响模块：** `chunkKind`、`chunkJumpPreview`、`TwoWayMergeEditor`、`HomeView`、`ChunkJumpList`  
**不改动：** Core、`←`、缩略轨算法、JSON Path 勾选

曾按 F1 类型统计 → F2 gutter → F3 目录分切片实施；落地后合并为本文件，不再保留独立切片规格。

---

## 一句话口径

> 左栏为参考配置、右栏为目标配置；采纳单位仍是 CodeMirror 文本差异块；中间只保留 `→`；页眉与目录展示块的**类型构成**，不回到 JSON Path 勾选合并。

---

## 背景与目标

Operate 第一阶段已理清工具栏与命名。尚未落地的是：差异构成、中间槽可扫读、大 JSON 的块目录。这些必须落在**现行文本块主路径**上，而不是 V0.1 的叶子选边。

**成功标准：** 用户扫一眼知道有没有差异、差异大致是新增/删除/修改；能从目录点进某一块；`→` 语义不变。

---

## 方案概述

先抽可单测的块分类（相对目标配置 B），页眉消费计数；gutter 与目录只读同一分类结果，禁止在组件里再写一套区间判断。分类、预览与块像素带一样：只在文档或块数量变化时计算，**滚动路径禁止**扫 `lineBlockAt`、重分类或重算预览。

```text
mergeView.chunks
    │  仅文档/块数变化
    ▼
kindOfChunk / countChunkKinds / chunkJumpPreview
    │
    ├─ emit('chunks', count, current, kinds) → HomeView 副行
    ├─ revert 按钮 data-chunk-kind（layout）；滚动只切 is-current
    └─ ChunkJumpList items（layout）；滚动只改 activeIndex
```

---

## 锁定决策

| 项       | 锁定                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 采纳单位 | CM 差异块，不是 JSON path                                                              |
| 中间区   | 仍为 `revertControls: 'a-to-b'`，只显示 `→`；`←` 保持下线                              |
| 块类型   | 相对**目标配置（B）**：`added` 仅目标有；`removed` 仅参考有；`modified` 两侧都有且不同 |
| 分类输入 | 与 `chunkRevertChange` 相同的 `{ fromA, toA, fromB, toB }`                             |
| 滚动     | 继承 2026-08-19：滚动只更新锚点与缩略轨视口；分类/预览/像素带不在 scroll 上重算        |
| 窄屏     | 仍左右并排，禁止 Merge 改 column                                                       |
| 导出     | 只认右栏（目标配置）                                                                   |
| Core     | UI **不调用** `diffConfig` / `mergeConfig`                                             |

两侧区间皆空（MergeView 正常不应产生）：防御为 `modified`。

---

## 需求变更

### + 新增

**分类与页眉**

- [`kindOfChunk`]：相对目标配置（B）返回 `'added' | 'removed' | 'modified'`。
  - `fromA === toA` 且 `fromB !== toB` → `added`（仅目标有）
  - `fromB === toB` 且 `fromA !== toA` → `removed`（仅参考有）
  - 其余（含两侧皆空的防御）→ `modified`
- [`countChunkKinds`]：对块数组计数，返回 `{ added, removed, modified }`。
- [`chunkKindSummaryText`]：`新增 ${added} · 删除 ${removed} · 修改 ${modified}`（有差异才调用；计数为 0 也写出）。
- `chunks` 事件增加第三参 `ChunkKindCounts`；无块时传 `{ added: 0, removed: 0, modified: 0 }`。
- 页眉：`chunkCount > 0` 时在徽章下显示副行，三类分别用 `--diff-added` / `--diff-removed` / `--diff-modified`。

**gutter**

- `→` 按类型使用 `--diff-added` / `--diff-removed` / `--diff-modified`。
- 当前视口锚点块的 `→` 带 `is-current`（`--accent` 描边或 `--accent-muted` 底），`aria-current="true"`。
- `title` / `aria-label`：`新增：将此差异写入目标配置` 等。槽宽保持 `2.4em`；库继续设置按钮 `top`。

**目录**

- [`ChunkJumpList`]：props `items: { kind, preview, index }[]`、`activeIndex`（0 起，无块为 -1）、`jump` 事件。
- 每行：类型短名「新增 / 删除 / 修改」（语义色）+ 单行预览（mono、ellipsis）。
- 点击或 Enter/Space 跳转到该块；`aria-label="差异块目录"`；当前行 `aria-current="true"`。
- [`chunkJumpPreview`]：`slice(from, max(from, to))` 取第一行 trim；超长默认 80 字加 `…`；空或空白为「（空行）」。
- 预览源：`added` / `modified` 用 B 的 `fromB/toB`；`removed` 用 A 的 `fromA/toA`。
- 跳转与「下一个差异」共用缓存块顶：`cachedChunkBands[i].start`，选中 B 的 `fromB`。

### ~ 修改

- [`chunkAnchorText`]：主文案保持「无差异」/「N 个差异」/「current / total 个差异」。
- `onChunks`：从 `(count, current)` 改为同时收下 `kinds`。
- `TwoWayMergeEditor` 舞台：目录在缩略轨左侧，二者并存。双侧都空时一并隐藏。

### 非目标

- JSON Path 差异列表、勾选、批量「应用选中」
- 恢复 `←` 或 `revertControls: 'a-to-b-and-b-to-a'`
- 把 `src/core/diff.ts` / `merge.ts` 接回 UI
- 搜索 JSON Key / Value 分模式（Ctrl+F 已有）
- 加宽 revert 槽到能写下「新增」整词
- 用差异目录替换缩略轨
- 滚动时重算 preview / kind，或对每块 `lineBlockAt`
- 虚拟列表（目录原生滚动）
- 改 2026-08-18 总览正文里的历史「结果」用词

---

## 技术决策

- 类型与 `MergeChunkRange`（`chunkRevertChange.ts`）字段兼容；`import type` 复用，不复制结构。
- 禁止在 `onMergeScroll` 里调用 `countChunkKinds` / 全表 `kindOfChunk` / `chunkJumpPreview`。当前态只用已有 `data-chunk-index`。
- 文案函数纯字符串，不返回 VNode。`chunkKind.ts` 保持无 DOM。
- `renderRevertControl` 库签名是 `() => HTMLElement`，拿不到 chunk：`shouldLayout` 时按 DOM 顺序与 `mergeView.chunks` 对齐。
- 跳转禁止按文档位置 `lineBlockAtHeight`。
- 列表 Operate：紧凑行、类型字 caption，不要营销卡片堆。
- 测试：`chunkKind.test.ts`、`chunkJumpPreview.test.ts`；`describe` / `it` 中文。

---

## 验收清单

1. 单测：仅 B / 仅 A / 双侧非空 / 两侧皆空 / 空数组计数；预览空区间、多行首行、截断
2. 无差异：只有「无差异」，无类型副行；双侧空时目录与缩略轨隐藏
3. 有差异：副行三数字之和等于 `chunkCount`；目录行数 = 块数
4. 滚动：副行数字与目录预览不变，仅主徽章当前序号、当前 `→`、目录高亮跟随
5. 仅目标有的块 `→` 为新增色；仅参考有为删除色；双侧改为修改色；无 `←`；槽宽约 2.4em
6. 点击目录第 n 行：滚到该块顶，页眉当前为 n，当前 `→` 同步
7. 缩略轨仍可点可拖；窄屏 Merge 仍并排
8. `pnpm lint` / `pnpm test:run` / `pnpm build` 通过
