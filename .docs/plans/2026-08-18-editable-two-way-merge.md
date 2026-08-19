# 可编辑双栏文本合并工作台 总计划（索引）

> **不要按本文一次性实施。** 按 M1 → M2 → M3 → M4 分别打开对应计划执行。  
> 给 Agent：每切片用 [子代理驱动开发](../workflows/subagent-driven-development.md) 或 [执行计划](../workflows/executing-plans.md)。未经用户明确要求不要 `git commit`。

**日期：** 2026-08-18 **状态：** 已完成（待归档）  
**关联设计：** [总览](../specs/2026-08-18-editable-two-way-merge.md)

**目标：** 主路径改为双栏可编辑 MergeView + 块级 `→` + 导出右栏。  
**顺序：** M1 纯逻辑 → M2 编辑器组件 → M3 换壳 → M4 删旧代码与文档。

---

## 切片索引

| 顺序 | 计划                                                       | 规格                                               | 交付                    | 状态                 |
| ---- | ---------------------------------------------------------- | -------------------------------------------------- | ----------------------- | -------------------- |
| 1    | [m1-merge-workspace](./2026-08-18-m1-merge-workspace.md)   | [spec](../specs/2026-08-18-m1-merge-workspace.md)  | store + 导入/导出纯函数 | 已完成（待确认归档） |
| 2    | [m2-two-way-editor](./2026-08-18-m2-two-way-editor.md)     | [spec](../specs/2026-08-18-m2-two-way-editor.md)   | `TwoWayMergeEditor`     | 已完成（待确认归档） |
| 3    | [m3-home-import](./2026-08-18-m3-home-import.md)           | [spec](../specs/2026-08-18-m3-home-import.md)      | ImportBar + HomeView    | 已完成（待确认归档） |
| 4    | [m4-remove-legacy-ui](./2026-08-18-m4-remove-legacy-ui.md) | [spec](../specs/2026-08-18-m4-remove-legacy-ui.md) | 删死 UI + sync          | 已完成（待确认归档） |

M2 与 M3 都依赖 M1；M3 必须在 M2 之后；M4 必须在 M3 之后。

共用约束以 [总览](../specs/2026-08-18-editable-two-way-merge.md) 为准（含：store 同步协议、`history()`、整文件 `diffConfig`、窄屏仍并排）。切片计划写执行步骤，不得与总览唱反调。

---

## 手工总验收（M3 后可测，M4 后最终）

1. 打开即双栏空编辑器 + 导入条 + 主题切换
2. 只导入 TEST → 左有、右空；`→` 可将左侧全文写入结果
3. 导入结果侧后 `→` 按块写入右侧；打字与 Ctrl+Z 可用；再导左侧不丢右侧 Undo
4. 上一条/下一条跳转差异块（绕回）
5. 非法 JSON 仍可复制/下载（中文提示）
6. 窄屏仍左右并排，可横滑；箭头对齐
7. 「粘贴为该侧全文」整侧替换；刷新不恢复内容

---

## 执行交接

M1–M4 已完成，计划均在 `plans/`，**等用户确认后再归档**（不要自行移入 `archive/`）。
