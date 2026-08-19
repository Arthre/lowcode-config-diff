import { describe, expect, it } from 'vitest'
import {
  changedLineFlags,
  lineAtOffset,
  minimapCellsOf,
  snapshotLineIndex,
} from './minimapSnapshot'

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

describe('minimapCellsOf', () => {
  it('空白不占色块', () => {
    expect(minimapCellsOf('  {')).toEqual([{ from: 2, to: 3, role: 'punct' }])
  })

  it('字符串、数字与标点分开', () => {
    expect(minimapCellsOf('"a": 12,')).toEqual([
      { from: 0, to: 3, role: 'string' },
      { from: 3, to: 4, role: 'punct' },
      { from: 5, to: 7, role: 'number' },
      { from: 7, to: 8, role: 'punct' },
    ])
  })

  it('转义引号不结束字符串', () => {
    expect(minimapCellsOf('"a\\"b"')).toEqual([{ from: 0, to: 6, role: 'string' }])
  })
})

describe('snapshotLineIndex', () => {
  it('把画布行映射到源文档行', () => {
    expect(snapshotLineIndex(0, 10, 100)).toBe(0)
    expect(snapshotLineIndex(9, 10, 100)).toBe(90)
  })

  it('无文档行时返回 0', () => {
    expect(snapshotLineIndex(3, 10, 0)).toBe(0)
  })
})
