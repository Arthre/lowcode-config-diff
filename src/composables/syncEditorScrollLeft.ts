export function createHorizontalScrollSync() {
  let syncing = false
  return {
    onScroll(source: HTMLElement, target: HTMLElement) {
      if (syncing) return
      if (source.scrollLeft === target.scrollLeft) return
      syncing = true
      target.scrollLeft = source.scrollLeft
      syncing = false
    },
  }
}
