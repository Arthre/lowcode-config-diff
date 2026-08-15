import { describe, expect, it } from 'vitest'
import { deepEqual } from './equal'
import { diffConfig } from './diff'
import type { DiffItem, DiffSide } from './types'

function byPath(items: DiffItem[], path: string[]): DiffItem | undefined {
  return items.find((item) => deepEqual(item.path, path))
}

function expectDefaultSide(item: DiffItem): void {
  const expected: DiffSide = item.type === 'removed' ? 'prod' : 'test'
  expect(item.side).toBe(expected)
}

describe('diffConfig', () => {
  it('完全相同返回空列表', () => {
    const config = { a: 1, b: { c: true } }
    expect(diffConfig(config, { b: { c: true }, a: 1 })).toEqual([])
  })

  it('根为 object 时正确分类 added / removed / modified', () => {
    const test = { keep: 1, onlyTest: 2, both: 't' }
    const prod = { keep: 1, onlyProd: 3, both: 'p' }
    const items = diffConfig(test, prod)

    const added = byPath(items, ['onlyTest'])
    expect(added?.type).toBe('added')
    expect(added?.testValue).toBe(2)
    expect(added?.prodValue).toBeUndefined()
    expectDefaultSide(added!)

    const removed = byPath(items, ['onlyProd'])
    expect(removed?.type).toBe('removed')
    expect(removed?.prodValue).toBe(3)
    expect(removed?.testValue).toBeUndefined()
    expectDefaultSide(removed!)

    const modified = byPath(items, ['both'])
    expect(modified?.type).toBe('modified')
    expect(modified?.testValue).toBe('t')
    expect(modified?.prodValue).toBe('p')
    expectDefaultSide(modified!)

    expect(byPath(items, ['keep'])).toBeUndefined()
    expect(items).toHaveLength(3)
  })

  it('根均为 array 且内容不同时在 path [] 产出整段 modified', () => {
    const items = diffConfig([1, 2], [1, 3])
    expect(items).toHaveLength(1)
    expect(items[0]?.path).toEqual([])
    expect(items[0]?.type).toBe('modified')
    expect(items[0]?.arrayMode).toBe('whole')
    expect(items[0]?.testValue).toEqual([1, 2])
    expect(items[0]?.prodValue).toEqual([1, 3])
    expectDefaultSide(items[0]!)
  })

  it('根类型不同（object↔array）时在 path [] 产出类型变迁 modified', () => {
    const items = diffConfig({ a: 1 }, [1])
    expect(items).toHaveLength(1)
    expect(items[0]?.path).toEqual([])
    expect(items[0]?.type).toBe('modified')
    expect(items[0]?.testValue).toEqual({ a: 1 })
    expect(items[0]?.prodValue).toEqual([1])
    expectDefaultSide(items[0]!)
  })

  it('深层 object 只产出最小叶子 Diff', () => {
    const test = { form: { name: { required: true, label: 'A' } } }
    const prod = { form: { name: { required: false, label: 'A' } } }
    const items = diffConfig(test, prod)
    expect(items).toHaveLength(1)
    expect(items[0]?.path).toEqual(['form', 'name', 'required'])
    expect(items[0]?.type).toBe('modified')
    expect(items[0]?.testValue).toBe(true)
    expect(items[0]?.prodValue).toBe(false)
  })

  it('string / number / boolean / null 修改可检出', () => {
    const items = diffConfig(
      { s: 'a', n: 1, b: true, z: null as null },
      { s: 'b', n: 2, b: false, z: 0 },
    )
    expect(byPath(items, ['s'])?.type).toBe('modified')
    expect(byPath(items, ['n'])?.type).toBe('modified')
    expect(byPath(items, ['b'])?.type).toBe('modified')
    expect(byPath(items, ['z'])?.type).toBe('modified')
  })

  it('双方均为 null 无 Diff；缺 key 与 null 区分 added/removed', () => {
    expect(diffConfig({ a: null }, { a: null })).toEqual([])

    const addedNull = diffConfig({ a: null }, {})
    expect(byPath(addedNull, ['a'])?.type).toBe('added')
    expect(byPath(addedNull, ['a'])?.testValue).toBeNull()

    const removedNull = diffConfig({}, { a: null })
    expect(byPath(removedNull, ['a'])?.type).toBe('removed')
    expect(byPath(removedNull, ['a'])?.prodValue).toBeNull()
  })

  it('空 object / 空 array 与子路径数组整段比较', () => {
    expect(diffConfig({}, {})).toEqual([])
    expect(diffConfig([], [])).toEqual([])

    const items = diffConfig({ list: [1] }, { list: [2] })
    expect(items).toHaveLength(1)
    expect(items[0]?.path).toEqual(['list'])
    expect(items[0]?.type).toBe('modified')
    expect(items[0]?.arrayMode).toBe('whole')
  })

  it('对象数组不按 index 误匹配（整段 diff）', () => {
    const test = {
      rows: [
        { id: 'a', v: 1 },
        { id: 'b', v: 2 },
      ],
    }
    const prod = {
      rows: [
        { id: 'b', v: 2 },
        { id: 'a', v: 1 },
      ],
    }
    const items = diffConfig(test, prod)
    expect(items).toHaveLength(1)
    expect(items[0]?.path).toEqual(['rows'])
    expect(items[0]?.arrayMode).toBe('whole')
    expect(items[0]?.type).toBe('modified')
    // 不得出现 rows.0 / rows.1 叶子
    expect(items.every((item) => item.path.length === 1)).toBe(true)
  })

  it('默认 side：modified/added 为 test，removed 为 prod', () => {
    const items = diffConfig({ a: 1, b: 2 }, { a: 9, c: 3 })
    for (const item of items) {
      expectDefaultSide(item)
    }
  })

  it('不修改输入对象', () => {
    const test = { a: { b: 1 }, list: [1, 2] }
    const prod = { a: { b: 2 }, list: [1, 3] }
    const testSnap = JSON.stringify(test)
    const prodSnap = JSON.stringify(prod)
    diffConfig(test, prod)
    expect(JSON.stringify(test)).toBe(testSnap)
    expect(JSON.stringify(prod)).toBe(prodSnap)
  })

  it('每条 DiffItem 含唯一 id', () => {
    const items = diffConfig({ a: 1, b: 2 }, { a: 9, c: 3 })
    const ids = items.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.length > 0)).toBe(true)
  })
})
