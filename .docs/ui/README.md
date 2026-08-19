# UI 模块

前端视图与组件层。编辑器与页面副作用可依赖 Vue；**不得**把 Vue / DOM 引入 `src/core/*`。

## 设计权威

- 产品真相：[PRODUCT.md](../../PRODUCT.md)
- 视觉系统：[DESIGN.md](../../DESIGN.md)（冷灰画布 + 青绿强调；亮/暗 token 落地于 `src/styles/tokens.scss`；手动主题 + View Transition 圆形揭示）

## 样式目录约定

- 入口：`src/styles/index.scss`（`main.ts` 只引这一处；全局样式统一 **SCSS**）
- 新颜色 / 圆角 / 阴影 → `tokens.scss`（亮暗成对）
- 跨组件复用的 `.ui-*` → `primitives.scss` / `semantic.scss` / `layout.scss`
- 某一功能多组件复用 → `styles/features/<name>.scss`，并在 `index.scss` 末尾 `@use`
- 仅单个组件使用 → 该组件 `<style lang="scss" scoped>`，不进 `src/styles`
- 依赖：开发依赖 `sass`（Vite 原生编译 SCSS）

## 主题

- 切换：`ThemeToggle` → `useThemeToggle`（VueUse `useDark`，键 `lcd-color-scheme`）
- 暗色选择器：`html.dark`（`index.html` FOUC 脚本与之对齐）
- 动画：亮→暗亮色圆形*收回*、暗→亮亮色圆形*进入*（约 340ms，CSS 首帧驱动 + 暗色过渡底，抑白闪）；无 API / 减少动效时瞬时切换
- 页眉：全宽扁平 chrome（非面板）；工作区：满高双栏 Merge（`layout.scss` 单列 flex，Merge 吃剩余高度）
- 页眉工具：当前/总数块计数、上一条/下一条、查找、复制、下载菜单（含压缩下载）；保留 `ThemeToggle` 与「本地处理 · 不上传」
- 单测：`src/composables/useThemeToggle.test.ts`（存储键与揭示半径）

## 当前状态

| 文件                                        | 职责                                                                                                                              |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/`                               | 设计系统：`tokens` / `theme-transition` / `base` / `primitives` / `layout` / `semantic`（侧标签、状态色）；功能扩展见 `features/` |
| `src/views/HomeView.vue`                    | 工作台：满高 `TwoWayMergeEditor`；页眉主题切换、块导航（当前/总数）、查找、复制、下载/压缩下载                                    |
| `src/components/TwoWayMergeEditor.vue`      | 可编辑 MergeView：栏头导入；分栏空态；查找条在编辑器外；右侧冲突点缩略轨；中间仅 `→`；按行 diff                                   |
| `src/composables/sideFromClientX.ts`        | 拖放按横坐标判栏                                                                                                                  |
| `src/composables/chunkRevertChange.ts`      | 差异块写回公式（保留；`←` UI 暂时下线）                                                                                           |
| `src/components/MergeSearchDock.vue`        | 栏头与编辑器之间的查找/替换条                                                                                                     |
| `src/components/DiffMinimap.vue`            | 冲突点缩略轨，点击/拖动跳转                                                                                                       |
| `src/components/UiTooltip.vue`              | 按钮说明气泡（默认朝上，空间不够则翻转）                                                                                          |
| `src/components/DownloadMenu.vue`           | 下载菜单：原文 / 压缩                                                                                                             |
| `src/composables/diffByLine.ts`             | MergeView `diffConfig.override`：按行对照，避免未改行并进同一块                                                                   |
| `src/composables/chunkMinimapLayout.ts`     | 冲突带、视口与点击滚动换算                                                                                                        |
| `src/composables/chunkNavAnchor.ts`         | 视口锚点下标、上一条/下一条步进、页眉文案                                                                                         |
| `src/composables/minimapSnapshot.ts`        | 按差异区间标记冲突行                                                                                                              |
| `src/composables/placeTooltip.ts`           | 气泡方向与视口夹取                                                                                                                |
| `src/composables/packRightDocDownload.ts`   | 右栏下载打包：合法则 `compressConfig`                                                                                             |
| `src/composables/pickJsonFile.ts`           | 从文件列表优先取出 JSON                                                                                                           |
| `src/composables/useMergeSideImport.ts`     | 双侧导入/粘贴全文/清空/拖拽态                                                                                                     |
| `src/components/ThemeToggle.vue`            | 页眉亮/暗切换按钮（太阳/月亮）                                                                                                    |
| `src/stores/mergeWorkspace.ts`              | Pinia：`leftDoc`/`rightDoc` 与文件名；`importSide` / `setLeftDoc` / `setRightDoc` / `clearSide`；无 persist                       |
| `src/composables/prepareImportText.ts`      | 导入预处理：合法 object/array 根则 `formatConfig` 一次；非法/空/顶层 primitive 保留原文                                           |
| `src/composables/describeRightDocExport.ts` | 右栏导出状态描述：empty / valid / invalid+中文（含行列）；只提示不阻断                                                            |
| `src/composables/codemirrorTheme.ts`        | CM6 共享主题、可写 JSON 扩展（含 `history` + `historyKeymap`）、中文查找/替换、`@codemirror/merge` 高亮主题                       |
| `src/composables/useThemeToggle.ts`         | `useDark` + View Transitions 圆形揭示；存储键 `lcd-color-scheme`                                                                  |
| `src/composables/useJsonDocument.ts`        | 纯校验/格式化：`evaluateJsonDocument` / `formatJsonDocument`（复用 `parseConfig` / `formatConfig`）                               |
| `src/utils/exportConfig.ts`                 | `copyText` / `downloadJsonFile`（下载固定 `config.json`）                                                                         |

### 现行主路径

打开即对照：满高可编辑 MergeView，导入收在栏头。无「开始 Diff」门禁。复制/下载只出右栏（`describeRightDocExport` 提示后仍导出）。刷新不恢复（store 无 persist）。

- `TwoWayMergeEditor`：左参考、右结果；栏头点选/粘贴全文/清空，整栏拖入走 `importSide`（合法则格式化一次）；空栏居中提醒与虚线落区；编辑器内 Ctrl+V 仍是光标插入、不格式化；`→` 把参考块写入结果（`←` 暂时下线）；按行 diff；冲突点缩略轨（双侧都空时隐藏）；Ctrl+F 打开编辑器外查找条；上一条/下一条从视口锚点步进并绕回；页眉当前块随视口滚动
- 下载菜单：`config.json` 或压缩为 `config.min.json`（非法 JSON 仍导出原文）
- Core `diffConfig` / `mergeConfig` 仍在源码，**UI 不调用**

界面文案、错误提示与代码注释使用**简体中文**。

## 工作台布局

- 视口高：`.ui-page` `100svh` + overflow hidden；`.ui-workspace` 纵向 flex，Merge `flex: 1; min-height: 0`
- 窄屏：Merge 仍左右并排，宿主可横滑；禁止把 `.cm-mergeViewEditors` 改成 column

## 规格与计划

- 规格（已完成）：[可编辑双栏合并总览](../specs/2026-08-18-editable-two-way-merge.md)、[M1](../specs/2026-08-18-m1-merge-workspace.md)、[M2](../specs/2026-08-18-m2-two-way-editor.md)、[M3](../specs/2026-08-18-m3-home-import.md)、[M4](../specs/2026-08-18-m4-remove-legacy-ui.md)、[空态与双向采纳](../specs/2026-08-19-empty-drop-bidirectional-revert.md)、[块导航锚点](../specs/2026-08-19-revert-unlock-chunk-anchor.md)（`←` 暂时下线）
- 计划（未归档）：[空态与双向采纳](../plans/2026-08-19-empty-drop-bidirectional-revert.md)、[块导航锚点](../plans/2026-08-19-revert-unlock-chunk-anchor.md)
- 计划（已归档）：[总索引](../plans/archive/2026-08-18-editable-two-way-merge.md)、[M1](../plans/archive/2026-08-18-m1-merge-workspace.md)、[M2](../plans/archive/2026-08-18-m2-two-way-editor.md)、[M3](../plans/archive/2026-08-18-m3-home-import.md)、[M4](../plans/archive/2026-08-18-m4-remove-legacy-ui.md)
- 历史规格：[V0.1 总览](../specs/2026-08-15-v0.1-config-diff-merge.md)、[M4 输入](../specs/2026-08-15-m4-ui-json-input.md)、[M5](../specs/2026-08-15-m5-ui-diff-tree.md)、[M6](../specs/2026-08-15-m6-ui-merge-export.md)、[Diff/Result JSON](../specs/2026-08-17-diff-result-json-viewer.md)

## 相对 V0.1

V0.1 选边主路径已被 2026-08-18 可编辑双栏文本合并取代；旧选边组件已删除。活文档以本文与 PRODUCT / DESIGN 为准。
