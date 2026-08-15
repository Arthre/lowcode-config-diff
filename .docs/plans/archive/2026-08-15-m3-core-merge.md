# M3 Core Merge 实施计划

> **给 Agent 执行者：** 必须使用 [子代理驱动开发](../workflows/subagent-driven-development.md)（推荐）或 [执行计划](../workflows/executing-plans.md) 逐步实施。步骤使用 checkbox（`- [ ]`）语法跟踪。

**日期：** 2026-08-15  
**状态：** 已完成  
**关联设计：** [`.docs/specs/2026-08-15-v0.1-config-diff-merge.md`](../specs/2026-08-15-v0.1-config-diff-merge.md)（总览）、[`.docs/specs/2026-08-15-m3-core-merge.md`](../specs/2026-08-15-m3-core-merge.md)（M3）  
**目标：** 按每叶 `side` 从 TEST / PROD 组装最终 `Config`；无 UI、无下载。  
**架构：** 单一 `merge.ts`：内部 `deepClone` + 按 path 设值/删除；脚手架为 `deepClone(testConfig)`，再对 `side === 'prod'` 叶子套用 PROD 语义；依赖 M2 `DiffItem`。  
**技术栈：** TypeScript、Vitest（`pnpm test:run`）、路径别名 `@` → `src/`

## Global Constraints

- 复用 Vue3 + TS + Vite + Vitest + UnoCSS；无理由不引入大型新依赖。
- Core **禁止**依赖 Vue / Pinia / DOM。
- 选边语义：

| type     | side=`test`       | side=`prod`       |
| -------- | ----------------- | ----------------- |
| modified | 写入 testValue    | 写入 prodValue    |
| added    | 写入 testValue    | 不写入（删 path） |
| removed  | 不写入（删 path） | 写入 prodValue    |

- 三种整体结果：默认 side → TEST∪PROD独有；全 `test` → ≡ TEST；全 `prod` → ≡ PROD。
- Apply 顺序：写入类按 path 深度升序；删除类按 path 深度降序。
- 父 path 异常：抛出明确错误（Error，中文或英文信息均可，须可读）。
- 不修改传入的 test / prod；结果为独立对象。
- 不把 `downloadConfig` 放进 core。
- V0.1 要求调用方传入完整 diff 叶子列表；`side === 'test'` 在脚手架下多为 no-op。
- 单元测试 `describe` / `it` 说明使用中文。
- 未经用户明确要求不创建 git commit。
- **文件收拢：** 仅 `merge.ts` + `merge.test.ts`；`deepClone` / path 设删为模块内私有函数，不另建 `clone.ts` / `path-set.ts`。

## 潜在影响清单（已确认）

| 影响面                                     | 说明                                                        |
| ------------------------------------------ | ----------------------------------------------------------- |
| 新建 `src/core/merge.ts` + `merge.test.ts` | `mergeConfig`                                               |
| 依赖 M2                                    | 消费 `DiffItem` / `diffConfig`（测试可构造叶子或调用 diff） |
| UI / 下载 / 依赖                           | 不修改                                                      |

**前置：** M2 计划任务已完成且 `diffConfig` / `DiffItem` 可用。

---

## 文件结构

```text
src/core/
  merge.ts        # mergeConfig + 内部 deepClone / setPath / deletePath
  merge.test.ts   # 本切片全部单测
```

不新增其它 core 文件。

---

### 任务 1：mergeConfig（验收全覆盖）

**对应需求：** M3 `+ [mergeConfig]`、`+ [选边语义]`、`+ [三种整体结果]`、`+ [隔离]`；验收 1–6

**文件：**

- 创建：`src/core/merge.ts`
- 测试：`src/core/merge.test.ts`

**接口：**

- 消费：`Config`、`DiffItem`、`JsonValue`（`./types`）；测试中可用 `diffConfig`（`./diff`）、`deepEqual`（`./equal`）
- 产出：`function mergeConfig(testConfig: Config, prodConfig: Config, leaves: DiffItem[]): Config`

**实现要点（全部留在 `merge.ts`）：**

1. `result = deepClone(testConfig)`（结构化克隆；可用 `JSON.parse(JSON.stringify(...))` 因 Config 为纯 JSON）。
2. 将 `leaves` 分为：
   - **删除类**：`(type==='added' && side==='prod') || (type==='removed' && side==='test')`
   - **写入类**：其余需要写入的项（modified 任一侧；added+test；removed+prod）
3. 写入类按 `path.length` **升序** 执行 set；删除类按 `path.length` **降序** 执行 delete。
4. `setPath` / `deletePath`：根 path `[]` 表示替换整个 result（返回新 Config）；非空 path 沿 object 导航；中间节点缺失或非 object 时抛错。
5. 写入值：modified → 按 side 取 testValue/prodValue；added+test → testValue；removed+prod → prodValue。
6. 不修改入参 test/prod。

- [x] **步骤 1：编写失败测试**

创建 `src/core/merge.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { diffConfig } from './diff'
import { deepEqual } from './equal'
import { mergeConfig } from './merge'
import type { DiffItem } from './types'

function allSides(leaves: DiffItem[], side: DiffItem['side']): DiffItem[] {
  return leaves.map((leaf) => ({ ...leaf, side }))
}

describe('mergeConfig', () => {
  it('默认 side 结果 deepEqual「TEST ∪ 仅 PROD 有」', () => {
    const test = { shared: 't', onlyTest: 1, nest: { x: 1 } }
    const prod = { shared: 'p', onlyProd: 2, nest: { x: 2 } }
    const leaves = diffConfig(test, prod)
    const result = mergeConfig(test, prod, leaves)

    // 冲突取 TEST；仅 PROD 有保留；仅 TEST 有保留
    expect(deepEqual(result, { shared: 't', onlyTest: 1, onlyProd: 2, nest: { x: 1 } })).toBe(true)
  })

  it('全部叶子 side=test 时结果 deepEqual TEST', () => {
    const test = { a: 1, b: { c: true } }
    const prod = { a: 9, b: { c: false }, d: 3 }
    const leaves = allSides(diffConfig(test, prod), 'test')
    expect(deepEqual(mergeConfig(test, prod, leaves), test)).toBe(true)
  })

  it('全部叶子 side=prod 时结果 deepEqual PROD', () => {
    const test = { a: 1, b: { c: true } }
    const prod = { a: 9, b: { c: false }, d: 3 }
    const leaves = allSides(diffConfig(test, prod), 'prod')
    expect(deepEqual(mergeConfig(test, prod, leaves), prod)).toBe(true)
  })

  it('部分改边仅对应 path 体现另一方', () => {
    const test = { a: 1, b: 2, c: 3 }
    const prod = { a: 10, b: 20, d: 40 }
    const leaves = diffConfig(test, prod).map((leaf) => {
      // 仅把 modified a 改选 prod；其余保持默认
      if (deepEqual(leaf.path, ['a'])) return { ...leaf, side: 'prod' as const }
      return leaf
    })
    const result = mergeConfig(test, prod, leaves)
    expect(result).toEqual({ a: 10, b: 2, c: 3, d: 40 })
  })

  it('added 选 prod 删除该 path；removed 选 test 删除该 path', () => {
    const test = { onlyTest: 1, both: 't' }
    const prod = { onlyProd: 2, both: 'p' }
    const leaves = diffConfig(test, prod).map((leaf) => {
      if (leaf.type === 'added') return { ...leaf, side: 'prod' as const }
      if (leaf.type === 'removed') return { ...leaf, side: 'test' as const }
      return { ...leaf, side: 'test' as const }
    })
    const result = mergeConfig(test, prod, leaves)
    expect(deepEqual(result, { both: 't' })).toBe(true)
  })

  it('根为 array 时可整段按 side 替换', () => {
    const test = [1, 2] as const
    const prod = [9, 8] as const
    const testConfig = [...test]
    const prodConfig = [...prod]
    const leaves = diffConfig(testConfig, prodConfig)
    expect(deepEqual(mergeConfig(testConfig, prodConfig, leaves), testConfig)).toBe(true)
    expect(
      deepEqual(mergeConfig(testConfig, prodConfig, allSides(leaves, 'prod')), prodConfig),
    ).toBe(true)
  })

  it('不修改原始 test / prod；结果为独立对象', () => {
    const test = { a: { b: 1 }, list: [1] }
    const prod = { a: { b: 2 }, list: [9] }
    const testSnap = JSON.stringify(test)
    const prodSnap = JSON.stringify(prod)
    const leaves = diffConfig(test, prod)
    const result = mergeConfig(test, prod, leaves)
    expect(JSON.stringify(test)).toBe(testSnap)
    expect(JSON.stringify(prod)).toBe(prodSnap)
    expect(result).not.toBe(test)
    expect(result).not.toBe(prod)
    // 改结果不影响输入
    ;(result as { a: { b: number } }).a.b = 999
    expect(test.a.b).toBe(1)
  })
})
```

- [x] **步骤 2：确认失败** 运行：`pnpm test:run src/core/merge.test.ts`；预期：FAIL

- [x] **步骤 3：编写最小实现**

创建 `src/core/merge.ts`：

```ts
import type { Config, DiffItem, JsonValue } from './types'

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isPlainObject(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDeleteLeaf(leaf: DiffItem): boolean {
  return (
    (leaf.type === 'added' && leaf.side === 'prod') ||
    (leaf.type === 'removed' && leaf.side === 'test')
  )
}

function valueForWrite(leaf: DiffItem): JsonValue {
  if (leaf.type === 'modified') {
    return (leaf.side === 'test' ? leaf.testValue : leaf.prodValue) as JsonValue
  }
  if (leaf.type === 'added') {
    return leaf.testValue as JsonValue
  }
  // removed + prod
  return leaf.prodValue as JsonValue
}

function setAtPath(root: Config, path: string[], value: JsonValue): Config {
  if (path.length === 0) {
    if (Array.isArray(value) || isPlainObject(value)) {
      return deepClone(value as Config)
    }
    throw new Error('根 path 写入值必须是 object 或 array')
  }

  let cursor: JsonValue = root as JsonValue
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!
    if (!isPlainObject(cursor) || !Object.prototype.hasOwnProperty.call(cursor, key)) {
      throw new Error(`无法写入 path：中间节点缺失（${path.slice(0, i + 1).join('.')}）`)
    }
    const next = cursor[key]
    if (!isPlainObject(next) && !Array.isArray(next)) {
      throw new Error(`无法写入 path：中间节点不是容器（${path.slice(0, i + 1).join('.')}）`)
    }
    cursor = next
  }

  const last = path[path.length - 1]!
  if (Array.isArray(cursor)) {
    const index = Number(last)
    if (!Number.isInteger(index) || index < 0 || index >= cursor.length) {
      throw new Error(`无法写入 path：非法数组下标（${path.join('.')}）`)
    }
    cursor[index] = value
    return root
  }

  if (!isPlainObject(cursor)) {
    throw new Error(`无法写入 path：父节点无效（${path.join('.')}）`)
  }
  cursor[last] = value
  return root
}

function deleteAtPath(root: Config, path: string[]): Config {
  if (path.length === 0) {
    throw new Error('不能删除根 path')
  }

  let cursor: JsonValue = root as JsonValue
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!
    if (!isPlainObject(cursor) || !Object.prototype.hasOwnProperty.call(cursor, key)) {
      throw new Error(`无法删除 path：中间节点缺失（${path.slice(0, i + 1).join('.')}）`)
    }
    const next = cursor[key]
    if (!isPlainObject(next) && !Array.isArray(next)) {
      throw new Error(`无法删除 path：中间节点不是容器（${path.slice(0, i + 1).join('.')}）`)
    }
    cursor = next
  }

  const last = path[path.length - 1]!
  if (Array.isArray(cursor)) {
    const index = Number(last)
    if (!Number.isInteger(index) || index < 0 || index >= cursor.length) {
      throw new Error(`无法删除 path：非法数组下标（${path.join('.')}）`)
    }
    cursor.splice(index, 1)
    return root
  }

  if (!isPlainObject(cursor)) {
    throw new Error(`无法删除 path：父节点无效（${path.join('.')}）`)
  }
  delete cursor[last]
  return root
}

export function mergeConfig(testConfig: Config, prodConfig: Config, leaves: DiffItem[]): Config {
  void prodConfig // 值来自 leaf.*Value；保留参数以匹配产品 API
  let result = deepClone(testConfig)

  const writes = leaves.filter((leaf) => !isDeleteLeaf(leaf) && leaf.side === 'prod')
  // side===test 在 TEST 脚手架上为 no-op，跳过即可
  const deletes = leaves.filter((leaf) => isDeleteLeaf(leaf))

  writes.sort((a, b) => a.path.length - b.path.length)
  deletes.sort((a, b) => b.path.length - a.path.length)

  for (const leaf of writes) {
    result = setAtPath(result, leaf.path, valueForWrite(leaf))
  }
  for (const leaf of deletes) {
    result = deleteAtPath(result, leaf.path)
  }

  return result
}
```

说明：默认 side 下 `removed` 为 `prod`（写入类）、`added`/`modified` 为 `test`（no-op），故默认合并 ≡ TEST ∪ 仅 PROD 有。全 prod 时 added 进删除、removed/modified 进写入。

- [x] **步骤 4：确认通过** 运行：`pnpm test:run src/core/merge.test.ts`；预期：PASS

- [ ] **步骤 5：提交**（仅当用户明确要求时）

---

### 任务 2：M3 收尾验收与文档回写

**对应需求：** M3 验收清单 1–6

**文件：**

- 修改：`.docs/specs/2026-08-15-m3-core-merge.md`（状态 → 已完成）
- 修改：`.docs/specs/2026-08-15-v0.1-config-diff-merge.md`（切片表 M3 → 已完成）
- 修改：`.docs/core/README.md`（补充 `merge.ts`）

**接口：** 无新增

- [x] **步骤 1：全量 Core 单测** 运行：`pnpm test:run src/core`；预期：M1–M3 全部 PASS

- [x] **步骤 2：自检** `merge.ts` 无 Vue/Pinia/DOM；无 `downloadConfig`

- [x] **步骤 3：回写文档** 更新规格状态与 Core 活文档；本计划完成后移入 `plans/archive/`

- [ ] **步骤 4：提交**（仅当用户明确要求时）

---

## Spec 覆盖自检

| Spec 项                         | 任务                                            |
| ------------------------------- | ----------------------------------------------- |
| mergeConfig(test, prod, leaves) | 任务 1                                          |
| 选边 apply 表                   | 任务 1                                          |
| 三种整体结果                    | 任务 1                                          |
| 输入隔离                        | 任务 1                                          |
| Apply 顺序 / 父 path 错误       | 任务 1 实现要点（异常路径可在遇真实失败时补测） |
| 非目标：无 UI/下载/三方         | 全任务不实现                                    |
| 文件收拢：仅 merge.ts           | 任务 1–2                                        |

无占位符；与 M2 `DiffItem.side` 一致。

---

## 完成后

归档本计划；Core V0.1 Diff/Merge 引擎完成，可推进 M4 UI。
