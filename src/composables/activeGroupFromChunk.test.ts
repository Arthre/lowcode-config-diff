import { describe, expect, it } from 'vitest'
import { activeGroupIdFromChunk } from './activeGroupFromChunk'

const mixedOffsets = [
  { id: 'added-early', offset: 10, kind: 'added' as const },
  { id: 'removed-late', offset: 80, kind: 'removed' as const },
  { id: 'modified-mid', offset: 40, kind: 'modified' as const },
]

describe('activeGroupIdFromChunk', () => {
  it('删除块只在 removed 组里按 fromA 取最后一个未越过的 id', () => {
    expect(activeGroupIdFromChunk({ fromA: 90, toA: 100, fromB: 30, toB: 30 }, mixedOffsets)).toBe(
      'removed-late',
    )
  })

  it('非删除块只在非 removed 组里按 fromB 取最后一个未越过的 id', () => {
    expect(activeGroupIdFromChunk({ fromA: 5, toA: 5, fromB: 45, toB: 60 }, mixedOffsets)).toBe(
      'modified-mid',
    )
  })

  it('找不到未越过的同侧组时返回空串', () => {
    expect(activeGroupIdFromChunk({ fromA: 1, toA: 2, fromB: 0, toB: 0 }, mixedOffsets)).toBe('')
    expect(activeGroupIdFromChunk({ fromA: 0, toA: 0, fromB: 5, toB: 8 }, mixedOffsets)).toBe('')
  })

  it('偏移乱序时仍按 offset 排序再取最后一个未越过的 id', () => {
    const shuffled = [
      { id: 'removed-late', offset: 80, kind: 'removed' as const },
      { id: 'removed-early', offset: 20, kind: 'removed' as const },
    ]
    expect(activeGroupIdFromChunk({ fromA: 50, toA: 70, fromB: 0, toB: 0 }, shuffled)).toBe(
      'removed-early',
    )
  })
})
