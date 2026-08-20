# 块导航与缩略轨滚动性能

**日期：** 2026-08-19  
**状态：** 已完成  
**依赖：** [M2 双栏编辑器](./2026-08-18-m2-two-way-editor.md)  
**关联计划：** [`.docs/plans/archive/2026-08-19-chunk-nav-scroll-perf.md`](../plans/archive/2026-08-19-chunk-nav-scroll-perf.md)  
**影响模块：** `TwoWayMergeEditor`、`DiffMinimap`、`minimapSnapshot`

---

## 背景与目标

**现行：** 页眉「上一条 / 下一条」与缩略轨视口带随 Merge 滚动更新；交互语义不变。

Chrome 追踪显示：每次 `scroll` 约 100–360ms，`click` 约 110ms。CPU 热点是 `changedLineFlags`（每个差异区间从文首扫到偏移）以及 `chunkViewportBands` 对**所有**块调用 `lineBlockAt`（逼迫 CodeMirror 测量整份文档）。`emitChunksIfChanged` 在滚动、选区与编辑器 update 上都会走这条路径。

---

## 需求变更

### ~ 修改

- 滚动 / 视口变化只更新页眉锚点与缩略轨视口带：用**已缓存的块像素带**做视口重叠判断（`activeChunkIndexInViewport`），**禁止**在滚动时给每一块 `lineBlockAt`。
- 锚点必须用像素重叠，不能用视口顶文档位置：`scrollTop` 取整后会落在块前空隙，表现为下一条不动、上一条连退两块。
- 冲突缩略带只在文档变化或差异块数量变化时重建；由偏移区间直接收成 0–1 带，不先铺逐行布尔数组，也不把两侧文档 `toString()` 拷出来。
- 上一条 / 下一条用缓存像素带取目标块顶；块像素带只在文档、块数或窗口尺寸变化时重测。
- 缩略轨拖动：窗口级指针跟踪；按下锁定高度；滑块按指针比例绘制并夹在 0–1 轨道内；拖动中不让滚动回写视口，避免滑块飞出或整页出现横向条。

### 非目标

- 不改页眉文案、绕回、视口最上块语义
- 不改 Core、不启用 `collapseUnchanged`

---

## 验收清单

1. 滚动时页眉仍为「当前 / 总数 个差异块」；下一条前进一块、上一条后退一块（`scrollTop` 取整后也如此）
2. 导入或编辑后缩略轨冲突带仍与差异块一致
3. 在缩略轨上快速上下拖动不把滚动/选区漏到整页，视口指示跟手
4. `pnpm lint` / `pnpm test:run` / `pnpm build` 通过
