# M1 Core Parse & Types 实施计划

> **给 Agent 执行者：** 必须使用 [子代理驱动开发](../workflows/subagent-driven-development.md)（推荐）或 [执行计划](../workflows/executing-plans.md) 逐步实施。步骤使用 checkbox（`- [ ]`）语法跟踪。

**日期：** 2026-08-15  
**状态：** 已完成  
**关联设计：** [`.docs/specs/2026-08-15-v0.1-config-diff-merge.md`](../specs/2026-08-15-v0.1-config-diff-merge.md)（总览）、[`.docs/specs/2026-08-15-m1-core-parse.md`](../specs/2026-08-15-m1-core-parse.md)（M1）  
**目标：** 落地与 UI 无关的 `Config` 类型、`deepEqual`、`formatPath`、`parseConfig`、`formatConfig`，并用 Vitest 覆盖 M1 验收项。  
**架构：** 在 `src/core/` 按文件拆分纯函数模块；禁止依赖 Vue/Pinia/DOM；不实现 diff/merge。  
**技术栈：** TypeScript、Vitest（`pnpm test:run`）、现有 Vite 别名 `@` → `src/`

## Global Constraints

- 复用 Vue3 + TS + Vite + Vitest + UnoCSS；无理由不引入大型新依赖。
- Core **禁止**依赖 Vue / Pinia / DOM。
- 配置根：object 或 array（拒绝顶层 null / primitive）。
- 语义深相等：忽略 object key 顺序；数组顺序敏感。
- 单元测试 `describe` / `it` 说明使用中文。
- 本切片不实现 `diffConfig` / `mergeConfig`、下载、剪贴板、UI。
- 声称完成前：`pnpm test:run` 覆盖本切片通过；歧义时保持简单并回写规格。
- 未经用户明确要求不创建 git commit。

## 潜在影响清单

| 影响面            | 说明                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 新建 `src/core/*` | 当前仅有空目录占位（`array/`、`diff/`、`merge/`、`parser/`），无实现与引用；本计划改为规格约定的扁平文件，并删除无用空目录 |
| 现有页面 / store  | 不修改 `HomeView`、Pinia、路由；M1 无 UI 接线                                                                              |
| 依赖与构建        | 不改 `package.json` / lockfile；沿用现有 Vitest 配置                                                                       |
| 后续切片          | M2+ 将依赖本计划锁定的类型与函数签名；改签名须同步回写 M1 规格                                                             |

---

## 文件结构

```text
src/core/
  types.ts          # JsonPrimitive / JsonValue / Config / ParseConfigError
  equal.ts          # deepEqual
  path.ts           # formatPath
  parse.ts          # parseConfig
  format.ts         # formatConfig
  equal.test.ts
  path.test.ts
  parse.test.ts
  format.test.ts
```

删除空占位目录（若仍为空且无文件）：`src/core/array/`、`src/core/diff/`、`src/core/merge/`、`src/core/parser/`。

不新增 `src/core/index.ts`（YAGNI；调用方按需 `@/core/parse` 等导入）。

---

### 任务 1：类型与 deepEqual

**对应需求：** M1 `+ [JsonValue / Config]`、`+ [deepEqual]`；验收 5、6

**文件：**

- 创建：`src/core/types.ts`
- 创建：`src/core/equal.ts`
- 测试：`src/core/equal.test.ts`

**接口：**

- 消费：无
- 产出：
  - `type JsonPrimitive = string | number | boolean | null`
  - `type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }`
  - `type Config = { [key: string]: JsonValue } | JsonValue[]`
  - `function deepEqual(a: unknown, b: unknown): boolean`

- [x] **步骤 1：编写失败测试**

创建 `src/core/equal.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { deepEqual } from './equal'

describe('deepEqual', () => {
  it('忽略 object 键顺序时判定相等', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
  })

  it('数组顺序不同时判定不相等', () => {
    expect(deepEqual([1, 2], [2, 1])).toBe(false)
  })

  it('嵌套 object 与 null 可正确比较', () => {
    expect(deepEqual({ x: null, y: { z: 1 } }, { y: { z: 1 }, x: null })).toBe(true)
  })

  it('primitive 与类型不同时不相等', () => {
    expect(deepEqual(1, '1')).toBe(false)
    expect(deepEqual(null, undefined)).toBe(false)
  })
})
```

- [x] **步骤 2：确认失败** 运行：`pnpm test:run src/core/equal.test.ts`；预期：FAIL（模块不存在或导出缺失）

- [x] **步骤 3：编写最小实现**

创建 `src/core/types.ts`：

```ts
export type JsonPrimitive = string | number | boolean | null

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

/** 配置根：object 或 array */
export type Config = { [key: string]: JsonValue } | JsonValue[]
```

创建 `src/core/equal.ts`：

```ts
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    if (a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const aKeys = Object.keys(aObj)
    const bKeys = Object.keys(bObj)
    if (aKeys.length !== bKeys.length) return false
    return aKeys.every(
      (key) => Object.prototype.hasOwnProperty.call(bObj, key) && deepEqual(aObj[key], bObj[key]),
    )
  }

  return false
}
```

- [x] **步骤 4：确认通过** 运行：`pnpm test:run src/core/equal.test.ts`；预期：PASS

- [ ] **步骤 5：提交**（仅当用户明确要求时）

---

### 任务 2：formatPath

**对应需求：** M1 `+ [path 工具]`；根 path `[]` → `(root)`

**文件：**

- 创建：`src/core/path.ts`
- 测试：`src/core/path.test.ts`

**接口：**

- 消费：无
- 产出：`function formatPath(path: string[]): string`

- [x] **步骤 1：编写失败测试**

创建 `src/core/path.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { formatPath } from './path'

describe('formatPath', () => {
  it('空 path 展示为 (root)', () => {
    expect(formatPath([])).toBe('(root)')
  })

  it('多段 path 用点号拼接', () => {
    expect(formatPath(['form', 'name', 'required'])).toBe('form.name.required')
  })

  it('单段 path 原样返回', () => {
    expect(formatPath(['table'])).toBe('table')
  })
})
```

- [x] **步骤 2：确认失败** 运行：`pnpm test:run src/core/path.test.ts`；预期：FAIL

- [x] **步骤 3：编写最小实现**

创建 `src/core/path.ts`：

```ts
export function formatPath(path: string[]): string {
  if (path.length === 0) return '(root)'
  return path.join('.')
}
```

说明：展示用拼接；**不以**含 `.` 的字符串反解析为权威 path（规格要求）。

- [x] **步骤 4：确认通过** 运行：`pnpm test:run src/core/path.test.ts`；预期：PASS

- [ ] **步骤 5：提交**（仅当用户明确要求时）

---

### 任务 3：parseConfig

**对应需求：** M1 `+ [parseConfig]`、`~ [顶层约束]`；验收 1–4

**文件：**

- 修改：`src/core/types.ts`（追加 `ParseConfigError`）
- 创建：`src/core/parse.ts`
- 测试：`src/core/parse.test.ts`

**接口：**

- 消费：`Config`（`./types`）
- 产出：
  - `class ParseConfigError extends Error { readonly line?: number; readonly column?: number }`
  - `function parseConfig(input: string): Config`

- [x] **步骤 1：编写失败测试**

创建 `src/core/parse.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { ParseConfigError, parseConfig } from './parse'

describe('parseConfig', () => {
  it('解析合法 object 为 Config', () => {
    expect(parseConfig('{"a":1}')).toEqual({ a: 1 })
  })

  it('解析合法 array（含空数组）为 Config', () => {
    expect(parseConfig('[]')).toEqual([])
    expect(parseConfig('[1,{"x":true}]')).toEqual([1, { x: true }])
  })

  it('非法 JSON 抛出 ParseConfigError', () => {
    expect(() => parseConfig('{')).toThrow(ParseConfigError)
  })

  it('顶层 null 抛出 ParseConfigError', () => {
    expect(() => parseConfig('null')).toThrow(ParseConfigError)
  })

  it('顶层 primitive 抛出 ParseConfigError', () => {
    expect(() => parseConfig('"hi"')).toThrow(ParseConfigError)
    expect(() => parseConfig('1')).toThrow(ParseConfigError)
    expect(() => parseConfig('true')).toThrow(ParseConfigError)
  })

  it('错误信息尽量带行号列号（非法 JSON）', () => {
    try {
      parseConfig('{\n  "a": }')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ParseConfigError)
      const parseError = error as ParseConfigError
      expect(parseError.message.length).toBeGreaterThan(0)
      // 能算出位置则应有行/列；算不出也不应静默成功
      if (parseError.line !== undefined) {
        expect(parseError.line).toBeGreaterThanOrEqual(1)
      }
    }
  })
})
```

- [x] **步骤 2：确认失败** 运行：`pnpm test:run src/core/parse.test.ts`；预期：FAIL

- [x] **步骤 3：编写最小实现**

在 `src/core/types.ts` 追加：

```ts
export class ParseConfigError extends Error {
  readonly line?: number
  readonly column?: number

  constructor(message: string, options?: { line?: number; column?: number }) {
    super(message)
    this.name = 'ParseConfigError'
    this.line = options?.line
    this.column = options?.column
  }
}
```

创建 `src/core/parse.ts`：

```ts
import type { Config, JsonValue } from './types'
import { ParseConfigError } from './types'

export { ParseConfigError }

function positionToLineColumn(source: string, position: number): { line: number; column: number } {
  const safePosition = Math.max(0, Math.min(position, source.length))
  const before = source.slice(0, safePosition)
  const lines = before.split('\n')
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 }
}

function tryReadJsonPosition(message: string): number | undefined {
  const match = /position\s+(\d+)/i.exec(message)
  if (!match) return undefined
  return Number(match[1])
}

function isPlainObject(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseConfig(input: string): Config {
  let parsed: unknown
  try {
    parsed = JSON.parse(input) as unknown
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON 解析失败'
    const position = tryReadJsonPosition(message)
    if (position !== undefined) {
      const { line, column } = positionToLineColumn(input, position)
      throw new ParseConfigError(message, { line, column })
    }
    throw new ParseConfigError(message)
  }

  if (parsed === null || typeof parsed !== 'object') {
    throw new ParseConfigError('配置顶层必须是 object 或 array')
  }

  return parsed as Config
}

export function isConfig(value: unknown): value is Config {
  return Array.isArray(value) || isPlainObject(value)
}
```

- [x] **步骤 4：确认通过** 运行：`pnpm test:run src/core/parse.test.ts`；预期：PASS

- [ ] **步骤 5：提交**（仅当用户明确要求时）

---

### 任务 4：formatConfig

**对应需求：** M1 `+ [formatConfig]`；验收 7

**文件：**

- 创建：`src/core/format.ts`
- 测试：`src/core/format.test.ts`

**接口：**

- 消费：`Config`、`parseConfig`、`deepEqual`
- 产出：`function formatConfig(config: Config): string`

- [x] **步骤 1：编写失败测试**

创建 `src/core/format.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { deepEqual } from './equal'
import { formatConfig } from './format'
import { parseConfig } from './parse'

describe('formatConfig', () => {
  it('object 使用缩进 2 的可读 JSON', () => {
    expect(formatConfig({ a: 1 })).toBe('{\n  "a": 1\n}')
  })

  it('array 使用缩进 2 的可读 JSON', () => {
    expect(formatConfig([1, 2])).toBe('[\n  1,\n  2\n]')
  })

  it('format 后再 parse 与原 Config 语义相等', () => {
    const config = { b: [null, { z: true }], a: 1 }
    const roundTrip = parseConfig(formatConfig(config))
    expect(deepEqual(roundTrip, config)).toBe(true)
  })
})
```

- [x] **步骤 2：确认失败** 运行：`pnpm test:run src/core/format.test.ts`；预期：FAIL

- [x] **步骤 3：编写最小实现**

创建 `src/core/format.ts`：

```ts
import type { Config } from './types'

export function formatConfig(config: Config): string {
  return JSON.stringify(config, null, 2)
}
```

- [x] **步骤 4：确认通过** 运行：`pnpm test:run src/core/format.test.ts`；预期：PASS

- [ ] **步骤 5：提交**（仅当用户明确要求时）

---

### 任务 5：清理占位目录并跑全量 M1 验收

**对应需求：** M1 验收清单 1–8；总览「Core 禁止依赖 Vue」自检

**文件：**

- 删除（若仍为空）：`src/core/array/`、`src/core/diff/`、`src/core/merge/`、`src/core/parser/`
- 不修改 UI / `package.json`

**接口：** 无新增；汇总任务 1–4 产出

- [x] **步骤 1：删除空占位目录** 若目录内无文件则删除，避免与扁平 `src/core/*.ts` 并存造成误导

- [x] **步骤 2：全量单测** 运行：`pnpm test:run src/core`；预期：上述 spec 全部 PASS；`src/smoke.test.ts` 仍可通过（可顺带 `pnpm test:run`）

- [x] **步骤 3：自检无 Vue 依赖** 确认 `src/core/**/*.ts`（不含 spec）无 `vue` / `pinia` / `document` / `window` 导入

- [x] **步骤 4：回写规格状态**
  - 将 [`.docs/specs/2026-08-15-m1-core-parse.md`](../specs/2026-08-15-m1-core-parse.md) 状态改为「实施中」或完成后「已完成」；关联计划指向本文件
  - 总览切片表中 M1 状态同步为「实施中」/「已完成」

- [ ] **步骤 5：提交**（仅当用户明确要求时）

---

## Spec 覆盖自检

| Spec 项                                    | 任务         |
| ------------------------------------------ | ------------ |
| JsonValue / Config（根 object\|array）     | 任务 1、3    |
| deepEqual                                  | 任务 1       |
| formatPath / `(root)`                      | 任务 2       |
| parseConfig + 非法/顶层拒绝 + 行列尽量提供 | 任务 3       |
| formatConfig + 往返                        | 任务 4       |
| 中文单测、pnpm test:run                    | 任务 1–5     |
| 非目标：无 diff/merge/UI/DOM               | 全任务不实现 |
| 总览：先 M1、Core 解耦                     | 本计划范围   |

无占位符；签名在任务间一致：`Config`、`deepEqual`、`formatPath`、`parseConfig`、`formatConfig`、`ParseConfigError`。

---

## 完成后

M1 验收通过后，再确认 M2 规格并编写 `.docs/plans/2026-08-15-m2-core-diff.md`（不在本计划范围）。
