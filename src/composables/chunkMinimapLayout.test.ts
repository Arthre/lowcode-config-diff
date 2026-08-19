import { describe, expect, it } from 'vitest'
import {
  chunkBandsOf,
  conflictBandsOf,
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
})

describe('scrollTopFromClick', () => {
  it('点击比例映射到可滚动范围', () => {
    expect(scrollTopFromClick(0.5, 100, 300)).toBe(100)
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
