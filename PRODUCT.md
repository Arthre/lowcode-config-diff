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

- 已具备：Merge 栏头导入/粘贴全文/清空，整栏拖入文件（合法 object/array 根则格式化一次）、分栏轻量空态与整栏落区、可编辑 MergeView（左参考配置、右目标配置）、按行差异块、冲突点缩略轨（双侧都空时隐藏）、栏头外查找条、块级 `→`（采纳参考）、上一个差异/下一个差异（从视口锚点步进，无差异 / 当前 / 总数，绕回）、复制/导出/压缩导出右栏（非法 JSON 提示后仍导出）、亮/暗主题切换
- Core 仍含 `parseConfig` / `formatConfig` / `compressConfig`、`diffConfig`、`mergeConfig`；**现行 UI 不调用** `diffConfig` / `mergeConfig`（仅导入校验/格式化与引擎单测仍用 Core）
- 约束：无后端、无云端保存、无 Git/发布；文本 diff，不忽略键序/空白；本包无体积上限
- （推断）首要语言为简体中文 UI；未单独确认无障碍标准

## Brand Commitments

- 产品名：配置差异合并工具（应用 store 标题 / 页签）
- **绑定视觉约束（用户确认）：** 冷灰画布 + 青绿强调的 AI 原生工具感；拒绝默认紫渐变 / Vite 模板紫 accent；Operate 优先扫读与语义色，不做营销仪表盘堆砌

## Evidence on Hand

- 现行规格与计划：`.docs/specs/2026-08-18-*`、`.docs/specs/2026-08-19-*`、`.docs/specs/2026-08-20-ui-operate-pass.md`、`.docs/plans/archive/2026-08-18-*`、`.docs/plans/2026-08-19-*`
- 历史：`.docs/specs/2026-08-15-v0.1-config-diff-merge.md`（主路径已被取代，正文保留）与 `.docs/plans/archive/`
- 实现：`src/views/HomeView.vue`、`TwoWayMergeEditor` / `mergeWorkspace`、`src/core/*`（备用引擎）
- 不得虚构客户评价、基准数据或部署案例

## Product Principles

1. 左栏为参考配置、右栏为目标配置；复制/导出只认右栏。
2. Diff Engine（Core）与 UI 解耦；文本合并正确性优先于结构猜测。
3. 用户配置默认只在客户端处理。
4. 歧义时保持简单并回写规格。
5. 界面服务任务完成（Operate），品牌落在精确细节而非装饰。
