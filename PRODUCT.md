# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vue 3 + TypeScript + Vite + Pinia + Vue Router + UnoCSS + VueUse + Vitest + CodeMirror 6（`@codemirror/merge`）；包管理器 pnpm

## Users

低代码 / 配置工程师与测试同学：需要对照 **参考配置** 与 **目标配置** 两份文本，按差异块把左侧写入右侧，再复制或导出右栏。场景多为上线前对齐、生产紧急改动回灌测试配置。

## Product Purpose

纯前端的 **可编辑双栏文本合并工作台**：导入两侧 JSON 文本 → 满高 MergeView 对照与编辑 → 中间 `→` 将参考块写入目标配置 → 复制或导出右栏（默认 `config.json`）。成功标准是主路径可走通、用户 JSON 默认不出域。

## Positioning

面向低代码配置 JSON 的**文本差异合并**（CodeMirror 差异块），不是结构按叶选边组装，也不是连库发布工具。V0.1 的「每叶 TEST | PROD」已退出主路径。

## Operating Context

单页工作台：页眉（品牌、隐私提示、差异导航、复制/导出、ThemeToggle）→ 满高双栏 Merge（栏头含文件名与导入）。打开即对照，**无**「开始 Diff」门禁。左右始终并排；窄屏宿主可横滑，**禁止**把 Merge 改成上下堆叠。无侧栏导航跳转。离线可用；刷新不恢复会话内容。文档真相源在 `.docs/`；Core 在 `src/core/`，禁止依赖 Vue。

## Capabilities and Constraints

- 已具备：Merge 两枚胶囊栏头导入/粘贴全文/清空（对齐左右编辑器），整栏拖入文件（合法 object/array 根则格式化一次）、分栏居中空态（选择文件 / 粘贴全文 / 双侧皆空时可填入示例对）与整栏落区、可编辑 MergeView（左参考配置、右目标配置）、按行差异块、页眉单行（品牌、差异徽章 `差异 n / m` 或 `无差异`、新增/删除/修改 chips 只读、上一个/下一个 仍遍历全部文本块、「仅显示差异」开关折叠编辑器未改行、本地处理/主题/查找/复制/导出）、中间 `→` 按类型着色且当前块可辨、差异目录树已删除、`.two-way-merge-body` 为编辑器画框与缩略轨并排、缩略轨与编辑器画框同高、左右 `scrollDOM.scrollLeft` 同步、折叠未改行默认关（`MergeView.reconfigure` + `collapseUnchanged`，不写 localStorage；`heightChanged` 时重测色带）、缩略滑块与编辑器原生滚动条同一套行程（快拖/折叠后补测再同步）、栏头外查找条、块级 `→`（采纳参考）、上一个/下一个（从视口锚点步进，绕回）、复制/导出/压缩导出右栏（非法 JSON 提示后仍导出）、亮/暗主题切换
- Core 仍含 `parseConfig` / `formatConfig` / `compressConfig`、`diffConfig`、`mergeConfig`；**现行 UI 不调用** `diffConfig` / `mergeConfig`（仅导入校验/格式化与引擎单测仍用 Core）
- 约束：无后端、无云端保存、无 Git/发布；文本 diff，不忽略键序/空白；本包无体积上限
- （推断）首要语言为简体中文 UI；未单独确认无障碍标准

## Brand Commitments

- 产品名：Diff 合并工具（应用 store 标题 / 页签）
- **绑定视觉约束（用户确认）：** 冷灰画布 + 青绿强调的 AI 原生工具感；拒绝默认紫渐变 / Vite 模板紫 accent；Operate 优先扫读与语义色，不做营销仪表盘堆砌

## Evidence on Hand

- 现行规格与计划：`.docs/specs/2026-08-18-*`、`.docs/specs/2026-08-19-*`、`.docs/specs/2026-08-20-*`、`.docs/specs/2026-08-21-workbench-scan-empty-collapse.md`、`.docs/specs/2026-08-25-large-file-diff-p0.md`、`.docs/plans/archive/2026-08-18-*`、`.docs/plans/archive/2026-08-20-*`、`.docs/plans/archive/2026-08-21-workbench-scan-empty-collapse.md`、`.docs/plans/archive/2026-08-25-large-file-diff-p0.md`
- 历史：`.docs/specs/2026-08-15-v0.1-config-diff-merge.md`（主路径已被取代，正文保留）与 `.docs/plans/archive/`
- 实现：`src/views/HomeView.vue`、`TwoWayMergeEditor` / `mergeWorkspace`、`src/core/*`（备用引擎）
- 不得虚构客户评价、基准数据或部署案例

## Product Principles

1. 左栏为参考配置、右栏为目标配置；复制/导出只认右栏。
2. Diff Engine（Core）与 UI 解耦；文本合并正确性优先于结构猜测。
3. 用户配置默认只在客户端处理。
4. 歧义时保持简单并回写规格。
5. 界面服务任务完成（Operate），品牌落在精确细节而非装饰。
