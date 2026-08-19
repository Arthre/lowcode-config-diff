import { describe, expect, it } from 'vitest'
import { changedLineFlags, lineAtOffset } from './minimapSnapshot'

describe('lineAtOffset', () => {
  it('空文档任意偏移都在第 0 行', () => {
    expect(lineAtOffset('', 0)).toBe(0)
    expect(lineAtOffset('', 8)).toBe(0)
  })

  it('按换行累计行号', () => {
    const text = 'a\nbc\n'
    expect(lineAtOffset(text, 0)).toBe(0)
    expect(lineAtOffset(text, 2)).toBe(1)
    expect(lineAtOffset(text, 5)).toBe(2)
  })
})

describe('changedLineFlags', () => {
  it('无区间时全部为未改', () => {
    expect(changedLineFlags('a\nb\nc', [])).toEqual([false, false, false])
  })

  it('区间覆盖的行标为已改', () => {
    const text = 'aaa\nbbb\nccc'
    // "bbb" 从偏移 4 到 7
    expect(changedLineFlags(text, [{ from: 4, to: 7 }])).toEqual([false, true, false])
  })

  it('空区间 from=to 仍标记所在行', () => {
    expect(changedLineFlags('a\nb', [{ from: 2, to: 2 }])).toEqual([false, true])
  })
})
