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
- 页眉：全宽扁平 chrome（非面板）；内容：`ui-page-body` 限宽工作区 + raised 面板，层级分开
- 单测：`src/composables/useThemeToggle.test.ts`（存储键与揭示半径）

## 当前状态（V0.1 UI 已完成：M4 / M5 / M6）

| 文件                                 | 职责                                                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/`                        | 设计系统：`tokens` / `theme-transition` / `base` / `primitives` / `layout` / `semantic`；功能扩展见 `features/`                     |
| `src/composables/useThemeToggle.ts`  | `useDark` + View Transitions 圆形揭示；存储键 `lcd-color-scheme`                                                                    |
| `src/components/ThemeToggle.vue`     | 页眉亮/暗切换按钮（太阳/月亮）                                                                                                      |
| `src/components/JsonEditor.vue`      | 单栏 CodeMirror 6（`basicSetup` + JSON + CSS 变量主题，随 `html.dark` 同步）                                                        |
| `src/components/JsonInputArea.vue`   | TEST/PROD 双栏、导入/格式化/清空、Valid 态、「开始 Diff」门禁；`emit('start-diff', { test, prod })`                                 |
| `src/composables/useJsonDocument.ts` | 纯校验/格式化：`evaluateJsonDocument` / `formatJsonDocument`（复用 M1 `parseConfig` / `formatConfig`）                              |
| `src/composables/diffTreeModel.ts`   | 纯函数：`buildDiffTree` 组树；`withSide` / `withAllSides` / `withDefaultSides` / `withDescendantSides`；`sideStateForPrefix` 混合态 |
| `src/stores/diffSession.ts`          | Pinia：`startSession` → `diffConfig`；持有 test/prod、可改 `leaves`、`showUnchanged`；批量选边 API 供 DiffTree / MergePreview 读取  |
| `src/components/DiffTree.vue`        | Diff 树 UI：仅差异默认、显示无差异开关、叶选边、父级批量、全部 TEST/PROD/恢复默认；语义色徽章                                       |
| `src/utils/exportConfig.ts`          | 纯工具：`summarizeMergeSides` / `buildMergeSummaryText` / `copyText` / `downloadJsonFile`（下载固定 `config.json`）                 |
| `src/components/MergePreview.vue`    | 读 session：`mergeConfig` + `formatConfig` 实时预览；摘要；复制 / 下载；无 session 时占位                                           |
| `src/views/HomeView.vue`             | 三区面板：输入 → 差异 → 结果；页眉主题切换；`start-diff` → `diffSession.startSession`                                               |

### 输入区（M4）

校验状态：`empty` | `valid` | `invalid`；顶层须为 object 或 array。两侧均 `valid` 才可点「开始 Diff」。用户 JSON 不上传、不持久化。

界面文案、错误提示与代码注释使用**简体中文**（见 `AGENTS.md`「中文注释与文案」）；不要用英文提示用户。

单测：`src/composables/useJsonDocument.test.ts`（不对 CM6 做脆弱 DOM 单测）。

### Diff 树（M5）

- 默认只渲染差异叶及其祖先容器；「显示无差异」开启后相同节点为 `equal`（只读、无选边），不进入 merge 叶子列表。
- 默认 side：`modified` / `added` → `test`；`removed` → `prod`（引擎产出；恢复默认按 type 重算）。
- `diffSession.leaves` 交给 `mergeConfig`（由 MergePreview 调用）。

单测：`src/composables/diffTreeModel.test.ts`。

### 合并预览与导出（M6）

- 选边变化时 `MergePreview` 用 `mergeConfig(test, prod, leaves)` 即时更新；预览为 `formatConfig` 文本（`<pre>`）。
- 摘要文案由 `buildMergeSummaryText`；复制 / 下载内容为纯 JSON，无 metadata；不写 localStorage。

单测：`src/utils/exportConfig.spec.ts`（摘要纯函数；不对 clipboard/DOM 做脆弱单测）。

## 规格与计划

- 规格：[M4](../specs/2026-08-15-m4-ui-json-input.md)、[M5](../specs/2026-08-15-m5-ui-diff-tree.md)、[M6](../specs/2026-08-15-m6-ui-merge-export.md)
- 计划（已归档）：[M4](../plans/archive/2026-08-15-m4-ui-json-input.md)、[M5](../plans/archive/2026-08-15-m5-ui-diff-tree.md)、[M6](../plans/archive/2026-08-15-m6-ui-merge-export.md)

## V0.1 UI

V0.1 UI 主路径已完成（输入 → Diff 选边 → 合并预览 / 复制下载）。
