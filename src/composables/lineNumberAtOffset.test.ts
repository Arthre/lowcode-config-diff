import { describe, expect, it } from 'vitest'
import { lineNumberAtOffset } from './lineNumberAtOffset'

describe('lineNumberAtOffset', () => {
  it('空串任意 offset 返回 1', () => {
    expect(lineNumberAtOffset('', 0)).toBe(1)
    expect(lineNumberAtOffset('', 5)).toBe(1)
    expect(lineNumberAtOffset('', -3)).toBe(1)
  })

  it('offset 0 返回第 1 行', () => {
    expect(lineNumberAtOffset('hello', 0)).toBe(1)
  })

  it('跨多行时按偏移定位行号', () => {
    expect(lineNumberAtOffset('a\nb\nc', 4)).toBe(3)
  })

  it('负 offset 夹取到第 1 行', () => {
    expect(lineNumberAtOffset('a\nb', -1)).toBe(1)
  })

  it('超过 source.length 夹取到末行', () => {
    expect(lineNumberAtOffset('a\nb', 999)).toBe(2)
  })
})
