# M3：导入条与工作台换壳

**日期：** 2026-08-18  
**状态：** 已完成  
**依赖：** [总览](./2026-08-18-editable-two-way-merge.md)、[M1](./2026-08-18-m1-merge-workspace.md)、[M2](./2026-08-18-m2-two-way-editor.md)  
**关联计划：** [`.docs/plans/2026-08-18-m3-home-import.md`](../plans/2026-08-18-m3-home-import.md)  
**影响模块：** `src/components/ImportBar.vue`、`src/views/HomeView.vue`、`src/styles/layout.scss`  
**不改动：** 暂不删除旧组件文件（M4 删）；保留 `ThemeToggle`

---

## 背景与目标

把主路径换成「导入条 + 满高 Merge + 页眉导出」。旧 Diff 树与侧栏结果**不再挂载**，文件留到 M4 再删。

---

## 需求变更

### + 新增

- [`ImportBar`]：左/右拖拽、点选文件、**「粘贴为该侧全文」**（`clipboard.readText()` 后 `importSide`；失败中文「无法读取剪贴板，请检查浏览器权限」）。与编辑器内 Ctrl+V（插入、不格式化）区分。显示文件名；无「开始 Diff」。右侧展示名「结果」。每侧可清空（`clearSide`）。读文件失败「读取文件失败，请重试」，不因此覆盖已有文档。
- 页眉工具：差异块计数、上一条/下一条（绕回）、复制右栏、下载右栏；导出前 `describeRightDocExport`，`empty` →「结果为空，仍已导出」，`invalid` → `message`，约 2s；**仍** `copyText` / `downloadJsonFile(rightDoc)`（空串允许）。复制成功且合法时「已复制」；下载成功且合法时「已下载」；复制抛错「复制失败」。

### ~ 修改

- [`HomeView`]：从「输入 + Diff 树 | 统计 + merge 预览」改为「导入条 + 满高 `TwoWayMergeEditor`」；去掉分栏拖拽。
- [开始 Diff]：取消门禁；打开即对照。

### - 移除（挂载层）

- 主路径不再渲染 DiffTree / 选边统计 / 合并来源 / MergePreview。

### 非目标（本切片）

- 不 `git rm` 旧文件（M4）
- 不瘦身 `exportConfig`（M4，以免本切片中途破坏未拆完的引用——换壳后 Home 不再引用摘要，M4 再删函数）
- 无滚动同步开关、无「采纳当前块」、无脏标记/重导确认

---

## 页眉锁定

产品名、`ThemeToggle`、块计数、上一条/下一条、复制、下载。侧标签「TEST（参考）」/「结果」。

---

## 验收清单

1. 打开即双栏空编辑器 + 导入条 + 主题切换
2. 只导入 TEST → 左有文、右空；此时 `→` 可将左侧全文写入结果（整块）
3. 再导入结果侧 → 右有文；打字、`→`、Ctrl+Z 可用；导入左侧不丢右侧 Undo
4. 复制/下载只出右栏；非法 JSON 有中文提示仍成功
5. 窄屏仍左右并排，可横向滚动；箭头与行对齐
6. 上一条/下一条绕回；刷新不恢复内容
7. 「粘贴为该侧全文」整侧替换；编辑器内粘贴不走导入格式化
