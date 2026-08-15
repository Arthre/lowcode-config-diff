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

  it('写入 PROD 独有对象/数组时结果与输入无共享引用', () => {
    const test = { a: 1 }
    const prod = { a: 1, extra: { nested: [1, 2] }, list: [9] }
    const leaves = diffConfig(test, prod) // 默认 side：removed → prod
    const result = mergeConfig(test, prod, leaves) as {
      a: number
      extra: { nested: number[] }
      list: number[]
    }
    expect(result.extra).not.toBe(prod.extra)
    expect(result.extra.nested).not.toBe(prod.extra.nested)
    expect(result.list).not.toBe(prod.list)
    result.extra.nested.push(3)
    expect(prod.extra.nested).toEqual([1, 2])
  })
})
