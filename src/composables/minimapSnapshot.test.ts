import { describe, expect, it } from 'vitest'
import { conflictBandsOf } from './chunkMinimapLayout'
import {
  changedLineFlags,
  conflictBandsFromOffsetRanges,
  lineAtOffset,
  lineIndexAt,
  lineStartsOf,
} from './minimapSnapshot'

function lineAtFromText(text: string): (offset: number) => number {
  const starts = lineStartsOf(text)
  return (offset) => lineIndexAt(starts, text.length, offset)
}

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

describe('lineStartsOf / lineIndexAt', () => {
  it('按换行记录每行起点并用二分取行号', () => {
    const text = 'a\nbc\n'
    const starts = lineStartsOf(text)
    expect(starts).toEqual([0, 2, 5])
    expect(lineIndexAt(starts, text.length, 0)).toBe(0)
    expect(lineIndexAt(starts, text.length, 2)).toBe(1)
    expect(lineIndexAt(starts, text.length, 5)).toBe(2)
  })

  it('偏移落在换行符上仍属当前行', () => {
    const text = 'aa\nbb'
    const starts = lineStartsOf(text)
    expect(lineIndexAt(starts, text.length, 2)).toBe(0)
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

  it('多区间只扫一遍行起点即可标出各段', () => {
    const text = 'a\nb\nc\nd\ne'
    expect(
      changedLineFlags(text, [
        { from: 0, to: 1 },
        { from: 6, to: 7 },
      ]),
    ).toEqual([true, false, false, true, false])
  })
})

describe('conflictBandsFromOffsetRanges', () => {
  it('无区间时无标记', () => {
    expect(conflictBandsFromOffsetRanges(3, 5, [], lineAtFromText('a\nb\nc'))).toEqual([])
  })

  it('与逐行标记再收段的结果一致', () => {
    const text = 'aaa\nbbb\nccc\nddd'
    const ranges = [
      { from: 4, to: 7 },
      { from: 12, to: 15 },
    ]
    const flags = changedLineFlags(text, ranges)
    expect(
      conflictBandsFromOffsetRanges(flags.length, text.length, ranges, lineAtFromText(text)),
    ).toEqual(conflictBandsOf(flags))
  })

  it('相邻或重叠区间收成一段', () => {
    const text = 'a\nb\nc\nd'
    const ranges = [
      { from: 0, to: 1 },
      { from: 2, to: 3 },
    ]
    expect(conflictBandsFromOffsetRanges(4, text.length, ranges, lineAtFromText(text))).toEqual([
      { start: 0, end: 0.5 },
    ])
  })
})
