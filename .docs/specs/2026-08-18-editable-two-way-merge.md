# 可编辑双栏文本合并工作台 总览

**日期：** 2026-08-18  
**状态：** 已完成  
**关联计划：** [总计划索引](../plans/2026-08-18-editable-two-way-merge.md)  
**切片：** [M1 会话与纯逻辑](./2026-08-18-m1-merge-workspace.md) → [M2 Merge 宿主](./2026-08-18-m2-two-way-editor.md) → [M3 导入条与换壳](./2026-08-18-m3-home-import.md) → [M4 删除旧 UI 与文档](./2026-08-18-m4-remove-legacy-ui.md)  
**不改动：** `src/core/diff.ts` / `merge.ts` 保留但退出主路径；不删引擎单测

---

## 一句话口径

> 左栏 TEST 为参考、右栏为结果；双侧可编辑；按文本差异块把左侧拷到右侧；复制/下载只认右栏。结构按叶选边退出主路径。

各切片不得改写此口径。细节 delta 只写在对应切片规格里。

---

## 数据流

```text
导入/粘贴 TEST ──► leftDoc
导入/粘贴 PROD ──► rightDoc  ──► 复制 / 下载
         │              │
         └── MergeView（revertControls a-to-b →）──┘
```

---

## 锁定决策（全切片共用）

| 项          | 锁定                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 编辑器      | CodeMirror 6 **MergeView**；不启用 `collapseUnchanged`                                                                                                            |
| 中间区      | `revertControls: 'a-to-b'` + 自定义 `→`；不自绘第三列；不可拖宽                                                                                                   |
| 滚动        | 外层统一同步；**无**关闭开关；无页眉「采纳当前块」                                                                                                                |
| 窄屏        | **仍左右并排**，宿主 `overflow-x: auto`；**禁止**把 `.cm-mergeViewEditors` 改成 `column`（revert 按钮按行对齐，纵向堆叠会对错行）                                 |
| 仅导入 TEST | 右栏保持**空**。左满右空时差异通常是**整份一块**；第一次 `→` 等于把左侧全文写入结果（预期，不是 bug）                                                             |
| 导入格式化  | 该侧合法 JSON 则 `formatConfig` **一次**                                                                                                                          |
| 粘贴        | 栏头「粘贴为该侧全文」图标 = **整侧替换**（走 `importSide`，合法则格式化）；编辑器 Ctrl+V = 光标处插入、**不**格式化                                              |
| 导出非法    | 状态条/Toast 提示后**仍导出原文**；空右栏允许空下载                                                                                                               |
| 重导        | 直接覆盖该侧；无未保存确认；本包**不做**脏标记                                                                                                                    |
| 侧标签      | 「参考」/「结果」写在 Merge 栏头（含文件名与导入图标）；右侧展示名是「结果」而非「PROD」                                                                          |
| 主题        | 保留 `ThemeToggle`                                                                                                                                                |
| 采纳单位    | **CM 差异块**（不是 JSON path）。按行对照后，一行属性改动通常是一块；对象/数组错位仍可以是很大一块。允许 `highlightChanges`；不自研 accept 引擎；不做「拷当前行」 |
| 键序/空白   | 文本 diff，**不**忽略键序或空白。V0.1 `deepEqual` 视为相同的「仅键序不同」在此会显示为差异（已接受）                                                              |
| 整文件 diff | `diffConfig.override` 为按行 `diffByLine`；行种类过多时退回 `{ scanLimit: 10000, timeout: 1000 }`。**禁止**沿用叶级 `800/250`                                     |
| 大文件      | 本包无体积上限、不做虚拟列表；过大可能卡顿，不单开切片                                                                                                            |
| 块导航      | 上一条/下一条按 `mergeView.chunks`；以当前滚动/光标之后（前）一块为准；到头**绕回**                                                                               |
| 不做        | `←`、Unified、双模式、拷当前行、忽略空白、脏确认、Monaco、后端                                                                                                    |

### 编辑器 ↔ store 同步（M2 必须遵守）

现有 `JsonMergeViewer`「doc 一变就 destroy 重建」**不得**用于可写整页。

1. **键入 / `→` / 编辑器 Undo：** 只允许 `editor → store`（`docChanged` 且字符串确有变化才 `setLeftDoc` / `setRightDoc`）。**禁止**因这次 store 更新再 watch 去重建 MergeView。
2. **导入 / 清空：** 只对**被改的那一侧** `dispatch` 替换文档；**禁止**为换一侧而 `destroy` 整个 MergeView（另一侧 Undo 必须保留）。
3. 比较用文档字符串是否相等，不用对象引用。
4. 可写扩展必须含 `@codemirror/commands` 的 `history()`、`historyKeymap` 与 `defaultKeymap`。**`defaultKeymap` 不含 Undo**；没有 `historyKeymap` 则 Ctrl+Z 不存在。

### M2 与主路径

M2 **不修改** `HomeView`、不新增长期路由。组件先落地，手工点选验收并入 **M3 换壳**。禁止「临时挂到 Home 角落」后忘记拆掉。

---

## 切片与依赖

```text
总览
  └─ M1 会话 + 导入/导出纯逻辑 ──┬─ M2 可编辑 Merge 宿主 ──┐
                                 └─ M3 导入条 + Home 换壳 ─┴─ M4 删旧 UI + 文档
```

| 切片 | 规格                                                       | 计划                                               | 交付                                                   | 状态   |
| ---- | ---------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ | ------ |
| M1   | [m1-merge-workspace](./2026-08-18-m1-merge-workspace.md)   | [plan](../plans/2026-08-18-m1-merge-workspace.md)  | store + `prepareImportText` + `describeRightDocExport` | 已完成 |
| M2   | [m2-two-way-editor](./2026-08-18-m2-two-way-editor.md)     | [plan](../plans/2026-08-18-m2-two-way-editor.md)   | `TwoWayMergeEditor`                                    | 已完成 |
| M3   | [m3-home-import](./2026-08-18-m3-home-import.md)           | [plan](../plans/2026-08-18-m3-home-import.md)      | `ImportBar` + 重写 `HomeView`                          | 已完成 |
| M4   | [m4-remove-legacy-ui](./2026-08-18-m4-remove-legacy-ui.md) | [plan](../plans/2026-08-18-m4-remove-legacy-ui.md) | 删选边 UI、瘦身 export、sync 文档                      | 已完成 |

顺序：M1 → M2 与 M3 均依赖 M1；**M3 依赖 M2**（换壳时挂上编辑器）；M4 必须在 M3 换壳之后。

---

## 相对 V0.1

V0.1 总览仍保留为历史；文首已注明主路径已被本总览取代。

---

## 非目标（整包）

双模式、改 Core 算法、自研文本 merge 引擎、云端保存。
