# 工作台扫读、空态与折叠差异 实施计划

> **给 Agent 执行者：** 必须使用 [子代理驱动开发](../workflows/subagent-driven-development.md)（推荐）或 [执行计划](../workflows/executing-plans.md) 逐步实施。步骤使用 checkbox（`- [ ]`）语法跟踪。

**日期：** 2026-08-21 **状态：** 已完成  
**关联设计：** [`.docs/specs/2026-08-21-workbench-scan-empty-collapse.md`](../../specs/2026-08-21-workbench-scan-empty-collapse.md)  
**目标：** 页眉「差异 n / m」；目录符号二级树与类型筛选；空态居中+粘贴+示例；缩略轨与编辑器同高；左右横滚同步；「仅显示差异」折叠未改行。  
**架构：** 纯函数先锁文案/筛选/示例/横滚；再改空态与目录 UI；再改 stage 槽位；最后接 `collapseUnchanged` 与 `heightChanged` 补测。  
**技术栈：** Vue 3、CodeMirror 6 MergeView（`@codemirror/merge`）、Vitest、现有 token 与 `.ui-btn`

## Global Constraints

- 包管理器仅 pnpm；界面文案、注释、单测 `describe` / `it` 用简体中文
- 采纳单位仍是 CM 文本差异块；中间只保留 `→`；`←` 下线
- UI 不调用 `diffConfig` / `mergeConfig`；不改 Core
- 滚动热路径禁止对每块 `lineBlockAt`，禁止重跑分组与预览；`heightChanged` 允许重测色带
- 窄屏 Merge 仍并排，禁止 `.cm-mergeViewEditors { flex-direction: column }`
- 用户未明确要求时不提交、不推送
- 不引入新依赖；标识符英文，文案中文
- 禁止无必要的 `any` 和非空断言 `!`
- 实现后做行为等价精简（simplification），不顺手重构无关代码
- 页眉 chips 只读；筛选不改上一个/下一个；折叠默认关、不写 localStorage
- 编辑器内 Ctrl+V 仍为光标插入、不格式化

---

## 交付文件

- 修改：`src/composables/chunkNavAnchor.ts`、`src/composables/chunkNavAnchor.test.ts`
- 修改：`src/composables/chunkKind.ts`、`src/composables/chunkKind.test.ts`
- 创建：`src/composables/directoryKindFilter.ts`、`src/composables/directoryKindFilter.test.ts`
- 创建：`src/composables/sampleMergeDocs.ts`、`src/composables/sampleMergeDocs.test.ts`
- 创建：`src/composables/syncEditorScrollLeft.ts`、`src/composables/syncEditorScrollLeft.test.ts`
- 创建：`src/composables/mergeCollapseUnchanged.ts`（常量 + 类型，无 DOM）
- 修改：`src/components/ChunkJumpList.vue`、`src/components/MergePaneEmptyState.vue`、`src/components/TwoWayMergeEditor.vue`、`src/views/HomeView.vue`（仅当徽章绑定已走 `chunkAnchorText`，一般不用改模板）
- 活文档（任务 6）：`.docs/ui/README.md`、`PRODUCT.md`；specs 状态改为实施中/完成后已完成

## 接口（本计划锁定）

```ts
// chunkNavAnchor.ts — 改返回值
export function chunkAnchorText(current: number, total: number): string
// total<=0 → '无差异'
// current<=0 && total>0 → `差异 ${total}`
// else → `差异 ${current} / ${total}`

// chunkKind.ts — 新增
export const chunkKindMarker: Record<ChunkKind, string> = {
  added: '＋',
  removed: '−',
  modified: '●',
}
export const chunkKindShortName: Record<ChunkKind, string> = {
  added: '新增',
  removed: '删除',
  modified: '修改',
}

// directoryKindFilter.ts
export type DirectoryKindFilter = 'all' | ChunkKind

export function filterConfigItemGroups(
  groups: readonly ConfigItemGroup[],
  filter: DirectoryKindFilter,
): ConfigItemGroup[]

export function filterJumpItems<T extends { kind: ChunkKind }>(
  items: readonly T[],
  filter: DirectoryKindFilter,
): T[]

export function directoryKindFilterEmptyText(filter: DirectoryKindFilter): string
// all → '没有差异块'
// added → '没有新增项'
// removed → '没有删除项'
// modified → '没有修改项'

// sampleMergeDocs.ts
export const SAMPLE_REFERENCE_JSON: string
export const SAMPLE_TARGET_JSON: string
export const SAMPLE_REFERENCE_FILE_NAME = '示例-参考.json'
export const SAMPLE_TARGET_FILE_NAME = '示例-目标.json'
export function isSampleFillAvailable(leftDoc: string, rightDoc: string): boolean
// 仅当两侧 length===0

// syncEditorScrollLeft.ts
export function createHorizontalScrollSync(): {
  onScroll(source: HTMLElement, target: HTMLElement): void
}

// mergeCollapseUnchanged.ts
export const MERGE_COLLAPSE_UNCHANGED: { margin: 3; minSize: 4 }
```

`filterConfigItemGroups('all')` 返回原组（可浅拷贝数组，不要改入参对象）。非 `all`：组内 `fields` 只留 `field.kind === filter`，`changeCount` 改为过滤后长度；无剩余字段则丢弃该组。

---

### 任务 1：切片 A — 页眉锚点文案

**对应需求：** [~ 页眉锚点]

**文件：**

- 修改：`src/composables/chunkNavAnchor.ts`
- 测试：`src/composables/chunkNavAnchor.test.ts`

**接口：** 产出新的 `chunkAnchorText` 返回值。`HomeView` 已绑定该函数，模板不用改。

- [ ] **步骤 1：改失败测试**

把 `chunkAnchorText` 两例改成新文案（保留「无差异」）：

```ts
describe('chunkAnchorText', () => {
  it('无差异时显示无差异', () => {
    expect(chunkAnchorText(0, 0)).toBe('无差异')
  })

  it('有块时带当前序号', () => {
    expect(chunkAnchorText(3, 55)).toBe('差异 3 / 55')
  })

  it('尚未锚到具体块时只报总数', () => {
    expect(chunkAnchorText(0, 55)).toBe('差异 55')
  })
})
```

- [ ] **步骤 2：确认失败**

运行：`pnpm test:run src/composables/chunkNavAnchor.test.ts`

预期：FAIL，收到旧字符串 `3 / 55 个差异` / `55 个差异`。

- [ ] **步骤 3：最小实现**

```ts
export function chunkAnchorText(current: number, total: number): string {
  if (total <= 0) return '无差异'
  if (current <= 0) return `差异 ${total}`
  return `差异 ${current} / ${total}`
}
```

- [ ] **步骤 4：确认通过**

运行：`pnpm test:run src/composables/chunkNavAnchor.test.ts`

预期：PASS。

- [ ] **步骤 5：提交**（仅当用户明确要求时）

---

### 任务 2：切片 B — 示例数据与空态

**对应需求：** [+ 粘贴全文（空态）] [+ 填入示例配置] [~ 空态布局] [- 空态上沿大段留白]

**文件：**

- 创建：`src/composables/sampleMergeDocs.ts`、`src/composables/sampleMergeDocs.test.ts`
- 修改：`src/components/MergePaneEmptyState.vue`、`src/components/TwoWayMergeEditor.vue`

**接口：** 消费 `pasteAsFullSide`、`importSide`、`isSampleFillAvailable`。产出空态 `paste` / `sample` 事件。

- [ ] **步骤 1：编写失败测试（示例对）**

```ts
import { describe, expect, it } from 'vitest'
import { diffConfigItems } from './configItemDiff'
import { SAMPLE_REFERENCE_JSON, SAMPLE_TARGET_JSON, isSampleFillAvailable } from './sampleMergeDocs'

describe('isSampleFillAvailable', () => {
  it('仅双侧都空时为真', () => {
    expect(isSampleFillAvailable('', '')).toBe(true)
    expect(isSampleFillAvailable('{', '')).toBe(false)
    expect(isSampleFillAvailable('', '{')).toBe(false)
  })
})

describe('示例配置对', () => {
  it('可解析且含修改、新增、删除叶子', () => {
    const result = diffConfigItems(SAMPLE_REFERENCE_JSON, SAMPLE_TARGET_JSON)
    expect(result.available).toBe(true)
    const kinds = new Set(result.groups.flatMap((g) => g.fields.map((f) => f.kind)))
    expect(kinds.has('modified')).toBe(true)
    expect(kinds.has('added')).toBe(true)
    expect(kinds.has('removed')).toBe(true)
  })
})
```

JSON 正文必须与 spec「示例配置（锁定）」一致（可多/少空白，`importSide` 会 `formatConfig`）。

- [ ] **步骤 2：确认失败**

运行：`pnpm test:run src/composables/sampleMergeDocs.test.ts`

预期：FAIL，模块不存在。

- [ ] **步骤 3：实现 `sampleMergeDocs.ts`**

导出锁定 JSON 字符串、文件名常量、`isSampleFillAvailable`。

- [ ] **步骤 4：确认通过**

运行：`pnpm test:run src/composables/sampleMergeDocs.test.ts`

预期：PASS。

- [ ] **步骤 5：空态组件**

`MergePaneEmptyState`：

- props 增加 `showSample?: boolean`（默认 `false`）
- emits 增加 `paste`、`sample`
- 模板在「选择文件」旁增加「粘贴全文」（`ui-btn` 描边或 soft 次级）；`v-if="showSample"` 再增加文字按钮「填入示例配置」
- 副文案保持「支持 .json 文件」，不要写「Ctrl+V 即粘贴全文」
- `.merge-pane-empty` 保持 column + 居中；`.merge-pane-empty__player` 改为约 `3.5rem` 宽高
- 动作行：`display:flex; gap:0.35rem; flex-wrap:wrap; justify-content:center`

宿主 `TwoWayMergeEditor`：

- `show-sample="leftEmpty && rightEmpty"`（两侧都空才为真）
- `@paste="pasteAsFullSide('left'|'right')"`
- `@sample`：`workspace.importSide('left', SAMPLE_REFERENCE_JSON, SAMPLE_REFERENCE_FILE_NAME)` 与右侧对应目标常量和文件名
- `.two-way-merge-empty`：`align-items: center; justify-content: center; padding-top: 0`（删除 `min(4.25rem, 18%)`）
- 拖入时标题变 accent 的现有 `:deep` 规则保留
- 空态根节点 `pointer-events: none`，按钮必须 `pointer-events: auto`（选择文件已有，粘贴/示例同样加）

- [ ] **步骤 6：手工验收空态**

双侧空：簇在栏中部；有粘贴；填入示例后左右有内容、页眉出现差异。一侧已有内容时，空的那侧**没有**「填入示例配置」。粘贴走剪贴板 API（无权限时已有中文错误）。

- [ ] **步骤 7：提交**（仅当用户明确要求时）

---

### 任务 3：切片 C — 目录符号树与类型筛选

**对应需求：** [+ 类型筛选] [~ 分层目录展示] [- 默认 L{n}]

**文件：**

- 修改：`src/composables/chunkKind.ts`、`src/composables/chunkKind.test.ts`
- 创建：`src/composables/directoryKindFilter.ts`、`src/composables/directoryKindFilter.test.ts`
- 修改：`src/components/ChunkJumpList.vue`、`src/components/TwoWayMergeEditor.vue`

**接口：** 消费 `ConfigItemGroup`、`ChunkKind`。产出过滤后的 groups/items。筛选状态放 `ChunkJumpList` 内部 `ref`，文档变化时由宿主重喂 groups 即可；**不要**把 filter 写进 store。切换 groups 源时把 filter 重置为 `'all'`（在 `refreshConfigItemGroups` 后由 list 的 `watch` 或 `:key` 实现：给 `ChunkJumpList` `:key="fieldSummaryText + jumpItems.length"` 过重；改为 list 内 `watch(() => props.groups, () => { kindFilter = 'all' })` 与 `watch(() => props.items, ...)`）。

- [ ] **步骤 1：编写失败测试（marker + 筛选）**

`chunkKind.test.ts` 追加：

```ts
it('类型符号为实心点、全角加号、减号', () => {
  expect(chunkKindMarker.modified).toBe('●')
  expect(chunkKindMarker.added).toBe('＋')
  expect(chunkKindMarker.removed).toBe('−')
})
```

`directoryKindFilter.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import type { ConfigItemGroup } from './configItemDiff'
import {
  directoryKindFilterEmptyText,
  filterConfigItemGroups,
  filterJumpItems,
} from './directoryKindFilter'

const groups: ConfigItemGroup[] = [
  {
    id: 'pagination',
    path: [{ type: 'key', key: 'pagination' }],
    kind: 'modified',
    changeCount: 2,
    fields: [
      {
        path: [],
        relativeLabel: 'pageSize',
        kind: 'modified',
        leftText: '10',
        rightText: '20',
      },
      {
        path: [],
        relativeLabel: 'showExport',
        kind: 'removed',
        leftText: 'true',
        rightText: '',
      },
    ],
  },
  {
    id: 'tableGrid[1]',
    path: [
      { type: 'key', key: 'tableGrid' },
      { type: 'index', index: 1 },
    ],
    kind: 'added',
    changeCount: 1,
    fields: [
      {
        path: [],
        relativeLabel: 'prop',
        kind: 'added',
        leftText: '',
        rightText: '"status"',
      },
    ],
  },
]

describe('filterConfigItemGroups', () => {
  it('全部时组数不变', () => {
    expect(filterConfigItemGroups(groups, 'all')).toHaveLength(2)
  })

  it('只看删除时只留删除叶子并改 changeCount', () => {
    const next = filterConfigItemGroups(groups, 'removed')
    expect(next).toHaveLength(1)
    expect(next[0]?.id).toBe('pagination')
    expect(next[0]?.changeCount).toBe(1)
    expect(next[0]?.fields.every((f) => f.kind === 'removed')).toBe(true)
  })

  it('只看新增时丢掉没有新增叶子的组', () => {
    const next = filterConfigItemGroups(groups, 'added')
    expect(next.map((g) => g.id)).toEqual(['tableGrid[1]'])
  })
})

describe('filterJumpItems', () => {
  it('扁平块按 kind 过滤', () => {
    const items = [
      { kind: 'added' as const, index: 0 },
      { kind: 'removed' as const, index: 1 },
    ]
    expect(filterJumpItems(items, 'removed').map((i) => i.index)).toEqual([1])
  })
})

describe('directoryKindFilterEmptyText', () => {
  it('按筛选给出空态文案', () => {
    expect(directoryKindFilterEmptyText('all')).toBe('没有差异块')
    expect(directoryKindFilterEmptyText('removed')).toBe('没有删除项')
  })
})
```

- [ ] **步骤 2：确认失败**

运行：`pnpm test:run src/composables/chunkKind.test.ts src/composables/directoryKindFilter.test.ts`

预期：FAIL（缺导出 / 缺模块）。

- [ ] **步骤 3：实现 marker 与 filter**

从 `ChunkJumpList.vue` 删掉本地 `chunkKindShortName`，改为从 `@/composables/chunkKind` 导入 `chunkKindMarker`、`chunkKindShortName`。

- [ ] **步骤 4：确认通过**

运行：`pnpm test:run src/composables/chunkKind.test.ts src/composables/directoryKindFilter.test.ts`

预期：PASS。

- [ ] **步骤 5：改 `ChunkJumpList` 展示与筛选条**

顶栏（`showGrouped` 或扁平都要）：互斥按钮组 **全部 | ＋ | − | ●**，`aria-label` 分别为「显示全部差异」「只看新增」「只看删除」「只看修改」。当前项 `aria-pressed="true"`。

列表数据：

```ts
const kindFilter = ref<DirectoryKindFilter>('all')
const visibleGroups = computed(() => filterConfigItemGroups(props.groups, kindFilter.value))
const visibleItems = computed(() => filterJumpItems(props.items, kindFilter.value))
```

组头一行：`[marker][id][count]`，count 用 `{{ group.changeCount }}` 即可，不要换行「N 项变化」。字段一行：`[marker][relativeLabel][fieldValueText]`。不要渲染 `.chunk-jump-list__line`。字段 `aria-label` 可拼 `chunkKindShortName[field.kind] + 空格 + relativeLabel`。

组头 `.chunk-jump-list__count` 去掉 `flex-basis: 100%`。`.chunk-jump-list__kind` 改用 marker，字号可略大于路径但不要再占两个汉字宽。

筛空：`visibleGroups.length===0 && showGrouped` 或 `visibleItems.length===0 && !showGrouped` 时显示 `directoryKindFilterEmptyText(kindFilter)`；`kindFilter!=='all'` 时再给按钮「显示全部」把 filter 设回 `all`。

页眉 `HomeView` 的「新增 n · 删除 n · 修改 n」**不要**加 click。

- [ ] **步骤 6：手工验收目录**

示例对导入后：组头能扫到 `pageSize` 所在路径与 `tableGrid[0]` / `tableGrid[1]`；点「−」只剩删除；上一个/下一个仍能走到新增块。非法 JSON 时扁平列表筛选仍可用。

- [ ] **步骤 7：提交**（仅当用户明确要求时）

---

### 任务 4：切片 D — 缩略轨同高与横向滚动同步

**对应需求：** [~ 缩略轨高度] [+ 横向滚动同步]

**文件：**

- 创建：`src/composables/syncEditorScrollLeft.ts`、`src/composables/syncEditorScrollLeft.test.ts`
- 修改：`src/components/TwoWayMergeEditor.vue`（template + css + 监听）

**接口：** 消费 `mergeView.a.scrollDOM` / `b.scrollDOM`。产出 `createHorizontalScrollSync`。

- [ ] **步骤 1：编写失败测试**

```ts
import { describe, expect, it, vi } from 'vitest'
import { createHorizontalScrollSync } from './syncEditorScrollLeft'

function fakeScroller(scrollLeft: number) {
  return { scrollLeft } as HTMLElement
}

describe('createHorizontalScrollSync', () => {
  it('把 source 的 scrollLeft 写到 target', () => {
    const sync = createHorizontalScrollSync()
    const source = fakeScroller(40)
    const target = fakeScroller(0)
    sync.onScroll(source, target)
    expect(target.scrollLeft).toBe(40)
  })

  it('值相同则不写，避免无意义赋值', () => {
    const sync = createHorizontalScrollSync()
    const source = fakeScroller(8)
    const target = fakeScroller(8)
    const setter = vi.fn()
    Object.defineProperty(target, 'scrollLeft', {
      get: () => 8,
      set: setter,
    })
    sync.onScroll(source, target)
    expect(setter).not.toHaveBeenCalled()
  })

  it('回写时不形成二次传播', () => {
    const sync = createHorizontalScrollSync()
    const a = fakeScroller(0)
    const b = fakeScroller(0)
    Object.defineProperty(a, 'scrollLeft', {
      get: () => 12,
      set: () => {
        sync.onScroll(a, b)
      },
      configurable: true,
    })
    b.scrollLeft = 0
    // 模拟 b 收到 a 的同步后再回调 a：锁位应挡住
    const inner = fakeScroller(12)
    sync.onScroll(inner, b)
    expect(b.scrollLeft).toBe(12)
  })
})
```

第三例若与实现锁位方式不完全同构，至少保证：`onScroll` 内设置 `target.scrollLeft` 时，若立即再次 `onScroll(target, source)`，`source.scrollLeft` 不会被错误清零。实现用模块内 `syncing` 布尔即可：

```ts
export function createHorizontalScrollSync() {
  let syncing = false
  return {
    onScroll(source: HTMLElement, target: HTMLElement) {
      if (syncing) return
      if (source.scrollLeft === target.scrollLeft) return
      syncing = true
      target.scrollLeft = source.scrollLeft
      syncing = false
    },
  }
}
```

- [ ] **步骤 2：确认失败**

运行：`pnpm test:run src/composables/syncEditorScrollLeft.test.ts`

预期：FAIL，模块不存在。

- [ ] **步骤 3：实现并让测试通过**

运行：`pnpm test:run src/composables/syncEditorScrollLeft.test.ts`

预期：PASS。

- [ ] **步骤 4：改布局 — 缩略轨与编辑器画框同高**

当前 `DiffMinimap` 是 `two-way-merge-stage` 里与 `two-way-merge-main` 平级，`align-self: stretch` 会吃胶囊高度。

改为：

```vue
<div class="two-way-merge-main">
  <!-- labels + search 不变 -->
  <div class="two-way-merge-body">
    <div class="two-way-merge-frame" ...>
      <div ref="hostRef" class="two-way-merge-host ..." />
      <!-- empty overlays 仍绝对定位在 frame 内 -->
    </div>
    <DiffMinimap v-if="showMinimap" ... />
  </div>
</div>
<!-- directory 仍为 stage 子节点，全高 -->
```

```scss
.two-way-merge-body {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  gap: 0.35rem;
}
```

`DiffMinimap` 现有 `align-self: stretch` 在 body 内即等于 frame 高。stage 上原来的 `gap` 若只为 minimap-directory，保持 stage：`main | directory`。查找条仍在 body **之上**，打开查找时缩略轨不对齐查找条。

- [ ] **步骤 5：挂横向同步**

在 `onMounted` 创建 MergeView 之后：

```ts
const hScrollSync = createHorizontalScrollSync()

function onLeftHScroll() {
  if (!mergeView) return
  hScrollSync.onScroll(mergeView.a.scrollDOM, mergeView.b.scrollDOM)
}
function onRightHScroll() {
  if (!mergeView) return
  hScrollSync.onScroll(mergeView.b.scrollDOM, mergeView.a.scrollDOM)
}
```

`mergeView.a.scrollDOM.addEventListener('scroll', onLeftHScroll, { passive: true })`（右侧对称）。`onBeforeUnmount` 与将来重建 MergeView 时成对 `removeEventListener`。不要监听 `mergeView.dom` 的横向（那会带动 `→` 槽）。

- [ ] **步骤 6：手工验收**

导入长 key 的 JSON：左右横滚对齐。缩略轨顶与编辑器顶齐、底与编辑器底齐；打开查找条时轨仍与画框齐。点击/拖动缩略轨纵向跳转仍准。

- [ ] **步骤 7：提交**（仅当用户明确要求时）

---

### 任务 5：切片 E — 仅显示差异（折叠未改行）

**对应需求：** [+ 仅显示差异] [~ collapseUnchanged] [~ syncEditorChrome]

**文件：**

- 创建：`src/composables/mergeCollapseUnchanged.ts`（可无单测或只测常量）
- 修改：`src/components/TwoWayMergeEditor.vue`、`src/components/ChunkJumpList.vue`（顶栏开关）

**接口：** 消费 `MERGE_COLLAPSE_UNCHANGED`。产出 `collapseUnchanged` 布尔（组件内 `ref(false)`）。

- [ ] **步骤 1：读包导出，决定热切还是重建**

打开 `node_modules/@codemirror/merge` 的 `index.d.ts` / README。若存在可放入 `Compartment` 的折叠扩展，用 `mergeView.a.dispatch` / `b.dispatch` 的 `reconfigure`，**禁止 destroy**。若折叠只出现在 `MergeView` 构造参数 `collapseUnchanged?: { margin?: number; minSize?: number }` 且无导出扩展：走步骤 3 的重建路径。

- [ ] **步骤 2：`heightChanged` 只重测色带**

改 `createSideListener`：

```ts
if (update.docChanged) {
  /* 现有 store 回写 */
}
syncEditorChrome(update.docChanged, update.heightChanged)
```

```ts
function syncEditorChrome(rebuildLayout: boolean, remasureBands = false) {
  // ...
  const shouldLayout = rebuildLayout || count !== lastChunkCount
  if (shouldLayout) {
    refreshChunkBands()
    refreshMinimapSnapshot()
    // kinds / jump / groups 仅这条
  } else if (remasureBands) {
    refreshChunkBands()
    refreshMinimapSnapshot()
  }
  // 滚动锚点、viewportBand 照旧
}
```

`onMergeScroll` 仍 `syncEditorChrome(false)`，**不要**传 `remasureBands`。

窗口 `resize` 现有 debounce 已 `refreshChunkBands`，保留。

- [ ] **步骤 3：开关与 MergeView 配置**

`collapseUnchangedOn = ref(false)`。目录顶栏在筛选条旁加按钮或 checkbox 样式的 `.ui-btn`：「仅显示差异」，`aria-pressed` 绑定。

打开时构造传入：

```ts
collapseUnchanged: collapseUnchangedOn.value ? MERGE_COLLAPSE_UNCHANGED : undefined
```

`MERGE_COLLAPSE_UNCHANGED = { margin: 3, minSize: 4 }`。

若必须重建：抽 `mountMergeView()`，切换时：

1. 卸 `mergeView.dom` scroll、左右 `scrollDOM` 横滚、window resize 中与实例绑定的部分
2. `mergeView.destroy()`；`mergeView = null`
3. 用 `workspace.leftDoc` / `rightDoc` 再 `new MergeView({...})`
4. 重新绑定纵向 scroll、横向 sync、`syncEditorChrome(true)`
5. `afterEditorMeasure` 再 `syncEditorChrome(true)` 一次

不要在导入/键入路径 destroy（原约束仍在）。

- [ ] **步骤 4：折叠条文案**

库默认折叠条若为英文，用 `:deep(.cm-mergeSpacer)` / 实际 class（以包 CSS 为准）尽量改成中文不可行时，保持库默认，**不要**为改文案 fork 包。优先检查是否有 `renderCollapsed` / 类似配置；没有则接受英文「N unchanged lines」或包内已有文案。若包支持自定义标签再写成「N 行相同」。

- [ ] **步骤 5：手工验收折叠**

用示例对或更大 JSON：关闭时全文可见；打开后相同行折叠；点击展开；再关开关恢复全文。开关切换后缩略滑块与色带仍对准视口。上一个/下一个、`→` 仍按块。类型筛选仍只影响目录。

- [ ] **步骤 6：提交**（仅当用户明确要求时）

---

### 任务 6：验证与活文档

**对应需求：** 验收清单第 8 条；sync 模块文档

**文件：**

- 修改：`.docs/ui/README.md`、`PRODUCT.md`
- 修改：`.docs/specs/2026-08-21-workbench-scan-empty-collapse.md` 状态（实施中 → 完成后「已完成」）
- 本计划状态：执行中 → 已完成（归档另等 finishing-branch）

- [x] **步骤 1：跑验证**

```bash
pnpm lint
pnpm test:run
pnpm build
```

预期：全部通过。失败则修在对应切片，不在本任务堆新功能。

- [x] **步骤 2：sync 活文档**

`PRODUCT.md` Capabilities：徽章改为 `差异 n / m`；目录符号与筛选；空态粘贴/示例；缩略轨与编辑器同高；横向滚动同步；「仅显示差异」折叠未改行（默认关）。

`.docs/ui/README.md`：更新 `HomeView` 徽章文案、`ChunkJumpList`、`MergePaneEmptyState`、`TwoWayMergeEditor` 现行主路径与布局（body = frame|minimap）。规格列表加上本 spec。

- [ ] **步骤 3：对照 spec 验收清单 1–8 做一次手工过单**

- [ ] **步骤 4：提交**（仅当用户明确要求时）

---

## 计划自检

1. **Spec 覆盖：** A→任务1；B→任务2；C→任务3；D→任务4；E→任务5；验收命令与活文档→任务6。非目标均未列入任务。
2. **占位符：** 无 TBD。折叠条中文依赖包能力，已写明 fallback。
3. **类型：** `DirectoryKindFilter`、`chunkKindMarker`、`MERGE_COLLAPSE_UNCHANGED`、`createHorizontalScrollSync` 前后一致。
4. **切片边界：** 任务 1–4 可单独验收；任务 5 依赖任务 4 的 `scrollDOM` 监听卸载/重建约定与 `syncEditorChrome` 双参。

---

**归档日期：** 2026-09-04 **关联提交/PR：** （用户确认归档） **验证摘要：** 切片 A–E 已落地；规格已标「已完成」；活文档已 sync。
