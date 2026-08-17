# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vue 3 + TypeScript + Vite + Pinia + Vue Router + UnoCSS + VueUse + Vitest（仓库既有；包管理器 pnpm）

## Users

低代码 / 配置工程师与测试同学：需要对照 **TEST** 与 **PROD** 两份配置 JSON，决定每一处差异采用哪一侧，再导出合并结果。场景多为上线前对齐、生产紧急改动回灌测试配置。

## Product Purpose

纯前端的 **配置差异合并工具**：导入 TEST / PROD JSON → 计算叶子差异 → 逐叶选择 TEST | PROD → 实时合并预览 → 复制或下载 `config.json`。成功标准是主路径可走通、Core Diff/Merge 单测可证、用户 JSON 默认不出域。

## Positioning

不是通用文本 Diff，也不是连库发布工具；专门面向低代码配置 JSON，用「每叶选边组装」而非「是否应用补丁 / 单一 PROD 基线」。

## Operating Context

单页工作台：未开始 Diff 时单列（仅输入/差异空态）；开始后宽屏双列（可拖拽调占比并本地持久化；右栏 sticky 满视口高）。左栏输入 → Diff 树；右栏选边统计 → 合并来源 → Result。无侧栏导航跳转。离线可用；刷新不恢复敏感内容。文档真相源在 `.docs/`；Core 在 `src/core/`，禁止依赖 Vue。

## Capabilities and Constraints

- 已具备：parse / `formatConfig` / `compressConfig`、`diffConfig`、`mergeConfig`、双栏拖拽/点选 JSON 导入、Diff 树（默认仅差异、radio 选边、展开对比 + Merge/两列空态）、合并来源列表（右栏统计下方，点击定位结果高亮）、Merge 预览（格式化侧别高亮、压缩切换、复制/下载）
- 约束：无后端、无云端保存、无 Git/发布；数组 V0.1 整段比较；merge 只吃差异叶子
- 术语：`added`（仅 TEST 有）、`removed`（仅 PROD 有）、`modified`、`side: 'test' | 'prod'`
- （推断）首要语言为简体中文 UI；未单独确认无障碍标准

## Brand Commitments

- 产品名：配置差异合并工具（应用 store 标题 / 页签）
- **绑定视觉约束（用户确认）：** 冷灰画布 + 青绿强调的 AI 原生工具感；拒绝默认紫渐变 / Vite 模板紫 accent；Operate 优先扫读与语义色，不做营销仪表盘堆砌

## Evidence on Hand

- 规格与归档计划：`.docs/specs/`、`.docs/plans/archive/`（M1–M6；2026-08-17 Diff/Result JSON 与选边/高亮增量）
- 实现：`src/core/*`、`src/components/*`、`src/views/HomeView.vue`
- 不得虚构客户评价、基准数据或部署案例

## Product Principles

1. 默认以 TEST 推进；仅 PROD 独有 key 默认保留 PROD。
2. Diff Engine 与 UI 解耦；正确性优先。
3. 用户配置默认只在客户端处理。
4. 歧义时保持简单并回写规格。
5. 界面服务任务完成（Operate），品牌落在精确细节而非装饰。
