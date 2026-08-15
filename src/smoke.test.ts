import { describe, expect, it } from 'vitest'

describe('测试环境', () => {
  it('Vitest 与 happy-dom 可用', () => {
    expect(typeof window).toBe('object')
    expect(1 + 1).toBe(2)
  })
})
