import { describe, expect, it } from 'vitest'
import {
  chunkKindMarker,
  chunkKindSummaryText,
  countChunkKinds,
  kindOfChunk,
  revertControlHint,
} from './chunkKind'

it('类型符号为实心点、全角加号、减号', () => {
  expect(chunkKindMarker.modified).toBe('●')
  expect(chunkKindMarker.added).toBe('＋')
  expect(chunkKindMarker.removed).toBe('−')
})

describe('kindOfChunk', () => {
  it('仅目标侧有区间为新增', () => {
    expect(kindOfChunk({ fromA: 10, toA: 10, fromB: 4, toB: 12 })).toBe('added')
  })

  it('仅参考侧有区间为删除', () => {
    expect(kindOfChunk({ fromA: 0, toA: 8, fromB: 20, toB: 20 })).toBe('removed')
  })

  it('两侧都有区间为修改', () => {
    expect(kindOfChunk({ fromA: 0, toA: 10, fromB: 0, toB: 8 })).toBe('modified')
  })

  it('两侧皆空防御为修改', () => {
    expect(kindOfChunk({ fromA: 3, toA: 3, fromB: 3, toB: 3 })).toBe('modified')
  })
})

describe('countChunkKinds', () => {
  it('空数组全 0', () => {
    expect(countChunkKinds([])).toEqual({ added: 0, removed: 0, modified: 0 })
  })

  it('按三类累计', () => {
    expect(
      countChunkKinds([
        { fromA: 0, toA: 0, fromB: 0, toB: 2 },
        { fromA: 1, toA: 4, fromB: 5, toB: 5 },
        { fromA: 8, toA: 10, fromB: 8, toB: 11 },
        { fromA: 12, toA: 12, fromB: 20, toB: 21 },
      ]),
    ).toEqual({ added: 2, removed: 1, modified: 1 })
  })
})

describe('chunkKindSummaryText', () => {
  it('三种都写出', () => {
    expect(chunkKindSummaryText({ added: 3, removed: 0, modified: 2 })).toBe(
      '新增 3 · 删除 0 · 修改 2',
    )
  })
})

describe('revertControlHint', () => {
  it('新增块带类型前缀', () => {
    expect(revertControlHint('added')).toBe('新增：将此差异写入目标配置')
  })

  it('删除块带类型前缀', () => {
    expect(revertControlHint('removed')).toBe('删除：将此差异写入目标配置')
  })

  it('修改块带类型前缀', () => {
    expect(revertControlHint('modified')).toBe('修改：将此差异写入目标配置')
  })
})
