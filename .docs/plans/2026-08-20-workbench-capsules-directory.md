# 工作台胶囊栏头与分层目录 实施计划

> **给 Agent 执行者：** 必须使用 [子代理驱动开发](../workflows/subagent-driven-development.md)（推荐）或 [执行计划](../workflows/executing-plans.md) 逐步实施。步骤使用 checkbox（`- [ ]`）语法跟踪。未经用户明确要求不要 `git commit`。

**日期：** 2026-08-20 **状态：** 执行中  
**关联设计：** [`.docs/specs/2026-08-20-workbench-capsules-directory.md`](../specs/2026-08-20-workbench-capsules-directory.md)  
**目标：** 胶囊栏头对齐编辑器；分层配置项目录在缩略轨右侧；页眉单行（字段/配置项进目录顶栏）；推开式目录抽屉；组/字段行号；缩略轨快拖与目录跳转补测后再滚。  
**架构：** 纯函数先落地（路径偏移、配置项分组、像素色带、行号、最近块）；再改布局与目录 UI；最后把分组/跳转/缩略轨/抽屉接到 `TwoWayMergeEditor`。  
**技术栈：** Vue 3、CodeMirror MergeView、Vitest、现有 token 与 `.ui-btn` / `.ui-btn-soft`

## Global Constraints

- 包管理器仅 pnpm；界面文案、注释、单测 `describe` / `it` 用简体中文
- 采纳单位仍是 CM 文本差异块；中间只保留 `→`；`←` 下线
- UI 不调用 `diffConfig` / `mergeConfig`；不改 Core 数组整段语义
- 滚动热路径禁止对每块 `lineBlockAt`，禁止重跑分组、预览、色带
- 窄屏 Merge 仍并排，禁止 `.cm-mergeViewEditors { flex-direction: column }`
- 用户未明确要求时不提交、不推送
- 不引入新依赖；标识符英文，文案中文
- 禁止无必要的 `any` 和非空断言 `!`
- 实现后做行为等价精简（simplification），不顺手重构无关代码
- 本迭代不改 Core、`←`、JSON Path 勾选、文本块导航单位、胶囊对齐、窄屏并排；不写目录开关 localStorage；不用 overlay / `display: none` 切目录
- 未命中跳转禁止回退当前块；`minimapDragging` 必须在 pointerup / pointercancel / lostpointercapture / 卸载时清除

---

## 交付文件

- 创建：`src/composables/jsonPathOffset.ts`、`src/composables/jsonPathOffset.test.ts`
- 创建：`src/composables/configItemDiff.ts`、`src/composables/configItemDiff.test.ts`
- 创建：`src/composables/activeGroupFromChunk.ts`、`src/composables/activeGroupFromChunk.test.ts`
- 修改：`src/composables/chunkMinimapLayout.ts`、`src/composables/chunkMinimapLayout.test.ts`（或 `minimapSnapshot.ts` 若更合适，像素换算放 layout）
- 修改：`src/components/ChunkJumpList.vue`、`src/components/TwoWayMergeEditor.vue`、`src/views/HomeView.vue`、`src/styles/primitives.scss`
- 创建：`src/composables/lineNumberAtOffset.ts`、`src/composables/lineNumberAtOffset.test.ts`
- 创建：`src/composables/nearestChunkIndexByOffset.ts`、`src/composables/nearestChunkIndexByOffset.test.ts`（或与现有 chunk 导航文件并列，类型可复用）
- 活文档：`.docs/ui/README.md`、`PRODUCT.md`（验证任务）

## 接口（本计划锁定）

```ts
export type JsonPathSeg = { type: 'key'; key: string } | { type: 'index'; index: number }

export function jsonPathOffset(source: string, path: readonly JsonPathSeg[]): number | null

export type ConfigFieldChange = {
  path: JsonPathSeg[]
  relativeLabel: string
  kind: 'added' | 'removed' | 'modified'
  leftText: string
  rightText: string
}

export type ConfigItemGroup = {
  id: string
  path: JsonPathSeg[]
  kind: 'added' | 'removed' | 'modified'
  changeCount: number
  fields: ConfigFieldChange[]
}

export type ConfigItemDiffResult = {
  available: boolean
  fields: number
  items: number
  groups: ConfigItemGroup[]
}

export function diffConfigItems(leftText: string, rightText: string): ConfigItemDiffResult
export function formatJsonPath(path: readonly JsonPathSeg[]): string
export function configItemFieldCountText(fields: number): string
export function configItemInvolveText(items: number): string

export function bandsFromPixelSpans(
  spans: readonly { start: number; end: number }[],
  scrollHeight: number,
): ChunkBand[]

export function splitMinimapBandsByKind(
  chunks: readonly { kind: 'added' | 'removed' | 'modified'; start: number; end: number }[],
  scrollHeight: number,
): { leftBands: ChunkBand[]; rightBands: ChunkBand[] }
```

`formatJsonPath`：key 用 `.` 连接，index 用 `[n]`。根下第一段无前导点，例如 `tableGrid[3]`、`pagination.pageSize`。

`configItemFieldCountText(55)` → `55 个字段变化`；`configItemInvolveText(12)` → `涉及 12 个配置项`。

值展示：`JSON.stringify`；修改行 UI 拼 `leftText + ' → ' + rightText`；超过 80 字截断加 `…`。

`chunks` 事件：`(count, current, kinds, fieldSummary)`，`fieldSummary` 为 `{ available, fields, items }`。

---

### 任务 1：jsonPathOffset

**对应需求：** [`jsonPathOffset`]

**文件：**

- 创建：`src/composables/jsonPathOffset.ts`
- 测试：`src/composables/jsonPathOffset.test.ts`

**接口：** 产出 `JsonPathSeg`、`jsonPathOffset`

- [ ] **步骤 1：编写失败测试** 覆盖：空 path 返回 0（文档起点）或 `null`（锁定：空 path 返回 `0`，空 source 且空 path 返回 `0`）；对象 key 定位到属性名起始引号；数组下标定位到该元素起始；嵌套 `tableGrid[1].columnType`；缺失路径与非法 JSON 返回 `null`。

```ts
import { describe, expect, it } from 'vitest'
import { jsonPathOffset } from './jsonPathOffset'

describe('jsonPathOffset', () => {
  it('空路径返回 0', () => {
    expect(jsonPathOffset('{"a":1}', [])).toBe(0)
  })

  it('定位对象属性名起始', () => {
    const source = '{\n  "title": "A"\n}'
    expect(jsonPathOffset(source, [{ type: 'key', key: 'title' }])).toBe(source.indexOf('"title"'))
  })

  it('定位嵌套数组元素的字段', () => {
    const source = `{
  "tableGrid": [
    { "columnType": "normal" },
    { "columnType": "custom" }
  ]
}`
    const offset = jsonPathOffset(source, [
      { type: 'key', key: 'tableGrid' },
      { type: 'index', index: 1 },
      { type: 'key', key: 'columnType' },
    ])
    expect(offset).toBe(source.lastIndexOf('"columnType"'))
  })

  it('路径不存在或非法 JSON 返回 null', () => {
    expect(jsonPathOffset('{"a":1}', [{ type: 'key', key: 'b' }])).toBeNull()
    expect(jsonPathOffset('{', [{ type: 'key', key: 'a' }])).toBeNull()
  })
})
```

- [ ] **步骤 2：确认失败** `pnpm test:run src/composables/jsonPathOffset.test.ts`；预期 FAIL（模块不存在或函数未定义）
- [ ] **步骤 3：编写最小实现** 对 source 做空白跳过 + 按 path 段进入 object/array；不 `JSON.parse` 后再 stringify（偏移必须对源文本）。失败则 `null`。
- [ ] **步骤 4：确认通过** 同上命令 PASS
- [ ] **步骤 5：提交** 跳过（用户未要求）

---

### 任务 2：configItemDiff

**对应需求：** [`diffConfigItems`]、[字段摘要]

**文件：**

- 创建：`src/composables/configItemDiff.ts`
- 测试：`src/composables/configItemDiff.test.ts`

**接口：** 消费 `JsonPathSeg`（可从 jsonPathOffset 再导出，或本文件重复 export type 再由 offset 文件 import type——锁定：类型只定义在 `jsonPathOffset.ts`，本文件 `import type`）

- [ ] **步骤 1：编写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import {
  diffConfigItems,
  formatJsonPath,
  configItemFieldCountText,
  configItemInvolveText,
} from './configItemDiff'

describe('formatJsonPath', () => {
  it('数组下标写成方括号', () => {
    expect(
      formatJsonPath([
        { type: 'key', key: 'tableGrid' },
        { type: 'index', index: 3 },
      ]),
    ).toBe('tableGrid[3]')
  })
})

describe('configItemFieldCountText / configItemInvolveText', () => {
  it('中文计数文案', () => {
    expect(configItemFieldCountText(55)).toBe('55 个字段变化')
    expect(configItemInvolveText(12)).toBe('涉及 12 个配置项')
  })
})

describe('diffConfigItems', () => {
  it('非法 JSON 时 available 为 false 且分组为空', () => {
    const result = diffConfigItems('{', '{"a":1}')
    expect(result).toEqual({ available: false, fields: 0, items: 0, groups: [] })
  })

  it('按下标把数组对象项收成配置项并列出字段 from→to', () => {
    const left = JSON.stringify({
      tableGrid: [{ columnType: 'normal', width: '240' }, { title: '旧' }],
    })
    const right = JSON.stringify({
      tableGrid: [{ columnType: 'custom', width: '320' }, { title: '旧' }],
    })
    const result = diffConfigItems(left, right)
    expect(result.available).toBe(true)
    expect(result.items).toBe(1)
    expect(result.fields).toBe(2)
    expect(result.groups[0]?.id).toBe('tableGrid[0]')
    expect(result.groups[0]?.kind).toBe('modified')
    expect(result.groups[0]?.fields.map((f) => f.relativeLabel)).toEqual(['columnType', 'width'])
    expect(result.groups[0]?.fields[0]?.leftText).toBe('"normal"')
    expect(result.groups[0]?.fields[0]?.rightText).toBe('"custom"')
  })

  it('仅目标有的数组项为新增组', () => {
    const left = JSON.stringify({ tableGrid: [{ a: 1 }] })
    const right = JSON.stringify({ tableGrid: [{ a: 1 }, { b: 2 }] })
    const result = diffConfigItems(left, right)
    expect(result.groups.some((g) => g.id === 'tableGrid[1]' && g.kind === 'added')).toBe(true)
  })

  it('无数组祖先时归到顶层 key', () => {
    const left = JSON.stringify({ pagination: { pageSize: 10 } })
    const right = JSON.stringify({ pagination: { pageSize: 20 } })
    const result = diffConfigItems(left, right)
    expect(result.groups[0]?.id).toBe('pagination')
    expect(result.groups[0]?.fields[0]?.relativeLabel).toBe('pageSize')
  })
})
```

- [ ] **步骤 2：** `pnpm test:run src/composables/configItemDiff.test.ts` FAIL
- [ ] **步骤 3：最小实现** `parseConfig` 两侧；`deepEqual` 跳过相同；对象走 key 并集、数组按下标；元素为 object 的数组把每个下标当作配置项边界；叶子 `JSON.stringify`（`undefined` 则 `''`）；组 `id = formatJsonPath(groupPath)`；`fields`/`items` 为叶子总数与组数。
- [ ] **步骤 4：** PASS
- [ ] **步骤 5：** 跳过提交

---

### 任务 3：缩略轨像素带纯函数

**对应需求：** [缩略像素带]

**文件：**

- 修改：`src/composables/chunkMinimapLayout.ts`
- 测试：`src/composables/chunkMinimapLayout.test.ts`

**接口：** 产出 `bandsFromPixelSpans`、`splitMinimapBandsByKind`

- [ ] **步骤 1：失败测试** `scrollHeight<=0` 返回 `[]`；`{start:100,end:300}` 且 `scrollHeight=1000` → `{start:0.1,end:0.3}`；end 夹到 1；`splitMinimapBandsByKind`：modified 左右都有且 start/end 相同；added 只在 right；removed 只在 left。
- [ ] **步骤 2：** `pnpm test:run src/composables/chunkMinimapLayout.test.ts` 新用例 FAIL
- [ ] **步骤 3：** 实现两函数；相邻同列带可合并（与现有 `conflictBandsOf` 习惯一致：重叠或相接则合并）
- [ ] **步骤 4：** PASS
- [ ] **步骤 5：** 跳过提交

---

### 任务 4：胶囊栏头 + grid 布局

**对应需求：** [胶囊栏头]、[栏头宽度]、[查找条宽度]、[目录位置]

**文件：**

- 修改：`src/components/TwoWayMergeEditor.vue` 的 template 与 scoped 样式（本任务**不**改分组数据，只改 DOM 结构与 CSS）

- [ ] 将根改为 grid：主列 | 缩略轨 | 目录。主列内顺序：两枚胶囊标签行、状态、查找条、编辑器 frame。
- [ ] 标签行仍用 `flex` + `2.4em` revert 槽对齐 Merge 三列；每侧 `.two-way-merge-labels__side` 自成表面（`border: 1px solid var(--border)`、`border-radius: var(--radius-lg)`、`background: var(--surface)`、内边距约 `0.45rem 0.65rem`）。去掉整条通栏的单一边框底。
- [ ] `DiffMinimap` 在 `ChunkJumpList` **左侧**（先缩略轨后目录）。
- [ ] 目录宽度改为约 `16rem`（组件内与宿主 class 一致）。
- [ ] 导入/粘贴/清空、空态、拖放逻辑不改。
- [ ] 验证：`pnpm lint` 针对该文件无新增错误。可用 `pnpm test:run` 确保无回归。

---

### 任务 5：ChunkJumpList 分层 UI

**对应需求：** [分层目录]

**文件：**

- 修改：`src/components/ChunkJumpList.vue`

**接口：**

```ts
props: {
  groups: ConfigItemGroup[]
  chunkItems: { kind: ChunkKind; preview: string; index: number }[]
  activeGroupId: string
  activeIndex: number  // 扁平回退用，0 起，无则 -1
  expandedIds: string[]
}
emits: {
  jumpGroup: [id: string]
  jumpField: [path: JsonPathSeg[]]
  jumpChunk: [index: number]
  toggleGroup: [id: string]
}
```

- [x] `groups.length > 0` 时渲染分层：组头含折叠三角、类型短名（语义色）、`id`、`N 项变化`；展开列出字段 `relativeLabel` 与 `leftText → rightText`（新增/删除只显示有值的一侧）。
- [x] `groups.length === 0` 时保持现行扁平 `items` 行，emit `jump`（兼容现有编辑器，未改名为 `chunkItems` / `jumpChunk`）。
- [x] `activeGroupId` 对应组 `aria-current="true"`；`▸` 点击 `toggleGroup` 并 `@click.stop`。
- [x] `aria-label` 仍为「差异块目录」。
- [x] 样式 Operate：紧凑，不要卡片堆；字段值用 `--mono`。

---

### 任务 6：HomeView 副行与导航按钮

**对应需求：** [字段摘要]、[上一个/下一个]

**文件：**

- 修改：`src/views/HomeView.vue`、`src/styles/primitives.scss`

- [ ] `onChunks` 增加第四参 `fieldSummary`；无第四参时视为 `{ available: false, fields: 0, items: 0 }`。
- [ ] 有差异时保留 `ui-diff-kind-row`；`fieldSummary.available && fields>0` 时在其下显示两行文案（`configItemFieldCountText` / `configItemInvolveText`）。
- [ ] 上一个：`ui-btn` + `i-lucide-chevron-up` + 文案「上一个差异」。下一个：`ui-btn ui-btn-soft` + 文案 + `i-lucide-chevron-down`。可用 `.ui-diff-nav` 成对紧凑 padding（约 `0.4rem 0.7rem`），不新造颜色。
- [ ] `aria-label` 在有字段摘要时包含块构成 + 字段文案。

---

### 任务 7：TwoWayMergeEditor 接线

**对应需求：** 分组计算、跳转、缩略像素、`chunks` 第四参、resize 重测色带

**文件：**

- 修改：`src/components/TwoWayMergeEditor.vue`

- [ ] layout 时：`diffConfigItems(leftDoc, rightDoc)`；`splitMinimapBandsByKind` 使用 `cachedChunkBands` + `kindOfChunk` + `mergeView.dom.scrollHeight`（高度为 0 则跳过）。
- [ ] resize：`refreshChunkBands` + 重算色带；**不要**因此重跑 `diffConfigItems`（文档没变）；若 scrollHeight 变了只更新带。
- [ ] 滚动：只更新 current、viewport、当前 `activeGroupId`（用当前块 fromB 与各组字段 offset 重叠；算不出则不清 groups）。
- [ ] `goToField(path)`：`jsonPathOffset` 于 B（removed 用 A）；有偏移则按 `lineBlockAt` **单次**滚到该行（这是点击路径，不是 scroll handler）；无偏移则 `goToChunkAt` 该组第一条重叠块。
- [ ] emit 第四参；`ChunkJumpList` 传入 groups / chunkItems / expanded：当前组必展开，用户 `toggleGroup` 可另开。
- [ ] 滚动 handler 内禁止 `diffConfigItems` / `jsonPathOffset` 全表 / 每块 `lineBlockAt`。

---

### 任务 8：验证与活文档

**对应需求：** 验收清单 8；sync

- [ ] `pnpm test:run`
- [ ] `pnpm lint`
- [ ] `pnpm build`
- [x] 更新 `.docs/ui/README.md`、`PRODUCT.md` 能力句；`.docs/specs/README.md` / `.docs/plans/README.md` 索引（胶囊/分层目录阶段）
- [ ] 不 archive（留给用户确认完成后）

---

## 迭代：页眉精简、目录抽屉与缩略轨跳转

原任务 1–8 保持已落地状态；下列任务覆盖 spec「迭代：页眉精简、目录抽屉与缩略轨跳转」。每个实现任务先失败测试再实现；Vue 组件可用 composable 单测覆盖逻辑。

### 任务 9：TDD `lineNumberAtOffset`

**对应需求：** [行号]

**文件：**

- 创建：`src/composables/lineNumberAtOffset.ts`
- 测试：`src/composables/lineNumberAtOffset.test.ts`

**接口：**

```ts
/** 源文本偏移对应的 1 起行号，与 CM gutter / `line.number` 一致；越界夹取。 */
export function lineNumberAtOffset(source: string, offset: number): number
```

- [x] **步骤 1：编写失败测试** 覆盖：空串任意 offset 返回 1；offset 0 返回 1；跨多行（如 `"a\nb\nc"` offset 指向 `c` 返回 3）；负 offset 与超过 `source.length` 夹取到首/末行。`describe` / `it` 中文。
- [x] **步骤 2：** `pnpm test:run src/composables/lineNumberAtOffset.test.ts` FAIL（模块不存在或函数未定义）
- [x] **步骤 3：最小实现** 纯函数，无 Vue/DOM；按 `\n` 计数；layout 时算，滚动不算（本任务只交函数）。
- [x] **步骤 4：** PASS
- [x] **步骤 5：** 跳过提交

---

### 任务 10：TDD 跳转未命中回退

**对应需求：** [目录未命中回退]

**文件：**

- 创建：`src/composables/nearestChunkIndexByOffset.ts`
- 测试：`src/composables/nearestChunkIndexByOffset.test.ts`

**接口：** 给现有 `onJumpGroup` / `onJumpField` 用。未命中**不得**返回当前锚点。

```ts
export type ChunkOffsetSpan = {
  fromA: number
  fromB: number
}

/**
 * 按组/字段偏移找最近文本块下标（0 起）。
 * `side`：删除用 A（fromA），其余用 B（fromB）。
 * 无偏移或块列表空 → `-1`；有偏移则取该侧 from 最接近且不大于目标的块，若全大于则取该侧 from 最小的块。
 */
export function nearestChunkIndexByOffset(options: {
  offset: number | null | undefined
  chunks: readonly ChunkOffsetSpan[]
  side: 'a' | 'b'
}): number
```

- [x] **步骤 1：失败测试** 无偏移返回 `-1`；空 chunks 返回 `-1`；有偏移命中最近块（不返回「当前锚点」参数——函数签名不得接受 currentIndex）；偏移落在两块之间取不大于目标的最近块。
- [x] **步骤 2：** `pnpm test:run src/composables/nearestChunkIndexByOffset.test.ts` FAIL
- [x] **步骤 3：最小实现**
- [x] **步骤 4：** PASS
- [x] **步骤 5：** 跳过提交

---

### 任务 11：页眉单行 + 字段摘要搬家

**对应需求：** [页眉层级]、[字段摘要位置]、[上一个/下一个文案]、[页眉字段两行]

**文件：**

- 修改：`src/views/HomeView.vue`、`src/styles/layout.scss`、`src/styles/primitives.scss`

- [x] 页眉压成单行：品牌 | `n / m 个差异` + `新增 n · 删除 n · 修改 n` chips | 上一个/下一个 | 本地处理/主题/查找/复制/导出。
- [x] 去掉 `.ui-diff-field-row`；页眉不再渲染字段/配置项两行。`fieldSummary` 仍可从 `chunks` 第四参接收，但本任务只保证页眉不展示（目录顶栏在任务 12）。
- [x] 上一个/下一个可见文案改为「上一个 / 下一个」；`aria-label` 仍为「上一个差异 / 下一个差异」；成对 chevron 样式保留。
- [x] 窄处允许工具簇换行，不要回到「品牌一行 + 统计三行」。
- [x] 失败测试优先覆盖文案 helper / 页眉是否仍含字段行（若已有 `chunkNavAnchor` 文案函数则扩测；组件可用最小 mount 或抽 computed）。
- [x] `pnpm test:run` 相关用例绿；`pnpm lint` 无新增错误。

---

### 任务 12：ChunkJumpList 行号 + 顶栏

**对应需求：** [目录顶栏]、[行号]

**文件：**

- 修改：`src/components/ChunkJumpList.vue`（及必要 props 类型）

```ts
props 追加（示例）：
  fieldSummaryText?: string  // 可解析且有变化时传入「n 个字段变化 · 涉及 m 个配置项」
  groupLineNumbers?: Record<string, number>  // group.id → 1 起行号
  fieldLineNumbers?: Record<string, number>  // 字段稳定 key → 行号
```

- [x] 可解析且有变化时顶栏显示 `{n} 个字段变化 · 涉及 {m} 个配置项`；非法 JSON / 无分组不显示。
- [x] 组头与字段显示 `L{n}`（有行号时）；删除侧与目标侧由宿主按 spec 计算后传入，本组件不显示左右两个行号。
- [x] 失败测试：纯函数或 props 渲染断言「有摘要才出顶栏」「行号格式 L218」。
- [x] PASS 后局部精简。

---

### 任务 13：目录推开抽屉 + 手柄动画

**对应需求：** [目录抽屉]、抽屉手柄、动画

**文件：**

- 修改：`src/components/TwoWayMergeEditor.vue` 及宿主/scoped 样式

- [x] 列宽 `16rem` ↔ `0` 推开（不 overlay）；默认展开；不写 localStorage。
- [x] 目录开关在页眉图标钮（`aria-expanded`；标签「收起目录」/「展开目录」）；侧栏不再常驻手柄。
- [x] 约 240ms 宽度过渡；`prefers-reduced-motion: reduce` 时瞬时。不用 `display: none`。
- [x] 动画表达侧栏进出，不要 bounce。
- [x] 可抽 `directoryDrawerOpen` 状态与列宽 class；过渡结束事件留给任务 14 接线。
- [x] 相关单测或样式约定锁定（reduced-motion / aria）。

---

### 任务 14：接线：行号缓存、补测再滚、拖结束清 flag、动画结束重测块带

**对应需求：** [跳转补测]、[缩略拖结束]、[目录未命中回退]、行号 layout 缓存

**文件：**

- 修改：`src/components/TwoWayMergeEditor.vue`、`src/components/DiffMinimap.vue`

- [x] layout（文档/块数/尺寸）时：`jsonPathOffset` + `lineNumberAtOffset` 缓存组/字段行号，传入 ChunkJumpList；滚动不重算。
- [x] `onJumpGroup` / `onJumpField`：缓存未命中时用 `nearestChunkIndexByOffset`；禁止 `goToChunkAt(jumpActiveIndex)`；仍失败则不滚动。
- [x] 拖结束与目录跳转前对左右 `EditorView.requestMeasure()`，再读 `lineBlockAt` / 设 `scrollTop`。
- [x] `minimapDragging` 在 `pointerup` / `pointercancel` / `lostpointercapture` / 卸载时清掉。
- [x] 拖动中仍不对全量块 `lineBlockAt`。
- [x] 抽屉宽度过渡结束一次 `refreshChunkBands` + 缩略快照；动画期间 resize 防抖。
- [x] 抽可测纯逻辑（补测后再滚的编排若难测，至少锁定 nearest + 清 flag 路径）。
- [x] 相关测试绿。

---

### 任务 15：验证 + 活文档

**对应需求：** 验收清单 8 与本迭代 9–15

- [x] `pnpm test:run`
- [x] `pnpm lint`
- [x] `pnpm build`
- [x] 同步 `.docs/ui/README.md`、`PRODUCT.md`（页眉单行、目录顶栏、推开抽屉、行号、补测跳转）
- [x] 原 spec 验收清单勾上本迭代追加项（9–15）能在代码中核对的项
- [x] 对改过的 Vue/SCSS 跑 `node .claude/skills/impeccable/scripts/detect.mjs --json <changed targets>`
- [x] 不 archive（留给用户确认完成后）
- [x] 不 git commit / push
