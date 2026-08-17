import { useLocalStorage } from '@vueuse/core'

/** localStorage：左栏宽度占比（%） */
export const WORKSPACE_MAIN_PCT_KEY = 'lcd-workspace-main-pct'

export const WORKSPACE_MAIN_PCT_DEFAULT = 70
export const WORKSPACE_MAIN_PCT_MIN = 35
export const WORKSPACE_MAIN_PCT_MAX = 75

/** 将占比限制在可拖区间并量化到 0.1，避免无效写入 */
export function clampWorkspaceMainPct(value: number): number {
  if (!Number.isFinite(value)) return WORKSPACE_MAIN_PCT_DEFAULT
  const clamped = Math.min(WORKSPACE_MAIN_PCT_MAX, Math.max(WORKSPACE_MAIN_PCT_MIN, value))
  return Math.round(clamped * 10) / 10
}

/**
 * 宽屏双列占比：默认 70/30，本地持久化。
 * 拖拽过程应由调用方直接写 CSS 变量，仅在松手时写入本 ref，避免整树重渲染。
 */
export function useWorkspaceSplit() {
  const stored = useLocalStorage<number>(WORKSPACE_MAIN_PCT_KEY, WORKSPACE_MAIN_PCT_DEFAULT)

  const mainPct = computed({
    get: () => clampWorkspaceMainPct(Number(stored.value)),
    set: (value: number) => {
      stored.value = clampWorkspaceMainPct(value)
    },
  })

  function nudgeMainPct(delta: number) {
    mainPct.value = mainPct.value + delta
  }

  return {
    mainPct,
    nudgeMainPct,
  }
}
