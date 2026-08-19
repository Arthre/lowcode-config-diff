# M1：文档会话与导入/导出纯逻辑 实施计划

> **给 Agent 执行者：** 使用 [子代理驱动开发](../../workflows/subagent-driven-development.md) 或 [执行计划](../../workflows/executing-plans.md)。未经用户明确要求不要 `git commit`。

**日期：** 2026-08-18 **状态：** 已完成 **关联设计：** `.docs/specs/2026-08-18-m1-merge-workspace.md`  
**目标：** 交付 store 与导入/导出纯函数，不换 UI  
**架构：** `prepareImportText` → `importSide`；`describeRightDocExport` 只描述右栏  
**技术栈：** Pinia、Vitest、现有 `parseConfig` / `formatConfig` / `evaluateJsonDocument` / `formatJsonDocument`

## Global Constraints

- 约束见 [总览](../../specs/2026-08-18-editable-two-way-merge.md) 与 [M1 规格](../../specs/2026-08-18-m1-merge-workspace.md)
- 本切片不改 `HomeView`、不删 `diffSession`、不瘦身 `exportConfig`
- 编辑器同步协议属 M2；本切片只保证 `importSide` 覆盖该侧字符串、**不改另一侧**
- 文案中文；`describe` / `it` 中文
- 复用现有 `formatJsonDocument` / `evaluateJsonDocument`，不要再写一套 JSON.parse
- store **不做** persist
- `didFormat` 不进 store
- 未经用户明确要求不要 `git commit`
- 验证：`pnpm test:run` 跑本切片测试

---

## 文件结构

- 创建：`src/composables/prepareImportText.ts`、`prepareImportText.test.ts`
- 创建：`src/composables/describeRightDocExport.ts`、`describeRightDocExport.test.ts`
- 创建：`src/stores/mergeWorkspace.ts`、`mergeWorkspace.test.ts`

---

### 任务 1：prepareImportText

**对应需求：** 合法则格式化一次；顶层必须是 object/array

**接口：**

```ts
export type PreparedImport = { text: string; didFormat: boolean }
export function prepareImportText(raw: string): PreparedImport
```

- [x] **步骤 1：编写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { prepareImportText } from './prepareImportText'

describe('prepareImportText', () => {
  it('合法对象 JSON 时格式化一次', () => {
    const result = prepareImportText('{"a":1}')
    expect(result.didFormat).toBe(true)
    expect(result.text).toBe('{\n  "a": 1\n}')
  })

  it('合法数组 JSON 时格式化一次', () => {
    const result = prepareImportText('[1]')
    expect(result.didFormat).toBe(true)
    expect(result.text).toBe('[\n  1\n]')
  })

  it('非法 JSON 时保留原文且 didFormat 为 false', () => {
    const raw = '{a'
    expect(prepareImportText(raw)).toEqual({ text: raw, didFormat: false })
  })

  it('空字符串保留为空', () => {
    expect(prepareImportText('')).toEqual({ text: '', didFormat: false })
  })

  it('顶层 null / primitive 保留原文且不格式化', () => {
    expect(prepareImportText('null')).toEqual({ text: 'null', didFormat: false })
    expect(prepareImportText('"hi"')).toEqual({ text: '"hi"', didFormat: false })
    expect(prepareImportText('1')).toEqual({ text: '1', didFormat: false })
  })
})
```

- [x] **步骤 2：确认失败** `pnpm test:run src/composables/prepareImportText.test.ts`（模块不存在或断言失败）
- [x] **步骤 3：最小实现** 复用 `formatJsonDocument`（或 `parseConfig` + `formatConfig`）；失败则 `{ text: raw, didFormat: false }`
- [x] **步骤 4：确认通过** 同上命令 PASS

---

### 任务 2：describeRightDocExport

**对应需求：** 导出校验文案、不阻断

```ts
export type RightDocExportHint =
  { kind: 'empty' } | { kind: 'valid' } | { kind: 'invalid'; message: string }
export function describeRightDocExport(rightDoc: string): RightDocExportHint
```

非法文案：复用 `evaluateJsonDocument`。有 `errorLine` 与 `errorColumn` 时：

```ts
;`${state.errorMessage} （行 ${state.errorLine}，列 ${state.errorColumn}）`
```

（`errorMessage` 与「（行 …」之间一个空格，与 `JsonInputArea` 的 `statusDetail` 一致。）

- [x] **步骤 1：编写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { describeRightDocExport } from './describeRightDocExport'

describe('describeRightDocExport', () => {
  it('空白视为 empty', () => {
    expect(describeRightDocExport('  \n')).toEqual({ kind: 'empty' })
  })

  it('合法 JSON 为 valid', () => {
    expect(describeRightDocExport('{"a":1}')).toEqual({ kind: 'valid' })
  })

  it('非法 JSON 返回中文 message', () => {
    const hint = describeRightDocExport('{')
    expect(hint.kind).toBe('invalid')
    if (hint.kind === 'invalid') {
      expect(hint.message.length).toBeGreaterThan(0)
      expect(hint.message).not.toMatch(/invalid|error|parse/i)
    }
  })

  it('非法 JSON 在有行列时拼入行与列', () => {
    const hint = describeRightDocExport('{a')
    expect(hint.kind).toBe('invalid')
    if (hint.kind === 'invalid') {
      expect(hint.message).toMatch(/行 \d+，列 \d+/)
      expect(hint.message).not.toMatch(/invalid|error|parse/i)
    }
  })
})
```

- [x] **步骤 2：** `pnpm test:run src/composables/describeRightDocExport.test.ts` FAIL
- [x] **步骤 3：** 复用 `evaluateJsonDocument`；不要复制 `toChineseJsonParseMessage`
- [x] **步骤 4：** 同上 PASS

---

### 任务 3：useMergeWorkspace

**对应需求：** 仅改被导入侧；重导覆盖；省略文件名则清空该侧文件名

```ts
export type MergeSide = 'left' | 'right'
export const useMergeWorkspace = defineStore('mergeWorkspace', () => {
  /* ... */
})
```

行为（写死，见规格「store 行为锁定」）：

- `importSide(side, raw, fileName?)`：该侧文档 = `prepareImportText(raw).text`；该侧文件名 = `fileName ?? ''`；**另一侧文档与文件名都不改**
- `setLeftDoc` / `setRightDoc`：只改文档，不改文件名
- `clearSide(side)`：该侧文档与文件名都 `''`，另一侧不改
- 初始四字段皆 `''`；不做 persist；不存 `didFormat`

- [x] **步骤 1：失败测试**（必须 `createPinia` + `setActivePinia`；仓库尚无 store 单测）

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useMergeWorkspace } from './mergeWorkspace'

describe('useMergeWorkspace', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始两侧文档与文件名皆为空', () => {
    const store = useMergeWorkspace()
    expect(store.leftDoc).toBe('')
    expect(store.rightDoc).toBe('')
    expect(store.leftFileName).toBe('')
    expect(store.rightFileName).toBe('')
  })

  it('importSide left 写入格式化文本且不改已有 right', () => {
    const store = useMergeWorkspace()
    store.setRightDoc('keep-me')
    store.importSide('left', '{"x":1}', 't.json')
    expect(store.leftDoc).toContain('"x"')
    expect(store.rightDoc).toBe('keep-me')
    expect(store.leftFileName).toBe('t.json')
    expect(store.rightFileName).toBe('')
  })

  it('importSide right 覆盖 rightDoc', () => {
    const store = useMergeWorkspace()
    store.setRightDoc('old')
    store.importSide('right', '{"y":2}', 'p.json')
    expect(store.rightDoc).toContain('"y"')
    expect(store.rightFileName).toBe('p.json')
  })

  it('省略 fileName 时该侧文件名清空且不改另一侧', () => {
    const store = useMergeWorkspace()
    store.importSide('left', '{"a":1}', 'keep.json')
    store.importSide('right', '{"b":2}', 'other.json')
    store.importSide('left', '{"a":3}')
    expect(store.leftFileName).toBe('')
    expect(store.rightFileName).toBe('other.json')
    expect(store.leftDoc).toContain('"a"')
  })

  it('非法 JSON 导入保留原文且不改另一侧', () => {
    const store = useMergeWorkspace()
    store.setRightDoc('keep-me')
    store.importSide('left', '{a', 'bad.json')
    expect(store.leftDoc).toBe('{a')
    expect(store.rightDoc).toBe('keep-me')
    expect(store.leftFileName).toBe('bad.json')
  })

  it('setRightDoc 只改文档不改文件名', () => {
    const store = useMergeWorkspace()
    store.importSide('right', '{"y":2}', 'p.json')
    store.setRightDoc('typed')
    expect(store.rightDoc).toBe('typed')
    expect(store.rightFileName).toBe('p.json')
  })

  it('clearSide left 清空左侧文档与文件名且不改右侧', () => {
    const store = useMergeWorkspace()
    store.importSide('left', '{"x":1}', 't.json')
    store.importSide('right', '{"y":2}', 'p.json')
    store.clearSide('left')
    expect(store.leftDoc).toBe('')
    expect(store.leftFileName).toBe('')
    expect(store.rightDoc).toContain('"y"')
    expect(store.rightFileName).toBe('p.json')
  })
})
```

- [x] **步骤 2：** `pnpm test:run src/stores/mergeWorkspace.test.ts` FAIL
- [x] **步骤 3：** 最小实现 `importSide` / `setLeftDoc` / `setRightDoc` / `clearSide`；`importSide` 调用任务 1 的 `prepareImportText`
- [x] **步骤 4：** 同上 PASS

---

### 任务 4：本切片验证

- [x] `pnpm test:run src/composables/prepareImportText.test.ts src/composables/describeRightDocExport.test.ts src/stores/mergeWorkspace.test.ts`
- [x] 规格状态改为「已完成」；**不要** git commit
- [ ] 本计划移入 `plans/archive/`（**等用户确认后再归档**；已从 archive 移回 `plans/`）

---

**验证摘要：** `pnpm test:run` 本切片 3 files / 16 tests passed；`pnpm lint` exit 0；全分支审查 PASS。用户要求暂不归档。
