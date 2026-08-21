# 设计文档（Specs）

存放每次有意义变更的**设计文档**，记录背景、方案、架构决策与**需求 delta**。

## 命名

```
YYYY-MM-DD-<主题>.md
```

与 `.docs/plans/` 使用相同日期前缀和主题 slug，便于一一对应。

## 何时创建

- 新功能、新组件、行为修改等多步骤变更
- 需要用户确认方案后再动手的改动

简单单点修复可跳过，直接在聊天中确认后执行。

## 文档结构

见 [变更生命周期](../workflows/change-lifecycle.md) 中的 Specs 文档结构与需求 Delta 章节。

## 状态流转

`草案` → `已确认`（用户同意方案）→ `实施中` → `已完成`（sync + archive 后）

## 实施中

[工作台胶囊栏头与分层目录](./2026-08-20-workbench-capsules-directory.md)（含页眉精简 / 目录抽屉 / 行号 / 缩略轨跳转迭代）。

## 最近完成

[导入后目录定位性能](./2026-08-20-diff-import-layout-perf.md)；[Operate 扫读优化](./2026-08-20-ui-operate-pass.md)；[差异块工作台后续](./2026-08-20-chunk-workbench-followup.md)。已完成：[块导航与缩略轨滚动性能](./2026-08-19-chunk-nav-scroll-perf.md)；可编辑双栏合并（2026-08-18）：[总览](./2026-08-18-editable-two-way-merge.md) 与 M1–M4。对应计划见 [`.docs/plans/`](../plans/README.md) 与 [archive](../plans/archive/)。
