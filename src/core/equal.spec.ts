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
