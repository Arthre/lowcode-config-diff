# 工作台胶囊栏头与分层目录

**日期：** 2026-08-20  
**状态：** 已完成  
**关联计划：** [`.docs/plans/archive/2026-08-20-workbench-capsules-directory.md`](../plans/archive/2026-08-20-workbench-capsules-directory.md)  
**前置：** [差异块工作台后续](./2026-08-20-chunk-workbench-followup.md)（已落地）  
**继承：** [可编辑双栏文本合并工作台](./2026-08-18-editable-two-way-merge.md)（口径与锁定决策，除本文件 delta 外不得改写）  
**影响模块：** `TwoWayMergeEditor`、`ChunkJumpList`、`DiffMinimap`、`HomeView`、`minimapSnapshot` / `chunkMinimapLayout`、新增 `configItemDiff` / `jsonPathOffset`；迭代追加 `lineNumberAtOffset`、目录抽屉列宽、缩略轨补测跳转  
**不改动：** Core `diffConfig` / `mergeConfig`、`←`、JSON Path 勾选合并、徽章与上一个/下一个的**文本块**单位、胶囊与编辑器对齐、窄屏并排

---

## 一句话口径

> 栏头劈成与左右编辑器等宽的两枚胶囊；目录移到缩略轨右侧，按 JSON **配置项**分层展示字段 from→to；页眉保留块构成，并追加字段/配置项计数；缩略轨左右色带与 Merge 对齐滚动共用像素坐标。采纳单位仍是文本差异块。

---

## 背景与目标

Operate 后续已有类型构成、gutter 着色与扁平块目录。栏头通栏把侧栏宽度算进去，对不齐编辑器；目录只有类型+首行预览，扫读不出「哪一项、哪些字段」；缩略轨按两侧各自行数归一化，左右对比快照与滚动位置错位。

**成功标准：** 胶囊与左右编辑器对齐；有 JSON 时目录按 `tableGrid[3]` 这类配置项分层，能点到字段；页眉同时能看到块构成和字段/配置项规模；缩略轨左右刻度与视口滑块、编辑器滚动同位。

---

## 方案概述

布局改为「主列（胶囊 + 查找 + 编辑器）| 缩略轨 | 目录」。配置项分组在 composable 里走树（**不**调用 `diffConfig`，因其数组整段）。缩略色带改用与 `cachedChunkBands` 相同的对齐像素 / `scrollHeight`。分组、偏移、色带只在文档/块数/尺寸变化时算，滚动只更新锚点、当前组与视口滑块。

---

## 锁定决策

| 项        | 锁定                                                                 |
| --------- | -------------------------------------------------------------------- |
| 采纳单位  | 仍为 CM 文本差异块；`→` 语义不变                                     |
| 数组认身  | 按下标（展示 `tableGrid[3]`）；本次不做 `_designerKey`               |
| 徽章/导航 | `chunkAnchorText` 与上一个/下一个仍按文本块                          |
| 副行      | **保留** `新增 n · 删除 n · 修改 n`；能解析时**追加**字段/配置项两行 |
| 配置项    | 路径上最近的对象数组元素；没有则归到顶层 key                         |
| 目录回退  | 非法 JSON / 分组为空：仍用现行扁平文本块行                           |
| 缩略坐标  | 左右列同一套 Merge 滚动像素；删除/修改画左、新增/修改画右            |
| Core      | UI **不调用** `diffConfig` / `mergeConfig`                           |
| 滚动      | 继承 2026-08-19：滚动不重算分组、预览、像素带、色带                  |
| 窄屏      | Merge 仍左右并排                                                     |

---

## 架构与数据流

```text
文档 / 块数 / resize（非 scroll）
    │
    ├─ kindOfChunk / countChunkKinds / chunkJumpPreview
    ├─ cachedChunkBands（lineBlockAt 像素）
    ├─ bandsFromPixelSpans + 按 kind 分列 → DiffMinimap
    ├─ diffConfigItems(left, right) → groups / fields / items
    └─ jsonPathOffset → 组/字段跳转偏移
         │
         ├─ emit('chunks', count, current, kinds, fieldSummary)
         ├─ ChunkJumpList（groups 或扁平回退）
         └─ 滚动：只改 current、当前组、viewportBand
```

---

## 需求变更

### + 新增

- [胶囊栏头]：参考配置 / 目标配置各一枚独立表面（border + radius-lg + surface），中间 revert 槽透明，宽度与左右编辑器对齐（不含缩略轨与目录）。
- [字段摘要]：`{n} 个字段变化`、`涉及 {m} 个配置项`；有差异且两侧均可 `parseConfig` 时显示在块构成副行之下。
- [`diffConfigItems`]：走树分组；对象按 key、数组按下标；一侧缺席且另一侧是含 object 元素的数组时，缺席侧当成 `[]` 再按下标拆（`{}` vs `{ tableGrid: [{…},{…}] }` → `tableGrid[0]` / `tableGrid[1]`）；object 与 array 类型冲突不走下标。配置项 = 最近对象数组下标，否则顶层 key；叶子为 primitive / 类型不一致 / 不再拆的数组值；组类型相对目标侧：仅目标有→新增，仅参考有→删除，否则修改；**项变化** = 组内叶子数；值 `JSON.stringify`，修改为 `left → right`，过长截断。
- [`jsonPathOffset`]：源文本中定位路径偏移；找不到返回 `null`。
- [分层目录]：组头 `▸ 修改 · tableGrid[3]` + `N 项变化`；展开后字段名与 from→to；当前锚点落入的组默认展开且 `aria-current`。滚动高亮按当前块 `kindOfChunk` 分轨：删除块只在 `kind==='removed'` 的缓存偏移里取最后一个 `offset <= fromA`；其余块只在非 `removed` 组里取最后一个 `offset <= fromB`；找不到则为空。`▸` 只切换展开；点标题跳到该组第一条叶子；点字段跳到该字段（优先目标文档，删除用参考）；组偏移缓存未命中时回退 `goToChunkAt(jumpActiveIndex)`（`>=0`），不要无响应。
- [缩略像素带]：`bandsFromPixelSpans`；同一块左右列垂直位置相同。

### ~ 修改

- [栏头宽度]：从通栏（含侧栏宽度）改为只占编辑器主列。
- [查找条宽度]：随主列收窄，不再压到目录上（功能不变）。
- [目录位置]：从缩略轨左侧改为右侧；宽度约 16rem。
- [上一个/下一个]：从普通 `.ui-btn` 改为成对导航（上一个描边 + chevron-up；下一个 `.ui-btn-soft` + chevron-down）。
- [缩略轨坐标]：从「每侧行号 / 该侧行数」改为「对齐像素 / Merge `scrollHeight`」；resize 时与块带一起重测。此条覆盖 [2026-08-19](./2026-08-19-chunk-nav-scroll-perf.md) 中「由偏移区间按行数收成 0–1 带」的坐标口径，**不**恢复滚动路径上的 `lineBlockAt`。
- [`chunks` 事件]：追加第四参 `{ available, fields, items }`；前三参不变。

### 非目标

- `_designerKey` 认身
- JSON Path 勾选、批量应用、把 `diffConfig` / `mergeConfig` 接回 UI
- 徽章或上一个/下一个改成按配置项
- 恢复 `←`、虚拟列表、滚动时重算分组/色带
- 启用 `collapseUnchanged`、换 DESIGN.md 视觉世界

---

## 技术决策

- 分组与偏移放 `src/composables/`，无 Vue/DOM；相等判断复用 `deepEqual`。
- 不改 Core 数组整段语义。
- `jsonPathOffset` 对源文本做轻量扫描，不引入新依赖。
- 测试：`describe` / `it` 中文；`*.test.ts`。
- 界面文案简体中文。

---

## 潜在影响清单

- 栏头 / 查找条不再横跨侧栏，窄屏主列更窄。
- 目录从扁平块预览变为配置项树；非法 JSON 仍扁平。
- 页眉副行变高（两行或三行）。
- 缩略轨刻度位置会变（这是修正，不是行为倒退）。
- `chunks` 监听方若只解前三参，第四参可忽略；HomeView 需接 fieldSummary。

---

## 验收清单

1. 胶囊左右边与对应编辑器对齐；中间槽对 revert 槽。
2. 有差异：块构成副行仍在；可解析时其下为字段变化 + 涉及配置项。
3. 无差异：只有「无差异」；非法 JSON：块构成在、字段摘要无。
4. 目录在缩略轨右侧；示例结构可扫读；点击跳到对应行。
5. 上一个/下一个仍按文本块步进；样式为成对导航。
6. 两侧行数不同时，同一差异块在缩略轨左右列同位；点击比例与滚动一致。
7. 滚动不重算分组/色带/预览。
8. `pnpm lint` / `pnpm test:run` / `pnpm build` 通过。

---

## 迭代：页眉精简、目录抽屉与缩略轨跳转

本节约定覆盖页眉层级、字段摘要位置、目录推开抽屉、行号与快拖/点击无响应。胶囊栏头、配置项分层、文本块导航单位、缩略轨像素坐标仍以上文锁定为准，除本节约明确改写的条目外不得回退。

**一句话口径：** 页眉压成单行，字段/配置项计数下放到目录头；目录改为默认可收起的推开式抽屉并带动画；列表带跳转侧行号；缩略轨快拖结束后强制补测，目录点击必须落到对应行。

**成功标准：** 页眉一行扫完；目录默认可推入/推出且动画可感知；组与字段能看到与 gutter 一致的行号并点到对应行；快拖缩略轨结束后高亮仍在、再点目录仍跳转。

### 本迭代锁定

| 项          | 锁定                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------ |
| 页眉统计    | 保留 `n / m 个差异` 与 `新增 n · 删除 n · 修改 n`；字段/配置项两行**离开页眉**，进目录顶栏 |
| 页眉结构    | 品牌行与工具行合并为**一条**；上一个/下一个仍按文本块，文案改为「上一个 / 下一个」         |
| 目录抽屉    | **推开**（改列宽，不 overlay）；默认展开；不写入 localStorage                              |
| 抽屉手柄    | 缩略轨与目录之间常驻，收起后仍可点开；不在页眉再放一份                                     |
| 动画        | 约 240ms 宽度过渡；`prefers-reduced-motion: reduce` 时瞬时                                 |
| 行号        | 1 起，与编辑器 gutter 同侧；删除→参考，其余→目标；组头与字段都显示；格式 `L218`            |
| 快拖修复    | 拖结束与跳转前对左右 View `requestMeasure`，再读 `lineBlockAt` / 设 `scrollTop`            |
| 目录未命中  | 禁止回退到「当前块」；按组/字段偏移找最近块，再找不到才停在原地并保持可再点                |
| Core / 胶囊 | 不改；窄屏 Merge 仍左右并排                                                                |

本迭代覆盖上文「副行追加字段/配置项两行」与「组偏移缓存未命中时回退 `goToChunkAt(jumpActiveIndex)`」。

### 架构与数据流（本迭代）

```text
页眉（单行）
  品牌 · 徽章+块构成 · 上一个/下一个 · 查找/复制/导出/主题
                         │
TwoWayMergeEditor
  主列（胶囊+查找+Merge）| 缩略轨 | 手柄 | 目录列（宽 16rem↔0）
                                              │
                         layout（文档/块数/尺寸/抽屉动画结束）
                              ├─ jsonPathOffset + lineNumberAtOffset
                              ├─ 组/字段行号缓存
                              └─ 目录顶栏：字段变化 / 配置项
                         滚动：只更新锚点、当前组、视口滑块
                         缩略拖结束 / 点目录：requestMeasure → 再滚
```

### 需求变更（本迭代）

#### + 新增

- [目录抽屉]：目录可收起/展开；默认展开；从侧栏推入推出，伴随宽度动画；收起后主列变宽，缩略轨仍在；手柄 `aria-expanded`，标签「收起目录」/「展开目录」。
- [目录顶栏]：可解析且有字段变化时显示 `{n} 个字段变化 · 涉及 {m} 个配置项`；非法 JSON / 无分组时不显示这两句（扁平块目录仍可用）。
- [行号]：组头与每条字段显示跳转侧行号 `L{n}`；与点该项后编辑器滚到的行一致。
- [跳转补测]：目录跳转与缩略拖结束必须先让左右 EditorView 补测，再设置滚动与选区，避免未测区间高亮缺失。

#### ~ 修改

- [页眉层级]：从「品牌行 + 工具行（徽章下再叠块构成与字段两行）」改为**单行**；块构成与徽章同一视觉簇，不再单独占行。
- [字段摘要位置]：从页眉副行改为目录顶栏；页眉不再出现「n 个字段变化 / 涉及 m 个配置项」。
- [上一个/下一个文案]：从「上一个差异 / 下一个差异」改为「上一个 / 下一个」（仍 `aria-label` 完整「上一个差异 / 下一个差异」）；成对 chevron 样式保留。
- [目录未命中回退]：从「缓存偏移缺失则 `goToChunkAt(当前锚点)`」（看起来没反应）改为「按该组/字段偏移定位最近文本块；仍失败则不滚动」。
- [缩略拖结束]：从只 `syncEditorChrome(false)`（不重测块带）改为补测后重测当前视口相关滚动位置并同步锚点；拖动中仍不在每次 move 上对全量块 `lineBlockAt`。

#### - 移除

- [页眉字段两行]：被目录顶栏替代，页眉不再渲染 `.ui-diff-field-row`。

#### 非目标（本迭代）

- 目录开关持久化、覆盖在编辑器上的 overlay 抽屉、虚拟列表
- 徽章或上一个/下一个改成按配置项
- `_designerKey` 认身、接回 `diffConfig` / `mergeConfig`
- 启用 `collapseUnchanged`、换视觉世界
- 修改字段同时显示左右两个行号

### 技术决策（本迭代）

- 行号纯函数放 `src/composables/`：`lineNumberAtOffset(source, offset)`，不依赖 Vue/DOM；用换行计数，与 CM `line.number` 在合法偏移上一致。
- 组/字段行号只在 layout 路径计算（与 `jsonPathOffset` 同频）；滚动不重算。
- 抽屉用列宽过渡（`16rem` ↔ `0`），不用 `display: none` 切掉（否则无法动画）；动画期间 resize 防抖，**过渡结束一次** `refreshChunkBands` + 缩略快照，避免每帧全量 `lineBlockAt`。`transitionend` 未到时按 `DIRECTORY_DRAWER_DURATION_MS` 兜底补测；减少动效则 `nextTick` + rAF 立即补测。`.cm-mergeView` 必须 `width: 100%`，列宽变化后左右 View `requestMeasure`，编辑器列随剩余宽度重排。
- 目录列自身纵向 flex + `min-height: 0`；列表 `overflow-y: auto`，组/字段溢出时只滚目录，不滚整页、不抢 Merge 滚动。
- `minimapDragging` 必须在 `pointerup` / `pointercancel` / `lostpointercapture` / 组件卸载时清掉；结束路径与跳转路径共用「补测再滚」。
- 跳转未命中禁止回退当前块：抽纯函数（如 `nearestChunkIndexByOffset`）按组/字段偏移找最近文本块；无偏移或仍失败返回 `-1`，调用方不滚动。
- 测试：`describe` / `it` 中文；`*.test.ts`。界面文案简体中文。

### 潜在影响（本迭代）

- 页眉变矮，Merge 可视高度增加。
- 字段/配置项计数改在目录头；目录收起时这两句不可见（手柄不重复长文案，靠 `aria-label`）。
- 收起/展开目录会触发 Merge 宽度变化：过渡结束（或兜底时长 / 减少动效立刻）对左右 View `requestMeasure` 并重测块带与缩略快照。
- 快拖后高亮与跳转应变稳；若某条路径 `jsonPathOffset` 失败，该项无行号、点击不滚动（不再误跳当前块）。

### 验收清单（本迭代追加）

9. [x] 页眉视觉上一行：能看到品牌、`n / m 个差异`、新增/删除/修改、上一个/下一个、导出簇；**没有**字段/配置项两行；页眉不再渲染 `.ui-diff-field-row`。
10. [x] 目录展开时顶栏有「n 个字段变化 · 涉及 m 个配置项」（可解析且有变化时）；组头与字段带 `L{n}`。
11. [x] 默认目录展开；页眉图标收起/展开有宽度动画（减少动效时瞬时）；收起后对照变宽并补测 Merge 列宽，再点能打开。目录组/字段溢出时可独立滚动。
12. [x] 点组头/字段滚到对应行并选中；行号与 gutter 一致（删除→参考，其余→目标；不显示左右两个行号）。
13. [ ] 缩略轨快速上下拖再松开：当前视口差异高亮仍在；随后点目录仍跳转。（接线已落地，需真机快拖确认）
14. [x] 上一个/下一个仍按文本块步进并绕回；可见文案为「上一个 / 下一个」，`aria-label` 仍为「上一个差异 / 下一个差异」。
15. [x] `pnpm lint` / `pnpm test:run` / `pnpm build` 通过。
