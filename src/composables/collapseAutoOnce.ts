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
