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
- 页眉：全宽扁平 chrome（非面板）；工作区：未开始 Diff 单列；开始后宽屏双列 **输入/Diff : 统计+结果**（可拖占比，`layout.scss`）
- 右栏（仅 Diff 开始后出现）：紧凑选边统计与全选 TEST / PROD / 恢复默认，其下为**合并来源**，再下为结果；**无**页面导航跳转
- 单测：`src/composables/useThemeToggle.test.ts`（存储键与揭示半径）

## 当前状态

| 文件                                   | 职责                                                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/`                          | 设计系统：`tokens` / `theme-transition` / `base` / `primitives` / `layout` / `semantic`（含 `.ui-side-segment`）；功能扩展见 `features/`        |
| `src/composables/useThemeToggle.ts`    | `useDark` + View Transitions 圆形揭示；存储键 `lcd-color-scheme`                                                                                |
| `src/composables/codemirrorTheme.ts`   | CM6 共享主题、只读 JSON 扩展、聚焦才滚动、中文查找/替换、sideMarks 装饰字段、`@codemirror/merge` 高亮主题                                       |
| `src/components/ThemeToggle.vue`       | 页眉亮/暗切换按钮（太阳/月亮）                                                                                                                  |
| `src/components/JsonEditor.vue`        | 可编辑单栏 CodeMirror 6（保留组件；输入区已改为拖拽导入，当前未挂载）                                                                           |
| `src/components/JsonCodeViewer.vue`    | 只读 JSON：行号、折叠 gutter、JSON 高亮；可选 sideMarks；查找（无替换）；可选 `focusScroll`（差异区点入才滚）                                   |
| `src/components/JsonMergeViewer.vue`   | `@codemirror/merge` MergeView：TEST\|PROD 两列并排；查找；点入后由外层统一滚动（左右同步）                                                      |
| `src/components/DiffLeafViewer.vue`    | 叶值对比：modified 用 MergeView；其余始终两列（缺失侧「无此配置」空态）；仅随「展开对比」挂载                                                   |
| `src/components/JsonInputArea.vue`     | TEST/PROD 双栏拖拽/点选导入、校验态、清空、「开始 Diff」门禁；`emit('start-diff', { test, prod })`                                              |
| `src/composables/useJsonDocument.ts`   | 纯校验/格式化：`evaluateJsonDocument` / `formatJsonDocument`（复用 M1 `parseConfig` / `formatConfig`）                                          |
| `src/composables/diffTreeModel.ts`     | 纯函数：`buildDiffTree` 组树；`withSide` / `withAllSides` / `withDefaultSides` / `withDescendantSides`；`sideStateForPrefix` 混合态             |
| `src/composables/mergeAnnotations.ts`  | 合并来源 keep/drop 标注、`locateJsonPathRange`、结果侧高亮 marks                                                                                |
| `src/stores/diffSession.ts`            | Pinia：`startSession` → `diffConfig`；持有 test/prod、可改 `leaves`、`showUnchanged`；批量选边 API 供 DiffTree / MergePreview 读取              |
| `src/components/DiffTree.vue`          | Diff 树：操作提示、全部展开/折叠、高度随内容、**radio 选边**、叶级展开、容器次要「整支用」；树结构与 side 解耦；批量工具在 HomeView 差异标题区  |
| `src/utils/exportConfig.ts`            | 纯工具：`summarizeMergeSides` / `buildMergeSummaryText` / `copyText` / `downloadJsonFile`（下载固定 `config.json`）                             |
| `src/components/MergePreview.vue`      | 读 session：格式化预览侧别高亮；工具栏在 HomeView 结果标题（图标按钮）；暴露 `download` / `copy` / `scrollToAnnotation`                         |
| `src/composables/useWorkspaceSplit.ts` | 宽屏左右栏占比：`clampWorkspaceMainPct`、`useLocalStorage`（`lcd-workspace-main-pct`）                                                          |
| `src/views/HomeView.vue`               | 工作台：Diff 前单列；开始后可拖拽分栏 + 右栏 sticky 满高；差异标题含批量工具；结果标题含摘要副标题与格式化/压缩/复制/下载图标操作；页眉主题切换 |

### 输入区（M4）

校验状态：`empty` | `valid` | `invalid`；顶层须为 object 或 array。两侧均 `valid` 才可点「开始 Diff」。用户 JSON 不上传、不持久化。

入口为 **拖拽 / 点选文件导入**（无在线编辑器）：每侧显示文件名与校验态，支持清空后重导。

界面文案、错误提示与代码注释使用**简体中文**（见 `AGENTS.md`「中文注释与文案」）；不要用英文提示用户。

单测：`src/composables/useJsonDocument.test.ts`（不对 CM6 做脆弱 DOM 单测）。

### Diff 树（M5 + JSON 展示优化）

- 默认只渲染差异叶及其祖先容器；「显示无差异」开启后相同节点为 `equal`（只读、无选边），不进入 merge 叶子列表。
- 默认 side：`modified` / `added` → `test`；`removed` → `prod`（引擎产出；恢复默认按 type 重算）。
- 容器 / 差异叶 / 相同节点均可 ▶/▼ 展开折叠；叶默认展开；复杂值展开后挂载对比区；**选边控件**（TEST/PROD）；叶标题区独立底色 + 加大 path，**滚动时吸顶**；树结构指纹不含 side，选边不重建整树。
- 懒挂载仅绑定叶展开：展开才创建、收起才销毁；**不按视口**销毁重建。
- 差异/结果编辑器：差异区**点入后**才捕获滚轮（结果区常可滚）；`Ctrl/Cmd+F`（查找）、`Ctrl/Cmd+H`（查找面板）、`F3` / `Ctrl/Cmd+G`（下一个）等；只读隐藏替换。
- Merge 对比为完整两列；单侧缺失时仍两列布局，空侧提示「无此配置」。
- `diffSession.leaves` 交给 `mergeConfig`（由 MergePreview 调用）。

单测：`src/composables/diffTreeModel.test.ts`。

### 合并预览与导出（M6 + 压缩/格式化）

- 选边变化时 `MergePreview` 用 `mergeConfig(test, prod, leaves)` 即时更新。
- **合并来源**列表在右栏选边统计下方、结果上方：每叶 path + TEST/PROD + keep/drop 说明；点击可定位结果预览中的 keep 片段；格式化预览中对 keep 片段按侧别着色。
- 预览为只读 `JsonCodeViewer`（行号；右栏满高时结果区编辑器 `max-height: 100%` 内滚动）；**格式化 / 压缩 / 复制 / 下载**为结果标题旁图标按钮（`title` 悬停说明）；摘要文案作结果副标题（`buildMergeSummaryText`）；不写 localStorage。

单测：`src/utils/exportConfig.spec.ts`；`src/core/format.test.ts`；`src/composables/mergeAnnotations.test.ts`。

## 工作台布局

- 未开始 Diff：单列，隐藏右栏与分隔条。
- 宽屏（≥1100px）且已开始 Diff：可拖拽分栏（`useWorkspaceSplit`，键 `lcd-workspace-main-pct`）；右栏 sticky 且 `100svh` 满高（统计/来源固定，结果区吃剩余高度）；左栏输入 → 差异，右栏选边统计 → 合并来源 → 结果；**页面自然滚动**，差异卡片高度 `auto`；差异叶头 sticky；结果卡片内编辑器填满剩余高度。
- 窄屏：整页自然纵向滚动（主区 → 统计+结果）；无分栏拖拽；右栏仍仅在 Diff 开始后出现。
- 已移除侧栏导航跳转；输入与差异在左栏纵向常驻；开始 Diff 后默认收起输入以免挤占差异区。
- Diff 树：容器 / 差异叶 / 相同节点均可展开折叠，并提供全部展开 / 全部折叠；叶默认展开，复杂值展开后挂载对比查看器。

单测：`src/composables/useWorkspaceSplit.test.ts`。

## 规格与计划

- 规格：[M4](../specs/2026-08-15-m4-ui-json-input.md)、[M5](../specs/2026-08-15-m5-ui-diff-tree.md)、[M6](../specs/2026-08-15-m6-ui-merge-export.md)、[Diff/Result JSON 展示（含选边/高亮增量）](../specs/2026-08-17-diff-result-json-viewer.md)
- 计划（已归档）：[M4](../plans/archive/2026-08-15-m4-ui-json-input.md)、[M5](../plans/archive/2026-08-15-m5-ui-diff-tree.md)、[M6](../plans/archive/2026-08-15-m6-ui-merge-export.md)、[Diff/Result JSON](../plans/archive/2026-08-17-diff-result-json-viewer.md)、[选边 radio / 合并来源高亮](../plans/archive/2026-08-17-side-radio-result-annotate.md)

## V0.1 UI

V0.1 UI 主路径已完成（输入 → Diff 选边 → 合并预览 / 复制下载）；JSON 展示、选边与结果高亮见上表与 [2026-08-17 规格](../specs/2026-08-17-diff-result-json-viewer.md)。
