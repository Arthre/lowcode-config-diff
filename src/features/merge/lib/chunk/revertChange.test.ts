import { describe, expect, it } from 'vitest'
import { chunkRevertChange } from './revertChange'

describe('chunkRevertChange', () => {
  it('a-to-b 把参考块写入结果并补换行', () => {
    const source = 'aaa\nbbb\nccc'
    const dest = 'aaa\nzzz\nccc'
    const change = chunkRevertChange(
      'a-to-b',
      { fromA: 4, toA: 8, fromB: 4, toB: 8 },
      source,
      dest.length,
    )
    expect(change).toEqual({ from: 4, to: 8, insert: 'bbb\n' })
    const next = dest.slice(0, change.from) + change.insert + dest.slice(change.to)
    expect(next).toBe('aaa\nbbb\nccc')
  })

  it('b-to-a 把结果块写回参考并补换行', () => {
    const source = 'aaa\nzzz\nccc'
    const dest = 'aaa\nbbb\nccc'
    const change = chunkRevertChange(
      'b-to-a',
      { fromA: 4, toA: 8, fromB: 4, toB: 8 },
      source,
      dest.length,
    )
    expect(change).toEqual({ from: 4, to: 8, insert: 'zzz\n' })
    const next = dest.slice(0, change.from) + change.insert + dest.slice(change.to)
    expect(next).toBe('aaa\nzzz\nccc')
  })

  it('空区间 from=to 时插入为空且不补换行', () => {
    expect(
      chunkRevertChange('a-to-b', { fromA: 3, toA: 3, fromB: 3, toB: 7 }, 'ab\ncd', 7),
    ).toEqual({ from: 3, to: 7, insert: '' })
  })

  it('贴文末时 to 不超过目标长度', () => {
    const change = chunkRevertChange('a-to-b', { fromA: 0, toA: 3, fromB: 0, toB: 2 }, 'xy\n', 2)
    expect(change.to).toBe(2)
    expect(change.insert).toBe('xy\n')
  })
})
