import { describe, expect, it } from 'vitest'
import {
  activeChunkIndexInViewport,
  activeChunkIndexOf,
  chunkAnchorText,
  chunkIndexAfterAnchor,
  chunkNavTargetIndex,
} from './chunkNavAnchor'

const chunks = [
  { fromA: 0, toA: 10, fromB: 0, toB: 8 },
  { fromA: 20, toA: 30, fromB: 18, toB: 28 },
  { fromA: 40, toA: 40, fromB: 40, toB: 50 },
]

describe('activeChunkIndexOf', () => {
  it('无差异块时为 -1', () => {
    expect(activeChunkIndexOf([], 0, 'b')).toBe(-1)
  })

  it('选区落在块内时取该块（含 to 边界）', () => {
    expect(activeChunkIndexOf(chunks, 0, 'b')).toBe(0)
    expect(activeChunkIndexOf(chunks, 8, 'b')).toBe(0)
    expect(activeChunkIndexOf(chunks, 20, 'b')).toBe(1)
  })

  it('选区在块前时取即将到达的第一块', () => {
    expect(activeChunkIndexOf(chunks, 0, 'a')).toBe(0)
  })

  it('选区在两块之间时取已经过的一块', () => {
    expect(activeChunkIndexOf(chunks, 12, 'b')).toBe(0)
  })

  it('选区在全部块之后时取最后一块', () => {
    expect(activeChunkIndexOf(chunks, 80, 'b')).toBe(2)
  })

  it('空区间 from=to 且 head 落在该点时命中', () => {
    expect(activeChunkIndexOf(chunks, 40, 'a')).toBe(2)
  })
})

describe('activeChunkIndexInViewport', () => {
  const bands = [
    { start: 0, end: 50 },
    { start: 200, end: 250 },
    { start: 400, end: 420 },
  ]

  it('无差异块时为 -1', () => {
    expect(activeChunkIndexInViewport([], 0, 100)).toBe(-1)
  })

  it('视口与第一块重叠时取第一块', () => {
    expect(activeChunkIndexInViewport(bands, 0, 100)).toBe(0)
  })

  it('视口滚到第二块时取第二块', () => {
    expect(activeChunkIndexInViewport(bands, 180, 280)).toBe(1)
  })

  it('视口同时盖住两块时取最上的一块', () => {
    expect(activeChunkIndexInViewport(bands, 40, 220)).toBe(0)
  })

  it('视口落在两块之间的空白时取已经过的一块', () => {
    expect(activeChunkIndexInViewport(bands, 80, 160)).toBe(0)
  })

  it('视口在全部块之后时取最后一块', () => {
    expect(activeChunkIndexInViewport(bands, 500, 600)).toBe(2)
  })

  it('零高度标记落在视口顶边时仍命中', () => {
    expect(activeChunkIndexInViewport([{ start: 200, end: 200 }], 200, 300)).toBe(0)
  })

  it('滚到块顶但 scrollTop 取整偏上且视口仍盖住该块时取该块', () => {
    const bands = [
      { start: 0, end: 80 },
      { start: 100.6, end: 180 },
      { start: 300, end: 360 },
    ]
    expect(activeChunkIndexInViewport(bands, 100, 700)).toBe(1)
  })
})

describe('chunkNavTargetIndex', () => {
  it('取整后的块顶视口下，下一条前进一块、上一条只退一块', () => {
    const bands = [
      { start: 0, end: 80 },
      { start: 100.6, end: 180 },
      { start: 300, end: 360 },
    ]
    expect(chunkNavTargetIndex(bands, 100, 600, 1)).toBe(2)
    expect(chunkNavTargetIndex(bands, 100, 600, -1)).toBe(0)
  })
})

describe('chunkIndexAfterAnchor', () => {
  it('无差异块时为 -1', () => {
    expect(chunkIndexAfterAnchor(0, 0, 1)).toBe(-1)
    expect(chunkIndexAfterAnchor(-1, 0, -1)).toBe(-1)
  })

  it('下一条从当前锚点前进一块', () => {
    expect(chunkIndexAfterAnchor(0, 3, 1)).toBe(1)
    expect(chunkIndexAfterAnchor(1, 3, 1)).toBe(2)
  })

  it('下一条在末块绕回第一块', () => {
    expect(chunkIndexAfterAnchor(2, 3, 1)).toBe(0)
  })

  it('上一条从当前锚点后退一块', () => {
    expect(chunkIndexAfterAnchor(2, 3, -1)).toBe(1)
    expect(chunkIndexAfterAnchor(1, 3, -1)).toBe(0)
  })

  it('上一条在首块绕回末块', () => {
    expect(chunkIndexAfterAnchor(0, 3, -1)).toBe(2)
  })

  it('尚未锚到具体块时下一条取第一块、上一条取末块', () => {
    expect(chunkIndexAfterAnchor(-1, 4, 1)).toBe(0)
    expect(chunkIndexAfterAnchor(-1, 4, -1)).toBe(3)
  })

  it('仅一块时下一步仍落在该块', () => {
    expect(chunkIndexAfterAnchor(0, 1, 1)).toBe(0)
    expect(chunkIndexAfterAnchor(0, 1, -1)).toBe(0)
  })
})

describe('chunkAnchorText', () => {
  it('无差异块时只报总数', () => {
    expect(chunkAnchorText(0, 0)).toBe('0 个差异块')
  })

  it('有块时带当前序号', () => {
    expect(chunkAnchorText(3, 55)).toBe('3 / 55 个差异块')
  })

  it('尚未锚到具体块时只报总数', () => {
    expect(chunkAnchorText(0, 55)).toBe('55 个差异块')
  })
})
