/** MergeView `collapseUnchanged` 参数；与 spec 锁定一致。 */
export const MERGE_COLLAPSE_UNCHANGED = { margin: 3, minSize: 4 } as const

/** 「仅显示差异」自动一次：大文档首次强开，用户关掉后本会话抑制。 */
export function createCollapseAutoOnce(): {
  nextEnabled: (current: boolean, isLarge: boolean) => boolean
  onUserSet: (enabled: boolean) => void
} {
  let suppressed = false
  return {
    nextEnabled(current, isLarge) {
      if (isLarge && !suppressed) return true
      return current
    },
    onUserSet(enabled) {
      if (!enabled) suppressed = true
    },
  }
}
