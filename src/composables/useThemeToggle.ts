import { useDark } from '@vueuse/core'
import { nextTick } from 'vue'

/** localStorage key — keep in sync with the FOUC script in index.html */
export const THEME_STORAGE_KEY = 'lcd-color-scheme'

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void | Promise<void>) => {
    ready: Promise<void>
  }
}

/** End radius so a circle from (x, y) covers the viewport. */
export function themeRevealRadius(x: number, y: number, width: number, height: number): number {
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y))
}

/**
 * Manual light/dark toggle with View Transitions circular reveal from the click point.
 * Falls back to an instant class swap when the API is missing or reduced motion is on.
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

    const x = event?.clientX ?? window.innerWidth / 2
    const y = event?.clientY ?? window.innerHeight / 2
    const endRadius = themeRevealRadius(x, y, window.innerWidth, window.innerHeight)
    const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]

    const transition = doc.startViewTransition(async () => {
      isDark.value = !isDark.value
      await nextTick()
    })

    await transition.ready

    // After toggle: dark → shrink light (old) away; light → expand light (new) from click
    document.documentElement.animate(
      {
        clipPath: isDark.value ? [...clipPath].reverse() : clipPath,
      },
      {
        duration: 450,
        easing: 'ease-in',
        fill: 'both',
        pseudoElement: isDark.value ? '::view-transition-old(root)' : '::view-transition-new(root)',
      },
    )
  }

  return { isDark, toggleWithViewTransition }
}
