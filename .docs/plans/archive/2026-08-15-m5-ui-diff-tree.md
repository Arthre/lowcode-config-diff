# M5 UI Diff Tree 实施计划

> **给 Agent 执行者：** 必须使用 [子代理驱动开发](../workflows/subagent-driven-development.md)（推荐）或 [执行计划](../workflows/executing-plans.md) 逐步实施。步骤使用 checkbox（`- [ ]`）语法跟踪。

**日期：** 2026-08-15  
**状态：** 已完成  
**关联设计：** [总览](../specs/2026-08-15-v0.1-config-diff-merge.md)、[M5](../specs/2026-08-15-m5-ui-diff-tree.md)  
**目标：** 展示仅差异（可选显示无差异）的 Diff 树，支持每叶/批量选边，状态供 M6 读取；不调用 merge。  
**架构：** 纯函数 `diffTreeModel` 组树与 side 工具；Pinia `diffSession` 持有 Config + 可改 leaves；`DiffTree.vue` 渲染；`HomeView` 在 start-diff 时 `diffConfig` 写入 session。  
**技术栈：** Vue 3、Pinia、UnoCSS、Vitest；复用 `diffConfig` / `deepEqual` / `formatPath`

## Global Constraints

- Core 禁止 Vue；本切片 UI/store/composable 可依赖 Vue。
- 默认 side：modified/added→test，removed→prod（以引擎产出为准，恢复默认时按 type 重算）。
- merge 只吃差异叶子；无差异节点只读、无选边。
- 不调用 `mergeConfig`、无复制下载。
- 不引入新大型依赖。
- 文件收拢：见下方结构；单测中文。
- 未经用户明确要求不 commit。

## 潜在影响清单（已确认执行）

| 影响面                        | 说明                           |
| ----------------------------- | ------------------------------ |
| 新建 model / store / DiffTree | 见文件结构                     |
| HomeView                      | 真正消费 `start-diff` payload  |
| M4 JsonInputArea              | API 不变                       |
| M6                            | 可读 `useDiffSession().leaves` |

---

## 文件结构

```text
src/composables/diffTreeModel.ts
src/composables/diffTreeModel.test.ts
src/stores/diffSession.ts
src/components/DiffTree.vue
src/views/HomeView.vue          # 修改
```

---

### 任务 1：diffTreeModel 纯函数（组树 + 选边工具）

**对应需求：** Diff Tree、仅差异/显示无差异、批量 side、混合态、恢复默认

**接口产出：**

```ts
export type DiffTreeNodeKind = 'diff-leaf' | 'container' | 'equal'

export interface DiffTreeNode {
  path: string[]
  segment: string // 展示用末段；根用 '(root)'
  kind: DiffTreeNodeKind
  /** kind==='diff-leaf' */
  leafId?: string
  diffType?: DiffType
  testValue?: JsonValue
  prodValue?: JsonValue
  /** kind==='equal' 时双方相同值 */
  equalValue?: JsonValue
  children: DiffTreeNode[]
}

export function pathKey(path: string[]): string
export function buildDiffTree(options: {
  leaves: DiffItem[]
  testConfig: Config
  prodConfig: Config
  showUnchanged: boolean
}): DiffTreeNode[] // 森林：通常一个根容器的 children，或根即为 leaf

export function defaultSideForType(type: DiffType): DiffSide
export function withSide(leaves: DiffItem[], id: string, side: DiffSide): DiffItem[]
export function withAllSides(leaves: DiffItem[], side: DiffSide): DiffItem[]
export function withDefaultSides(leaves: DiffItem[]): DiffItem[]
export function withDescendantSides(
  leaves: DiffItem[],
  prefix: string[],
  side: DiffSide,
): DiffItem[]
export type MixedSide = DiffSide | 'mixed' | 'none'
export function sideStateForPrefix(leaves: DiffItem[], prefix: string[]): MixedSide
```

**组树规则：**

1. 用 `pathKey` 建 `Map`：差异叶子 path → DiffItem。
2. 递归 walk(testVal, prodVal, path)：
   - 若 `path` 命中差异叶子 → 产出 `diff-leaf`（无 children）。
   - 若 `deepEqual(testVal, prodVal)` → `showUnchanged` 时产出 `equal`，否则跳过（不产出）。
   - 若双方均为 plain object → 产出 `container`，对 key 并集排序后 recurse；若某侧缺 key 且该 path 不是差异叶，仍 recurse（子路径可能有差异）；过滤掉无 children 且自身非 leaf 的空容器（仅差异模式下）。
   - 其它（不应在无 DiffItem 时出现的类型不一致）→ 若有 DiffItem 已处理；否则可忽略或当作需有 leaf。
3. 根：对 testConfig/prodConfig 从 `path=[]` walk；若根是 diff-leaf，返回单节点列表；若 container，返回其 children 或包一层根——**推荐**始终返回 `walk` 在根上的结果数组：根为 container 时用 `children` 作为森林顶层（与「隐藏无差异」一致）；根为 diff-leaf（整根 array 不同）则单元素列表。

**空容器修剪：** `container` 若 `children.length===0` 则不加入父级（仅差异模式自然发生）。

- [x] **步骤 1：写失败测试** `src/composables/diffTreeModel.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { diffConfig } from '@/core/diff'
import {
  buildDiffTree,
  defaultSideForType,
  sideStateForPrefix,
  withAllSides,
  withDefaultSides,
  withDescendantSides,
  withSide,
} from './diffTreeModel'

describe('buildDiffTree', () => {
  it('默认仅差异：不含相同子树', () => {
    const test = { keep: 1, nest: { a: 1, b: 2 } }
    const prod = { keep: 1, nest: { a: 9, b: 2 } }
    const leaves = diffConfig(test, prod)
    const tree = buildDiffTree({ leaves, testConfig: test, prodConfig: prod, showUnchanged: false })
    const json = JSON.stringify(tree)
    expect(json).toContain('nest')
    expect(json).toContain('"a"')
    expect(json).not.toContain('"keep"')
    // b 相同，默认不出现
    expect(json.includes('"segment":"b"') || json.includes('"path":["nest","b"]')).toBe(false)
  })

  it('显示无差异时出现相同节点且为 equal', () => {
    const test = { keep: 1, x: 2 }
    const prod = { keep: 1, x: 3 }
    const leaves = diffConfig(test, prod)
    const tree = buildDiffTree({ leaves, testConfig: test, prodConfig: prod, showUnchanged: true })
    const flat: string[] = []
    const walk = (nodes: ReturnType<typeof buildDiffTree>) => {
      for (const n of nodes) {
        flat.push(`${n.segment}:${n.kind}`)
        walk(n.children)
      }
    }
    walk(tree)
    expect(flat.some((s) => s.startsWith('keep:equal'))).toBe(true)
    expect(flat.some((s) => s.startsWith('x:diff-leaf'))).toBe(true)
  })

  it('根 array 整段差异为单个 diff-leaf', () => {
    const test = [1, 2]
    const prod = [1, 3]
    const leaves = diffConfig(test, prod)
    const tree = buildDiffTree({ leaves, testConfig: test, prodConfig: prod, showUnchanged: false })
    expect(tree).toHaveLength(1)
    expect(tree[0]?.kind).toBe('diff-leaf')
    expect(tree[0]?.path).toEqual([])
  })
})

describe('选边工具', () => {
  const leaves = diffConfig({ a: 1, b: 2 }, { a: 9, c: 3 })

  it('defaultSideForType 符合 M2 表', () => {
    expect(defaultSideForType('modified')).toBe('test')
    expect(defaultSideForType('added')).toBe('test')
    expect(defaultSideForType('removed')).toBe('prod')
  })

  it('withSide / withAllSides / withDefaultSides', () => {
    const one = withSide(leaves, leaves.find((l) => l.path[0] === 'a')!.id, 'prod')
    expect(one.find((l) => l.path[0] === 'a')?.side).toBe('prod')
    expect(withAllSides(leaves, 'prod').every((l) => l.side === 'prod')).toBe(true)
    const reset = withDefaultSides(withAllSides(leaves, 'prod'))
    for (const leaf of reset) {
      expect(leaf.side).toBe(defaultSideForType(leaf.type))
    }
  })

  it('父级批量与混合态', () => {
    const test = { form: { name: { required: true, label: 'A' }, x: 1 } }
    const prod = { form: { name: { required: false, label: 'B' }, x: 1 } }
    const items = diffConfig(test, prod)
    const mixed = withSide(
      withSide(items, items.find((l) => l.path.at(-1) === 'required')!.id, 'test'),
      items.find((l) => l.path.at(-1) === 'label')!.id,
      'prod',
    )
    expect(sideStateForPrefix(mixed, ['form', 'name'])).toBe('mixed')
    const allTest = withDescendantSides(mixed, ['form', 'name'], 'test')
    expect(sideStateForPrefix(allTest, ['form', 'name'])).toBe('test')
  })
})
```

- [x] **步骤 2：确认失败** `pnpm test:run src/composables/diffTreeModel.test.ts`

- [x] **步骤 3：最小实现** `diffTreeModel.ts`（按上方接口与组树规则）

- [x] **步骤 4：确认通过** 同上命令 PASS

- [ ] **步骤 5：提交**（仅用户要求时）

---

### 任务 2：diffSession + DiffTree UI + HomeView 接线

**对应需求：** 选边 UI、批量按钮、显示无差异开关、高危 removed 样式；验收 1–7

**Pinia `diffSession.ts`：**

```ts
// state: testConfig, prodConfig, leaves, showUnchanged, active
// startSession(test, prod): leaves = diffConfig(test,prod) 深拷贝 side 字段可改
// setShowUnchanged(v)
// setLeafSide / setAllTest / setAllProd / resetDefaults / setDescendantSides
// getters: hasSession, leafCount
```

**DiffTree.vue：**

- 读 session；`buildDiffTree(...)` computed
- 工具栏：显示无差异（checkbox）、全部选 TEST、全部选 PROD、恢复默认
- 节点：
  - `container`：折叠/展开（默认展开）；显示混合态时旁注「混合」；按钮/分段控件将后代设为 TEST 或 PROD
  - `diff-leaf`：类型徽章（removed 红色）、`formatPath`、TEST|PROD radio、两侧值摘要（object/array 用 `<details>`）
  - `equal`：只读灰显，无选边控件
- 无 session 时不渲染（由 HomeView 控制）

**HomeView：**

```ts
function onStartDiff(payload: { test: Config; prod: Config }) {
  diffSession.startSession(payload.test, payload.prod)
}
```

Diff 区嵌入 `<DiffTree />`；Result 仍占位。

- [x] **步骤 1：实现 store + DiffTree + HomeView**

- [x] **步骤 2：验证**

```bash
pnpm test:run src/composables/diffTreeModel.test.ts
pnpm test:run
pnpm lint
pnpm build
```

手工：`pnpm dev` — 双栏合法 JSON → 开始 Diff → 仅差异 → 开关无差异 → 选边/批量/恢复默认。

- [ ] **步骤 3：提交**（仅用户要求时）

---

### 任务 3：文档收尾

- M5 规格 → 已完成；总览 M5 → 已完成
- `.docs/ui/README.md` 补充 DiffTree / diffSession / diffTreeModel
- 计划归档 `plans/archive/`

- [x] **步骤 1：验证 + 回写 + 归档**
- [ ] **步骤 2：提交**（仅用户要求时）

---

## Spec 覆盖自检

| Spec                    | 任务               |
| ----------------------- | ------------------ |
| 仅差异默认              | 1–2                |
| 显示无差异只读          | 1–2                |
| 选边 / 父级批量 / 混合  | 1–2                |
| 全部 TEST/PROD/恢复默认 | 1–2                |
| 不 merge                | 全任务             |
| 状态供 M6               | diffSession.leaves |

---

## 完成后

推进 M6 Merge 预览（读 `diffSession`）。
