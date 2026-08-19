import { describe, expect, it } from 'vitest'
import {
  chunkBandsOf,
  conflictBandsOf,
  createMinimapDragSession,
  scrollTopFromClick,
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
})

describe('scrollTopFromClick', () => {
  it('点击比例映射到可滚动范围', () => {
    expect(scrollTopFromClick(0.5, 100, 300)).toBe(100)
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
