import { useDark } from '@vueuse/core'
import { nextTick } from 'vue'

/** localStorage key — keep in sync with the FOUC script in index.html */
export const THEME_STORAGE_KEY = 'lcd-color-scheme'

/** Shared by both directions so expand/retract feel matched. */
const THEME_VT_MS = 340
const THEME_VT_EASING = 'cubic-bezier(0.45, 0.05, 0.55, 0.95)'
/** Underneath color during wipe — never light, avoids white flash through gaps. */
const THEME_VT_BACKDROP = '#0c1014'

type ViewTransition = {
  ready: Promise<void>
  finished: Promise<void>
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void | Promise<void>) => ViewTransition
}

/** End radius so a circle from (x, y) covers the viewport. */
export function themeRevealRadius(x: number, y: number, width: number, height: number): number {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y))
}

/**
 * Manual light/dark toggle with View Transitions circular wipe.
 * Light→dark: light *retracts*; dark→light: light *enters*.
 * Animation is CSS-driven from the first VT frame (no WAAPI gap → less flash).
 */
export function useThemeToggle() {
  const isDark = useDark({
    storageKey: THEME_STORAGE_KEY,
  })

  async function toggleWithViewTransition(event?: MouseEvent) {
    const doc = document as DocumentWithViewTransition
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canTransition = typeof doc.startViewTransition === 'function' && !reduceMotion

    if (!canTransition) {
      isDark.value = !isDark.value
      return
    }

    const goingDark = !isDark.value
    const x = event?.clientX ?? window.innerWidth / 2
    const y = event?.clientY ?? window.innerHeight / 2
    const endRadius = themeRevealRadius(x, y, window.innerWidth, window.innerHeight)

    const root = document.documentElement
    root.dataset.themeVt = goingDark ? 'to-dark' : 'to-light'
    root.style.setProperty('--theme-vt-clip-from', `circle(0px at ${x}px ${y}px)`)
    root.style.setProperty('--theme-vt-clip-to', `circle(${endRadius}px at ${x}px ${y}px)`)
    root.style.setProperty('--theme-vt-ms', `${THEME_VT_MS}ms`)
    root.style.setProperty('--theme-vt-ease', THEME_VT_EASING)
    root.style.setProperty('--theme-vt-backdrop', THEME_VT_BACKDROP)

    const clearVt = () => {
      delete root.dataset.themeVt
      root.style.removeProperty('--theme-vt-clip-from')
      root.style.removeProperty('--theme-vt-clip-to')
      root.style.removeProperty('--theme-vt-ms')
      root.style.removeProperty('--theme-vt-ease')
      root.style.removeProperty('--theme-vt-backdrop')
    }

    try {
      const transition = doc.startViewTransition(async () => {
        isDark.value = !isDark.value
        await nextTick()
      })
      await transition.finished
    } finally {
      clearVt()
    }
  }

  return { isDark, toggleWithViewTransition }
}
