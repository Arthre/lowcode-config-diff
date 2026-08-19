# M1：文档会话与导入/导出纯逻辑

**日期：** 2026-08-18  
**状态：** 已完成  
**依赖：** [总览](./2026-08-18-editable-two-way-merge.md)  
**关联计划：** [`.docs/plans/2026-08-18-m1-merge-workspace.md`](../plans/2026-08-18-m1-merge-workspace.md)  
**影响模块：** `src/composables/prepareImportText.ts`、`src/composables/describeRightDocExport.ts`、`src/stores/mergeWorkspace.ts`  
**不改动：** `HomeView`、选边 UI、`exportConfig` 选边摘要（仍给旧壳用）、`src/core/diff.ts` / `merge.ts`

---

## 背景与目标

后续 UI 需要「两侧字符串文档」为真相，而不是 `leaves[].side`。本切片只交付可单测的纯逻辑与 Pinia store，**不换主界面**。

**成功标准：** store 可导入左/右、仅左导入时右栏仍空、重导覆盖；导入合法则格式化一次；导出校验只描述状态、不阻断。

---

## 需求变更

### + 新增

- [`prepareImportText`]：合法 JSON（object/array 根）→ `formatConfig` 一次；非法/空/顶层 primitive → 原文，`didFormat: false`。
- [`describeRightDocExport`]：空白 → `empty`；合法 → `valid`；非法 → `invalid` + 简体中文 `message`（有行列时拼「（行 x，列 y）」）。不抛错、不阻止导出。
- [`useMergeWorkspace`]：`leftDoc` / `rightDoc` / `leftFileName` / `rightFileName`；`importSide` 走 `prepareImportText`；`setLeftDoc` / `setRightDoc` 供编辑器回写；`clearSide`。

### ~ 修改

- 无主路径行为变化（旧 `diffSession` 仍驱动当前 UI）。

### 非目标（本切片）

- 不挂载新编辑器、不改 `HomeView`
- 不删除 `diffSession` / Diff 树
- 不瘦身 `exportConfig`（旧壳仍引用摘要函数）
- **不做** persist / 脏标记；刷新即丢（M3 验收「刷新不恢复」依赖此点）
- `didFormat` 不进 store

---

## 接口

```ts
export type PreparedImport = { text: string; didFormat: boolean }
export function prepareImportText(raw: string): PreparedImport

export type RightDocExportHint =
  { kind: 'empty' } | { kind: 'valid' } | { kind: 'invalid'; message: string }
export function describeRightDocExport(rightDoc: string): RightDocExportHint

export type MergeSide = 'left' | 'right'
// useMergeWorkspace：
//   leftDoc / rightDoc / leftFileName / rightFileName（初始皆 ''）
//   importSide(side, raw, fileName?: string)
//   setLeftDoc(text) / setRightDoc(text)
//   clearSide(side)
```

### store 行为锁定

| 动作                               | 该侧文档                      | 该侧文件名                         | 另一侧   |
| ---------------------------------- | ----------------------------- | ---------------------------------- | -------- |
| `importSide(side, raw, fileName?)` | `prepareImportText(raw).text` | `fileName ?? ''`（省略则清空旧名） | **不改** |
| `setLeftDoc` / `setRightDoc`       | 覆盖该侧字符串                | **不改**                           | **不改** |
| `clearSide(side)`                  | `''`                          | `''`                               | **不改** |

粘贴为该侧全文（M3）走 `importSide` 且常无文件名，因此省略 `fileName` 必须写成 `''`，不能保留旧名。

### `describeRightDocExport` 文案

复用 `evaluateJsonDocument`：

- `status === 'empty'` → `{ kind: 'empty' }`
- `status === 'valid'` → `{ kind: 'valid' }`
- `status === 'invalid'` → `{ kind: 'invalid', message }`  
  `message` 为中文。有 `errorLine` 与 `errorColumn` 时格式为：`${errorMessage} （行 ${line}，列 ${column}）`（中间一个空格，与现有输入区 `statusDetail` 一致）。

---

## 验收清单

1. `prepareImportText('{"a":1}')` 得到缩进 2 的格式化文本且 `didFormat === true`
2. 非法、空串、顶层 `null` / primitive 不格式化，保留原文
3. 只 `importSide('left', …)` 时 **已有的** `rightDoc` 不变（不是「从空 store 导入后右侧仍空」）
4. `importSide('right', …)` 覆盖已有右栏；省略 `fileName` 时该侧文件名为 `''`
5. `setLeftDoc` / `setRightDoc` 不改文件名；`clearSide` 清空该侧文档与文件名
6. `describeRightDocExport` 三类状态；非法 message 为中文，有行列则含「行 / 列」
7. `pnpm test:run` 覆盖本切片测试文件
