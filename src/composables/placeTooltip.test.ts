import { describe, expect, it } from 'vitest'
import { resolveTooltipPlacement } from './placeTooltip'

const tip = { width: 80, height: 28 }
const viewport = { width: 400, height: 300 }

describe('resolveTooltipPlacement', () => {
  it('默认优先上方且水平居中', () => {
    const placed = resolveTooltipPlacement(
      { top: 120, left: 100, width: 32, height: 32 },
      tip,
      'top',
      viewport,
    )
    expect(placed.placement).toBe('top')
    expect(placed.top).toBe(84)
    expect(placed.left).toBe(76)
  })

  it('上方空间不足时翻到下方', () => {
    const placed = resolveTooltipPlacement(
      { top: 10, left: 100, width: 32, height: 32 },
      tip,
      'top',
      viewport,
    )
    expect(placed.placement).toBe('bottom')
    expect(placed.top).toBe(50)
  })

  it('偏好下方且下方空间足够时保持向下', () => {
    const placed = resolveTooltipPlacement(
      { top: 40, left: 100, width: 32, height: 32 },
      tip,
      'bottom',
      viewport,
    )
    expect(placed.placement).toBe('bottom')
    expect(placed.top).toBe(80)
  })

  it('偏好下方但贴底时翻到上方', () => {
    const placed = resolveTooltipPlacement(
      { top: 270, left: 100, width: 32, height: 32 },
      tip,
      'bottom',
      viewport,
    )
    expect(placed.placement).toBe('top')
    expect(placed.top).toBe(234)
  })

  it('水平方向贴边时夹进视口', () => {
    const placed = resolveTooltipPlacement(
      { top: 120, left: 0, width: 20, height: 32 },
      tip,
      'top',
      viewport,
    )
    expect(placed.left).toBe(8)
  })
})
