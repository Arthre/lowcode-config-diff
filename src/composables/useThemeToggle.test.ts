import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY, themeRevealRadius } from './useThemeToggle'

describe('useThemeToggle', () => {
  it('主题存储键与 FOUC 脚本约定一致', () => {
    expect(THEME_STORAGE_KEY).toBe('lcd-color-scheme')
  })

  it('揭示圆半径覆盖从点击点到视口最远角', () => {
    expect(themeRevealRadius(0, 0, 100, 50)).toBe(Math.hypot(100, 50))
    expect(themeRevealRadius(50, 25, 100, 50)).toBe(Math.hypot(50, 25))
  })
})
