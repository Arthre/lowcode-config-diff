import { describe, expect, it } from 'vitest'
import { nearestChunkIndexByOffset } from './nearestChunkIndexByOffset'
import type { ChunkOffsetSpan } from './nearestChunkIndexByOffset'

const chunks: ChunkOffsetSpan[] = [
  { fromA: 0, fromB: 0 },
  { fromA: 20, fromB: 18 },
  { fromA: 40, fromB: 45 },
  { fromA: 60, fromB: 70 },
]

describe('nearestChunkIndexByOffset', () => {
  it('offset 为 null 时返回 -1', () => {
    expect(nearestChunkIndexByOffset({ offset: null, chunks, side: 'b' })).toBe(-1)
  })

  it('offset 为 undefined 时返回 -1', () => {
    expect(nearestChunkIndexByOffset({ offset: undefined, chunks, side: 'b' })).toBe(-1)
  })

  it('chunks 为空时返回 -1', () => {
    expect(nearestChunkIndexByOffset({ offset: 10, chunks: [], side: 'b' })).toBe(-1)
  })

  it('side b 时按 fromB 命中最近块', () => {
    expect(nearestChunkIndexByOffset({ offset: 45, chunks, side: 'b' })).toBe(2)
  })

  it('偏移落在两块之间时取 from 不大于目标且最接近的块', () => {
    expect(nearestChunkIndexByOffset({ offset: 50, chunks, side: 'b' })).toBe(2)
    expect(nearestChunkIndexByOffset({ offset: 19, chunks, side: 'b' })).toBe(1)
  })

  it('该侧所有 from 都大于目标时取 from 最小的块', () => {
    const lateChunks: ChunkOffsetSpan[] = [
      { fromA: 50, fromB: 50 },
      { fromA: 80, fromB: 80 },
    ]
    expect(nearestChunkIndexByOffset({ offset: 30, chunks: lateChunks, side: 'b' })).toBe(0)
  })

  it('side a 时使用 fromA 且与 side b 可分化', () => {
    expect(nearestChunkIndexByOffset({ offset: 42, chunks, side: 'a' })).toBe(2)
    expect(nearestChunkIndexByOffset({ offset: 42, chunks, side: 'b' })).toBe(1)
  })

  it('不接受当前锚点：无偏移时不会回退到视口当前块 2', () => {
    expect(nearestChunkIndexByOffset({ offset: null, chunks, side: 'b' })).toBe(-1)
  })

  it('不接受当前锚点：有偏移时只按偏移返回正确下标而非视口当前块', () => {
    // 若心理上有当前块 2（fromB=45），偏移 18 应命中块 1 而非块 2
    expect(nearestChunkIndexByOffset({ offset: 18, chunks, side: 'b' })).toBe(1)
  })
})
