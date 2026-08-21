import { describe, expect, it } from 'vitest'
import {
  DIRECTORY_DRAWER_DURATION_MS,
  DIRECTORY_DRAWER_OPEN_WIDTH,
  directoryDrawerAriaLabel,
  directoryDrawerMeasureFallbackMs,
  directoryDrawerWidth,
  isDirectoryWidthTransitionEnd,
} from './directoryDrawer'

describe('DIRECTORY_DRAWER_OPEN_WIDTH', () => {
  it('展开列宽为 16rem', () => {
    expect(DIRECTORY_DRAWER_OPEN_WIDTH).toBe('16rem')
  })
})

describe('DIRECTORY_DRAWER_DURATION_MS', () => {
  it('宽度过渡为 240 毫秒', () => {
    expect(DIRECTORY_DRAWER_DURATION_MS).toBe(240)
  })
})

describe('directoryDrawerWidth', () => {
  it('展开时返回 16rem', () => {
    expect(directoryDrawerWidth(true)).toBe('16rem')
  })

  it('收起时返回 0', () => {
    expect(directoryDrawerWidth(false)).toBe('0')
  })
})

describe('directoryDrawerAriaLabel', () => {
  it('展开时标签为收起目录', () => {
    expect(directoryDrawerAriaLabel(true)).toBe('收起目录')
  })

  it('收起时标签为展开目录', () => {
    expect(directoryDrawerAriaLabel(false)).toBe('展开目录')
  })
})

describe('isDirectoryWidthTransitionEnd', () => {
  it('本列 width 过渡结束时为真', () => {
    const column = {}
    expect(
      isDirectoryWidthTransitionEnd({
        propertyName: 'width',
        target: column,
        currentTarget: column,
      }),
    ).toBe(true)
  })

  it('忽略非 width 过渡', () => {
    const column = {}
    expect(
      isDirectoryWidthTransitionEnd({
        propertyName: 'opacity',
        target: column,
        currentTarget: column,
      }),
    ).toBe(false)
  })

  it('忽略子节点冒泡的 width 过渡', () => {
    expect(
      isDirectoryWidthTransitionEnd({
        propertyName: 'width',
        target: {},
        currentTarget: {},
      }),
    ).toBe(false)
  })
})

describe('directoryDrawerMeasureFallbackMs', () => {
  it('减少动效时立即补测', () => {
    expect(directoryDrawerMeasureFallbackMs(true)).toBe(0)
  })

  it('有宽度过渡时按时长兜底补测', () => {
    expect(directoryDrawerMeasureFallbackMs(false)).toBe(DIRECTORY_DRAWER_DURATION_MS)
  })
})
