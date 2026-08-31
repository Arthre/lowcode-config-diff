import { describe, expect, it } from 'vitest'
import {
  bandsFromPixelSpans,
  chunkBandsOf,
  conflictBandsOf,
  createMinimapDragSession,
  mergeScrollHeight,
  scrollTopFromClick,
  splitMinimapBandsByKind,
  viewportBandOf,
} from './chunkMinimapLayout'

describe('chunkBandsOf', () => {
  it('文档为空时无标记', () => {
    expect(chunkBandsOf([{ fromB: 0, toB: 10 }], 0)).toEqual([])
  })

  it('按字符位置换成 0–1 比例', () => {
    expect(chunkBandsOf([{ fromB: 10, toB: 30 }], 100)).toEqual([{ start: 0.1, end: 0.3 }])
  })
})

describe('viewportBandOf', () => {
  it('按滚动位置计算可视带', () => {
    expect(viewportBandOf(50, 50, 200)).toEqual({ start: 0.25, end: 0.5 })
  })

  it('scrollHeight 为 0 时铺满', () => {
    expect(viewportBandOf(0, 0, 0)).toEqual({ start: 0, end: 1 })
  })

  it('scrollTop 超出文档时滑块仍夹在轨道内', () => {
    const band = viewportBandOf(500, 50, 200)
    expect(band.start).toBeGreaterThanOrEqual(0)
    expect(band.end).toBeLessThanOrEqual(1)
    expect(band.start).toBeLessThan(band.end)
    expect(band.end - band.start).toBeGreaterThanOrEqual(0.04)
  })

  it('文档远高于视口时滑块跟滚动条走完全程，不在 96% 钉死', () => {
    const clientHeight = 783
    const scrollHeight = 360557
    const maxTop = scrollHeight - clientHeight
    const at96 = viewportBandOf(0.96 * maxTop, clientHeight, scrollHeight)
    const at99 = viewportBandOf(0.99 * maxTop, clientHeight, scrollHeight)
    const atEnd = viewportBandOf(maxTop, clientHeight, scrollHeight)
    expect(atEnd.end).toBeCloseTo(1)
    expect(atEnd.start).toBeCloseTo(0.96)
    expect(at99.start).toBeGreaterThan(at96.start)
    expect(atEnd.start).toBeGreaterThan(at99.start)
  })
})

describe('scrollTopFromClick', () => {
  it('中点仍映射到可滚动范围中点', () => {
    expect(scrollTopFromClick(0.5, 100, 300)).toBe(100)
  })

  it('点击比例对准原生滚动条行程', () => {
    const scrollTop = scrollTopFromClick(0.4, 100, 500)
    expect(scrollTop).toBe(160)
    const band = viewportBandOf(scrollTop, 100, 500)
    const span = band.end - band.start
    expect(band.start).toBeCloseTo(0.4 * (1 - span))
    expect(band.end).toBeCloseTo(band.start + span)
  })

  it('两端夹在可滚动范围内', () => {
    expect(scrollTopFromClick(0, 100, 300)).toBe(0)
    expect(scrollTopFromClick(1, 100, 300)).toBe(200)
  })

  it('映射与 clamp 共用 mergeScrollHeight 后的 scrollHeight', () => {
    const clientHeight = 100
    const rawScrollHeight = 800
    const contentHeight = 1000
    const scrollHeight = mergeScrollHeight(rawScrollHeight, contentHeight)
    const scrollTop = scrollTopFromClick(1, clientHeight, scrollHeight)
    const maxTop = Math.max(0, scrollHeight - clientHeight)
    expect(scrollTop).toBe(maxTop)
  })
})

describe('mergeScrollHeight', () => {
  it('取滚动根与编辑器内容高的较大值', () => {
    expect(mergeScrollHeight(800, 1000)).toBe(1000)
    expect(mergeScrollHeight(1200, 1000)).toBe(1200)
    expect(mergeScrollHeight(0, 0)).toBe(0)
  })
})

describe('createMinimapDragSession', () => {
  it('拖动中沿用按下时的高度，不因 scrollHeight 变化跳位', () => {
    const session = createMinimapDragSession()
    expect(session.scrollTopForRatio(0.5, { clientHeight: 100, scrollHeight: 300 })).toBe(100)
    expect(session.scrollTopForRatio(0.5, { clientHeight: 100, scrollHeight: 800 })).toBe(100)
    session.end()
    expect(session.scrollTopForRatio(0.5, { clientHeight: 100, scrollHeight: 800 })).toBe(350)
  })

  it('拖动中滑块比例跟手且不超出轨道', () => {
    const session = createMinimapDragSession()
    const live = { clientHeight: 100, scrollHeight: 500 }
    const band = session.viewportForRatio(0.8, live)
    expect(band.start).toBeGreaterThanOrEqual(0)
    expect(band.end).toBeLessThanOrEqual(1)
    expect(band.start).toBeLessThan(band.end)
    const later = session.viewportForRatio(0.8, { clientHeight: 100, scrollHeight: 2000 })
    expect(later).toEqual(band)
    session.end()
  })
})

describe('conflictBandsOf', () => {
  it('无冲突行时无标记', () => {
    expect(conflictBandsOf([false, false, false])).toEqual([])
  })

  it('把连续冲突行收成 0–1 区间', () => {
    expect(conflictBandsOf([false, true, true, false])).toEqual([{ start: 0.25, end: 0.75 }])
  })

  it('不相邻的冲突行分成多段', () => {
    expect(conflictBandsOf([true, false, true])).toEqual([
      { start: 0, end: 1 / 3 },
      { start: 2 / 3, end: 1 },
    ])
  })
})

describe('bandsFromPixelSpans', () => {
  it('scrollHeight<=0 为空', () => {
    expect(bandsFromPixelSpans([{ start: 100, end: 300 }], 0)).toEqual([])
    expect(bandsFromPixelSpans([{ start: 100, end: 300 }], -10)).toEqual([])
  })

  it('把像素区间换成 0–1 比例', () => {
    expect(bandsFromPixelSpans([{ start: 100, end: 300 }], 1000)).toEqual([
      { start: 0.1, end: 0.3 },
    ])
  })

  it('重叠像素带合并', () => {
    expect(
      bandsFromPixelSpans(
        [
          { start: 100, end: 250 },
          { start: 200, end: 400 },
        ],
        1000,
      ),
    ).toEqual([{ start: 0.1, end: 0.4 }])
  })

  it('201 条互不重叠的带输出不超过 200 且覆盖原起止范围', () => {
    const count = 201
    const bandHeight = 10
    const gap = 5
    const scrollHeight = count * (bandHeight + gap)
    const spans = Array.from({ length: count }, (_, index) => {
      const start = index * (bandHeight + gap)
      return { start, end: start + bandHeight }
    })
    const bands = bandsFromPixelSpans(spans, scrollHeight)
    expect(bands.length).toBeLessThanOrEqual(200)
    expect(bands.length).toBeGreaterThan(0)
    expect(bands[0]?.start).toBeCloseTo(spans[0].start / scrollHeight)
    expect(bands[bands.length - 1]?.end).toBeCloseTo(spans[count - 1].end / scrollHeight)
    for (let index = 1; index < bands.length; index += 1) {
      expect(bands[index].start).toBeGreaterThanOrEqual(bands[index - 1].start)
    }
  })
})

describe('splitMinimapBandsByKind', () => {
  it('scrollHeight<=0 为空', () => {
    expect(splitMinimapBandsByKind([{ kind: 'modified', start: 100, end: 300 }], 0)).toEqual({
      leftBands: [],
      rightBands: [],
    })
  })

  it('modified 左右同位', () => {
    const { leftBands, rightBands } = splitMinimapBandsByKind(
      [{ kind: 'modified', start: 100, end: 300 }],
      1000,
    )
    expect(leftBands).toEqual([{ start: 0.1, end: 0.3 }])
    expect(rightBands).toEqual(leftBands)
  })

  it('added 只在 right、removed 只在 left', () => {
    const { leftBands, rightBands } = splitMinimapBandsByKind(
      [
        { kind: 'added', start: 0, end: 200 },
        { kind: 'removed', start: 400, end: 600 },
      ],
      1000,
    )
    expect(leftBands).toEqual([{ start: 0.4, end: 0.6 }])
    expect(rightBands).toEqual([{ start: 0, end: 0.2 }])
  })
})
