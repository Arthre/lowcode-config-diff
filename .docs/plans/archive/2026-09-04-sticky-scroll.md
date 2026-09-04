# Sticky Scroll 实施计划

> **给 Agent 执行者：** 按 [TDD](../workflows/tdd.md) 逐步实施。步骤使用 checkbox（`- [ ]`）语法跟踪。

**日期：** 2026-09-04 **状态：** 已完成  
**关联设计：** [`.docs/specs/2026-09-04-sticky-scroll.md`](../../specs/2026-09-04-sticky-scroll.md)  
**目标：** Merge 双栏各自 Sticky 面包屑（`key › …`）；竖滚跟 `mergeView.dom` 视口顶；**lite 仍启用**（括号栈回退）；语言无关 fold 驱动。
**架构：** 纯函数 `stickyAncestorsOf` → `stickyScrollExtension` ViewPlugin → `createEditableJsonExtensions` 常驻 sticky / `createLiteVariableExtensions` 只管语言。
**技术栈：** Vue 3、CodeMirror 6 MergeView、`@codemirror/language` fold、Vitest、现有 composable

## Global Constraints

- 包管理器仅 pnpm；界面文案、注释、单测 `describe` / `it` 用简体中文
- 不改 Core；不引入新依赖；不提交除非用户要求
- 禁止无必要的 `any` 和非空断言 `!`
- sticky **不**依赖 `jsonPathOffset`；假 fold 区间证明语言无关
- 最多 5 层：`STICKY_SCROLL_MAX_LAYERS = 5`（超出保留最内层）
- Merge 竖滚根：`mergeView.dom`；`cm-scroller` 仅横滚
- lite 时仍挂 sticky（无语法树 → 括号栈）
- sticky 层 `top` 跟滚动根视口对齐
- 实现后做行为等价精简；同步 `.docs/ui/README.md`

---

## 任务

### Task 1: 纯函数 + 中文单测

**对应需求：** sticky 祖先行计算

**文件：**

- 创建：`src/composables/stickyScrollAncestors.ts`
- 创建：`src/composables/stickyScrollAncestors.test.ts`

**接口：**

```ts
export const STICKY_SCROLL_MAX_LAYERS = 5

export type FoldRange = { from: number; to: number }
export type StickyAncestor = { from: number; to: number; text: string }

export function stickyAncestorsOf(options: {
  doc: Text
  pos: number
  foldRanges: readonly FoldRange[]
  maxLayers?: number
}): StickyAncestor[]
```

行为：

- 取 `foldRanges` 中严格包含 `pos`、且开行已滚出（`lineAt(from).to < pos`）的区间
- 按 `from` 升序（外→内）；同开行去重
- 每项 `text` 为开行全文；截断到 `maxLayers`（默认 5）时保留**最内**若干层，输出仍外→内
- 无匹配或空 fold → `[]`

测试（中文 `it`）：

- `嵌套 object/array 时返回由外到内的祖先行`
- `视口在文档根附近时返回空列表`
- `超过最大层数时只保留最内层`
- `无折叠区间时返回空列表`
- `可用假 fold 区间证明不依赖 JSON 解析`

- [x] 先写失败测试再实现（TDD）。本任务不提交。

### Task 2: stickyScrollExtension

**对应需求：** UI 层、滚动根、横滚、点击、主题

**文件：**

- 创建：`src/composables/stickyScrollExtension.ts`
- 创建：`src/composables/stickyScrollExtension.test.ts`（`collectFoldRanges`）

**接口：**

```ts
export type StickyScrollOptions = {
  getScrollRoot: (view: EditorView) => HTMLElement | null
  maxLayers?: number
}

export function stickyScrollExtension(options: StickyScrollOptions): Extension
```

行为：

- `ViewPlugin`：层挂在该侧 `.cm-editor` 顶部（对齐 gutter + 内容）
- 从 `syntaxTree` + `foldNodeProp` 收集 fold（`collectFoldRanges`）
- 视口顶：`lineBlockAtHeight(scrollRoot.scrollTop).from`
- 监听 `scrollRoot` 的 `scroll`（passive）与 view 的 viewport/doc/geometry；`destroy` 卸监听
- sticky 内容区与 `scrollDOM.scrollLeft` 同步
- 点击行：`scrollRoot.scrollTop = min(lineBlockAt(from).top, maxTop)`
- 样式用 CSS 变量；`aria-label` 等中文（如「跳转到该行」）

- [x] 本任务不提交。

### Task 3: Merge 接线 + lite

**对应需求：** 双栏启用、lite 关闭

**文件：**

- 修改：`src/composables/codemirrorTheme.ts`（`createLiteVariableExtensions` 接受可选 sticky）
- 修改：`src/composables/createEditableJsonExtensions.test.ts`（lite 仍无 language；不强制测 DOM）
- 修改：`src/components/TwoWayMergeEditor.vue`（左右 `createLiteVariableExtensions(lite, { getScrollRoot: () => mergeView?.dom ?? null })`，含 reconfigure 路径）

- [x] 本任务不提交。

### Task 4: 活文档与验证

- [x] 更新 `.docs/ui/README.md`（TwoWayMergeEditor / codemirrorTheme / sticky / 现行主路径）
- [x] 更新 `.docs/specs/README.md`、`.docs/plans/README.md` 索引
- [x] 跑 `pnpm test:run`（sticky 相关 + createEditableJsonExtensions）；失败则修
- [x] 声称完成前记录证据

本任务不提交。

---

**归档日期：** 2026-09-04 **关联提交/PR：** （用户确认完成时尚未单独提交） **验证摘要：** Sticky 相关单测通过（`stickyScrollAncestors` / `stickyScrollExtension` / `braceFoldRanges` / `createEditableJsonExtensions`）；面包屑形态与视口锚定、lite 回退已落地并 sync `.docs/ui/README.md`。
