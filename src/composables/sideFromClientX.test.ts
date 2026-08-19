import { describe, expect, it } from 'vitest'
import { sideFromClientX } from './sideFromClientX'

const left = { left: 0, right: 100 }
const right = { left: 120, right: 220 }

describe('sideFromClientX', () => {
  it('中线以左为参考栏', () => {
    expect(sideFromClientX(50, left, right)).toBe('left')
    expect(sideFromClientX(109, left, right)).toBe('left')
  })

  it('中线及以右为结果栏', () => {
    expect(sideFromClientX(110, left, right)).toBe('right')
    expect(sideFromClientX(180, left, right)).toBe('right')
  })
})
