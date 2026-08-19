# M2：可编辑双栏 Merge 宿主 实施计划

> **给 Agent 执行者：** 使用 [子代理驱动开发](../../workflows/subagent-driven-development.md) 或 [执行计划](../../workflows/executing-plans.md)。未经用户明确要求不要 `git commit`。

**日期：** 2026-08-18 **状态：** 已完成 **关联设计：** `.docs/specs/2026-08-18-m2-two-way-editor.md`  
**目标：** 新建读 store 的可编辑 MergeView，含块级 `→` 与 chunk 导航  
**依赖：** M1 `useMergeWorkspace` 已存在  
**技术栈：** Vue 3、`@codemirror/merge` MergeView

## Global Constraints

- 见 [总览](../../specs/2026-08-18-editable-two-way-merge.md)「锁定决策」与「编辑器 ↔ store 同步」以及 [M2 规格](../../specs/2026-08-18-m2-two-way-editor.md)
- `revertControls: 'a-to-b'`；不传 `collapseUnchanged`；不自绘第三列
- `diffConfig: { scanLimit: 10000, timeout: 1000 }`；禁止抄叶级 `800/250`
- 可写扩展必须含 `history()` + `historyKeymap` + `defaultKeymap`；禁止 `readOnly`、禁止 focusScroll 门禁
- `defaultKeymap` **不含** Undo；漏掉 `historyKeymap` 则 Ctrl+Z 不存在（审查不得把 `historyKeymap` 判为多余）
- 键入只 editor→store；导入只 dispatch 变化侧；禁止 doc 变就 destroy 整份 MergeView
- 窄屏保持左右并排 + 横向滚动；禁止 `.cm-mergeViewEditors { flex-direction: column }`
- 禁止抄 `JsonMergeViewer` 的 `scrollArmed` / 「doc 变就 mountView」
- 组件内读 store；**不修改 `HomeView`**、不新增长期路由
- 不对 MergeView DOM 做脆弱单测；打字/`→`/Undo 手工验收在 M3
- 未经用户明确要求不要 `git commit`

---

## 文件结构

- 修改：`src/composables/codemirrorTheme.ts` — `createEditableJsonExtensions`
- 创建：`src/composables/createEditableJsonExtensions.test.ts`（轻量，不测 DOM MergeView）
- 创建：`src/components/TwoWayMergeEditor.vue`

---

### 任务 1：createEditableJsonExtensions

**接口：**

```ts
export function createEditableJsonExtensions(extra: Extension[] = []): Extension[]
```

对照 `createReadonlyJsonExtensions`：保留 `lineNumbers`、`highlightActiveLineGutter`、`foldGutter`、`drawSelection`、`json`、`syntaxHighlighting`、`bracketMatching`、`appEditorTheme`、`createSearchExtensions({ replaceable: true })`、`...extra`。

加上：

```ts
history(),
keymap.of(historyKeymap),
keymap.of(defaultKeymap),
```

来自 `@codemirror/commands`。

禁止：`EditorState.readOnly.of(true)`、`createFocusScrollExtension`。

- [x] **步骤 1：失败测试** `src/composables/createEditableJsonExtensions.test.ts`

```ts
import { undo } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { createEditableJsonExtensions } from './codemirrorTheme'

describe('createEditableJsonExtensions', () => {
  it('状态可写', () => {
    const state = EditorState.create({
      doc: '{"a":1}',
      extensions: createEditableJsonExtensions(),
    })
    expect(state.readOnly).toBe(false)
  })

  it('history 可撤销一次文档变更', () => {
    let state = EditorState.create({
      doc: 'hello',
      extensions: createEditableJsonExtensions(),
    })
    state = state.update({ changes: { from: 0, insert: 'X' } }).state
    expect(state.doc.toString()).toBe('Xhello')
    const ok = undo({
      state,
      dispatch: (tr) => {
        state = tr.state
      },
    })
    expect(ok).toBe(true)
    expect(state.doc.toString()).toBe('hello')
  })
})
```

- [x] **步骤 2：** `pnpm test:run src/composables/createEditableJsonExtensions.test.ts` FAIL（函数不存在）
- [x] **步骤 3：** 在 `codemirrorTheme.ts` 最小实现
- [x] **步骤 4：** 同上命令 PASS

---

### 任务 2：TwoWayMergeEditor.vue

**行为（写死）：**

- 读 `useMergeWorkspace()` 的 `leftDoc` / `rightDoc`
- 仅 `onMounted` 时 `new MergeView`；仅 `onBeforeUnmount` 时 `destroy`
- 配置：

```ts
new MergeView({
  parent: hostEl,
  a: {
    doc: workspace.leftDoc,
    extensions: [...createEditableJsonExtensions([mergeHighlightTheme]), leftListener],
  },
  b: {
    doc: workspace.rightDoc,
    extensions: [...createEditableJsonExtensions([mergeHighlightTheme]), rightListener],
  },
  revertControls: 'a-to-b',
  renderRevertControl,
  highlightChanges: true,
  gutter: true,
  diffConfig: { scanLimit: 10000, timeout: 1000 },
})
```

- `renderRevertControl`：`button type="button"`，文本 `→`，`title` 与 `aria-label`「将此差异写入右侧」；**不要**自己 `addEventListener('click')`
- `updateListener`：仅 `docChanged` 且该侧 `toString()` ≠ store 时 `setLeftDoc` / `setRightDoc`
- 两个 `watch`（或等价）：`leftDoc` / `rightDoc` 各自与对应 editor 文本比较，不等则只对该侧 `dispatch({ changes: { from: 0, to: length, insert: next } })`；**不要** `mergeView.destroy()` 后再 `new MergeView` 来响应导入
- `expose`：`goToPrevChunk` / `goToNextChunk` — 对 `mergeView.b` 调用 `@codemirror/merge` 的 `goToPreviousChunk` / `goToNextChunk`（已绕回）；无 view 或命令返回 false 则忽略
- `emit('chunks', number)`：跟踪上一次 length，仅变化时 emit；挂载后 emit 一次当前 length
- 侧标签：「TEST（参考）」用 `ui-label-test`；「结果」用现有结果侧样式（不要写「PROD」）；三列对齐中间 revert，禁止 `grid-cols-2` 当标签行
- 样式：根 `height: 100%; min-height: 0; overflow-x: auto`；`.cm-mergeView { height: 100%; overflow: auto }`；`.cm-mergeViewEditors { flex-direction: row }`；始终可滚，无 `scrollArmed`
- 主题跟 CSS 变量，不必因亮暗重建 MergeView

- [x] **步骤 1：** 实现挂载 / 同步协议 / expose / `onBeforeUnmount` destroy
- [x] **步骤 2：** 确认未改 `HomeView`；未改 `JsonMergeViewer.vue`；未把旧组件当实现
- [x] **步骤 3：** `pnpm lint`；`pnpm build` 类型通过（手工打字/`→`/Undo 留到 M3）

---

### 任务 3：本切片验证

- [x] `pnpm test:run src/composables/createEditableJsonExtensions.test.ts`
- [x] `pnpm lint` 无新增错误；`pnpm build` 类型通过
- [ ] 规格状态改为「已完成」；本计划移入 `plans/archive/`（**等用户确认后再归档**）

---
