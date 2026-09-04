# 工作台扫读、空态与折叠差异

**日期：** 2026-08-21  
**状态：** 已完成  
**关联计划：** [`.docs/plans/archive/2026-08-21-workbench-scan-empty-collapse.md`](../plans/archive/2026-08-21-workbench-scan-empty-collapse.md)  
**前置：** [工作台胶囊栏头与分层目录](./2026-08-20-workbench-capsules-directory.md)（已落地）  
**继承：** [可编辑双栏文本合并工作台](./2026-08-18-editable-two-way-merge.md)（口径与锁定决策，除本文件 delta 外不得改写）  
**影响模块：** `HomeView`、`TwoWayMergeEditor`、`ChunkJumpList`、`MergePaneEmptyState`、`DiffMinimap`、`chunkNavAnchor`、`chunkKind`；新增目录筛选 / 横向滚动同步 / 示例配置 composable  
**不改动：** Core `diffConfig` / `mergeConfig`、`←`、JSON Path 勾选合并、徽章与上一个/下一个的**文本块**单位、胶囊与左右编辑器对齐、窄屏并排、页眉 chips 仍为构成说明（不可点）

---

## 一句话口径

> 页眉改成「差异 n / m」；目录收成可筛选的二级符号树；空态居中并给出粘贴与示例；缩略轨与编辑器同高；左右横向滚动对齐；「仅显示差异」按 GitHub 方式折叠编辑器里的相同行。

---

## 背景与目标

分层目录已能按配置项分组，但组头换行、汉字类型、字段两行、行号并排，16rem 里扫读成本高。页眉「1 / 55 个差异」数字抢主语。空态贴在栏上沿，Lottie 占高，只有「选择文件」，粘贴藏在栏头图标。缩略轨与整列工作台（含胶囊）同高，色带按编辑器 `scrollHeight` 归一化，轨道比编辑器长。左右 `.cm-scroller` 各自横滚，长行对不齐。大文件要滚过大量未改行。

**成功标准：** 有差异时页眉可读成「差异 1 / 55」；目录一级路径、二级变化、类型一眼可辨，并能只看新增或只看删除；双侧皆空时能粘贴全文或一键填入示例对并看到差异；缩略轨顶底与编辑器画框对齐；一侧横滚另一侧跟随；打开「仅显示差异」后未改行收成可展开的「N 行相同」。

---

## 方案概述

不改 diff 引擎与采纳单位。文案、目录展示、空态动作、布局槽位、MergeView `collapseUnchanged` 分切片落地。类型筛选只过滤目录，不改上一个/下一个。折叠是编辑器视图开关，默认关。

---

## 锁定决策

| 项           | 锁定                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| 页眉锚点     | 有锚点 `差异 {current} / {total}`；尚未锚到块 `差异 {total}`；无差异仍为 `无差异`                                     |
| 目录一级     | 配置项 JSON 路径（现有 `group.id` / `formatJsonPath`），右侧变化条数                                                  |
| 目录二级     | 字段名 + 值变化，**单行**；过长截断，悬停看全文                                                                       |
| 类型符号     | `●` 修改、`＋` 新增、`−` 删除；色走 `--diff-*`；可见层不用汉字；`aria-label` / tooltip 仍为新增/删除/修改             |
| 行号         | 目录行内**默认不展示** `L{n}`；跳转仍靠点击                                                                           |
| 类型筛选     | 目录顶栏互斥：全部 \| ＋ \| − \| ●；默认全部；只过滤目录（分组与扁平回退都滤）；页眉 chips 只读                       |
| 筛选空态     | 「没有新增项 / 没有删除项 / 没有修改项」+ 显示全部                                                                    |
| 仅显示差异   | **折叠编辑器未改行**（`collapseUnchanged`，GitHub）；不是再滤目录                                                     |
| 折叠参数     | `{ margin: 3, minSize: 4 }`；默认关；不写 localStorage                                                                |
| 折叠开关位置 | 目录顶栏，与类型筛选同一工具条                                                                                        |
| 折叠生命周期 | 优先 Compartment 热切；若包未导出折叠扩展，允许**仅因开关**重建 MergeView，文档从 store 回填（Undo 清空，不弹 Toast） |
| 缩略轨高度   | 与 `.two-way-merge-frame`（编辑器画框）同高，不以胶囊+查找+编辑器的 stage 高为准                                      |
| 目录列高     | 仍可与 stage 同高（含胶囊行），本切片不改                                                                             |
| 横向滚动     | 同步左右 `EditorView.scrollDOM.scrollLeft`；不同步 `scrollTop`（纵向仍由 `.cm-mergeView` 统一）                       |
| 示例配置     | **双侧都空**时显示；点任一侧即两侧同时 `importSide` 写入锁定示例对                                                    |
| 粘贴         | 空态增加「粘贴全文」，走现有 `pasteAsFullSide`；不把 Ctrl+V 改成整栏粘贴                                              |
| 空态布局     | 垂直水平居中；去掉 `padding-top: 18%`；Lottie 明显缩小                                                                |
| 滚动热路径   | 继承：滚动不重算分组/预览/色带；折叠或点开「N 行相同」导致 `heightChanged` 时**要**重测色带                           |

---

## 切片（实施顺序）

| 切片                        | 可独立验收                     | 依赖                                        |
| --------------------------- | ------------------------------ | ------------------------------------------- |
| A 页眉锚点文案              | 徽章为「差异 1 / 55」          | 无                                          |
| B 空态：居中、粘贴、示例    | 空栏可粘贴、可填示例对         | 无                                          |
| C 目录符号树 + 类型筛选     | 二级单行、可只看删除/新增      | 无                                          |
| D 缩略轨同高 + 横向滚动同步 | 轨高等于编辑器；长行左右对齐滚 | 无                                          |
| E 仅显示差异                | 未改行可折叠展开；色带不错位   | D 的画框结构；E 必须接 `heightChanged` 补测 |

A–D 无环，可按上表顺序或先 D 后 B/C。**E 必须最后**，避免折叠测量与布局改造缠在一起。

---

## 架构与数据流

```text
页眉  chunkAnchorText(current, total) → 「差异 n / m」

目录  groups/items
        → filterConfigItemGroups / filterJumpItems(kindFilter)
        → ChunkJumpList（符号 + 单行；筛选条）

空态  MergePaneEmptyState
        → select / paste / sample（sample 仅双侧空）
        → importSide 左右示例对

布局  two-way-merge-main
        胶囊 + 查找
        two-way-merge-body → [frame | DiffMinimap]
      directory（stage 全高）

横向  a.scrollDOM.scrollLeft ⇄ b.scrollDOM.scrollLeft

折叠  collapseUnchanged 开 → 可见高度变
        → heightChanged → refreshChunkBands + refreshMinimapSnapshot
        （不重跑 diffConfigItems / 预览）
```

---

## 需求变更

### + 新增

- [类型筛选]：目录顶栏互斥分段「全部 / ＋新增 / −删除 / ●修改」。选中后只列出含该类型叶子的组，组内只留该类型字段；扁平回退按块 `kind` 过滤。上一个/下一个仍遍历全部文本块。
- [仅显示差异]：目录顶栏开关，默认关。打开后 MergeView 折叠未改行，保留约 3 行上下文；点击折叠条展开。筛选与折叠是两个控件。
- [粘贴全文（空态）]：空栏可见按钮，调用该侧 `pasteAsFullSide`。
- [填入示例配置]：双侧都空时可见；一次写入锁定的参考/目标示例对（含修改、新增、删除），合法 JSON，走 `importSide`（会格式化）。
- [横向滚动同步]：一侧 `.cm-scroller` 的 `scrollLeft` 变化时写入另一侧；用锁位避免回声。

### ~ 修改

- [页眉锚点]：从 `{current} / {total} 个差异` / `{total} 个差异` 改为 `差异 {current} / {total}` / `差异 {total}`；`无差异` 不变。
- [分层目录展示]：组头从「修改 · path」+ 换行「N 项变化」改为「符号 + path + 条数」一行；字段从「标签 / 值」两行改为「符号 + 字段 + 值」一行；行号默认不画。
- [空态布局]：从贴上沿 + 大 Lottie 改为在该栏画框内居中；Lottie 缩小，把高度让给动作。
- [缩略轨高度]：从 stretch 到「胶囊+查找+编辑器」改为与编辑器画框同高。
- [collapseUnchanged]：覆盖前置规格「不启用 `collapseUnchanged`」。本切片启用为**用户开关**，不是默认常开。
- [`syncEditorChrome`]：`heightChanged`（折叠/展开）须重测块像素带与缩略色带；仍禁止滚动路径上对每块 `lineBlockAt`。

### - 移除

- 目录组头/字段行内默认展示的 `L{n}`（跳转能力保留；行号可留在 `aria-label`）。
- 空态上沿大段留白（`padding-top: min(4.25rem, 18%)`）作为布局手段。

### 非目标

- 页眉 chips 改成筛选器；筛选改变上一个/下一个
- `_designerKey`、JSON Path 勾选、把 `diffConfig` / `mergeConfig` 接回 UI、恢复 `←`
- 换 DESIGN.md 视觉世界；目录虚拟列表
- 编辑器内 Ctrl+V 改为整栏粘贴/格式化
- 筛选、折叠、目录开关写入 localStorage
- 缩略轨改成目录全高或改色带算法口径（仍为对齐像素 / `scrollHeight`）
- 示例向导、多套模板、覆盖已有一侧内容

---

## 示例配置（锁定）

参考（左）：

```json
{
  "title": "列表页",
  "pageSize": 10,
  "showExport": true,
  "tableGrid": [{ "prop": "name", "label": "名称" }]
}
```

目标（右）：

```json
{
  "title": "列表页",
  "pageSize": 20,
  "tableGrid": [
    { "prop": "name", "label": "姓名" },
    { "prop": "status", "label": "状态" }
  ]
}
```

预期能演示：`pageSize` 修改、`showExport` 删除、`tableGrid[0].label` 修改、`tableGrid[1]` 新增。文件名：`示例-参考.json` / `示例-目标.json`。

---

## 技术决策

- 纯逻辑放 `src/composables/`，单测 `*.test.ts`，`describe` / `it` 中文。
- 不改 Core；不引入新依赖。
- 横向同步用 `mergeView.a.scrollDOM` / `b.scrollDOM`，不 `querySelector('.cm-scroller')`。
- 折叠若须重建 MergeView：先卸滚动监听再 `destroy`，再按现有 `a`/`b` 扩展创建；docs 取 `workspace.leftDoc` / `rightDoc`。
- 界面文案简体中文；标识符英文。
- 实现后行为等价精简；不顺手重构无关代码。

---

## 潜在影响清单

- 页眉宽度：文案变短（「个」去掉、「差异」提前），徽章更稳。
- 目录：同一数据源，行高下降，当前组高亮与跳转逻辑不变；筛选后当前组可能被藏起（高亮随过滤结果，不强制改 `activeGroupId`）。
- 空态：Lottie 更小；拖入倒放逻辑保留。
- 示例：覆盖双侧空文档；不清空文件名以外的会话（本就是空）。
- 缩略轨：点击/拖动比例仍相对**编辑器**滚动高度；与胶囊错位消失。
- 横向同步：一侧不够宽时 `scrollLeft` 被夹紧，对侧可停在 max。
- 折叠：Undo 可能在重建时丢失；可见高度变后缩略滑块比例变化（正确）；`→` 仍按块。
- 查找条出现时缩略轨仍只跟编辑器画框，不跟查找条。

---

## 验收清单

1. 有差异且已锚到块：页眉为「差异 1 / 55」形态；无差异仍为「无差异」。
2. 可解析 JSON：目录一级路径、二级单行变化，符号 ●/＋/− 带语义色。
3. 只看删除：目录只剩删除叶子；页眉计数与上一个/下一个仍对全部块。
4. 双侧空：居中空态有选择文件、粘贴全文、填入示例；示例填入后出现差异与目录。
5. 缩略轨顶底与编辑器画框对齐（查找条打开时仍对齐画框，不对齐胶囊）。
6. 一侧横向滚动，另一侧 `scrollLeft` 跟随。
7. 「仅显示差异」开：未改行折叠；点开可展开；开关切换后缩略色带与视口滑块仍对齐。
8. `pnpm lint` / `pnpm test:run` / `pnpm build` 通过。
