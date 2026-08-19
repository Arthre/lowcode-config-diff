export type ChunkBand = { start: number; end: number }

const MIN_VIEWPORT_SPAN = 0.04

/** 把滑块夹在 0–1 轨道内，并保证有可见高度。 */
export function clampViewportBand(band: ChunkBand): ChunkBand {
  let start = Number.isFinite(band.start) ? band.start : 0
  let end = Number.isFinite(band.end) ? band.end : 1
  start = Math.min(1, Math.max(0, start))
  end = Math.min(1, Math.max(0, end))
  if (end < start) end = start
  if (end - start < MIN_VIEWPORT_SPAN) {
    end = Math.min(1, start + MIN_VIEWPORT_SPAN)
    start = Math.max(0, end - MIN_VIEWPORT_SPAN)
  }
  return { start, end }
}

/** 把差异块在文档中的位置换成缩略轨上的 0–1 区间。 */
export function chunkBandsOf(
  chunks: readonly { fromB: number; toB: number }[],
  docLength: number,
): ChunkBand[] {
  if (docLength <= 0) return []
  return chunks.map((chunk) => ({
    start: Math.min(1, chunk.fromB / docLength),
    end: Math.min(1, Math.max(chunk.fromB, chunk.toB) / docLength),
  }))
}

/** 当前视口在缩略轨上的 0–1 区间。 */
export function viewportBandOf(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
): ChunkBand {
  if (scrollHeight <= 0) return { start: 0, end: 1 }
  return clampViewportBand({
    start: scrollTop / scrollHeight,
    end: (scrollTop + clientHeight) / scrollHeight,
  })
}

/** 点击缩略轨比例对应的 scrollTop。 */
export function scrollTopFromClick(
  clickRatio: number,
  clientHeight: number,
  scrollHeight: number,
): number {
  return clickRatio * Math.max(0, scrollHeight - clientHeight)
}

type ScrollMetrics = { clientHeight: number; scrollHeight: number }

/**
 * 拖动缩略轨时锁定按下瞬间的高度。
 * 滚动会触发 CodeMirror 补测行高，scrollHeight 变化后若仍用实时高度，
 * 同一指针比例会跳到另一处，表现为页面乱跳。
 */
export function createMinimapDragSession() {
  let locked: ScrollMetrics | null = null
  return {
    scrollTopForRatio(ratio: number, live: ScrollMetrics): number {
      locked ??= { clientHeight: live.clientHeight, scrollHeight: live.scrollHeight }
      return scrollTopFromClick(ratio, locked.clientHeight, locked.scrollHeight)
    },
    viewportForRatio(ratio: number, live: ScrollMetrics): ChunkBand {
      locked ??= { clientHeight: live.clientHeight, scrollHeight: live.scrollHeight }
      return viewportBandOf(
        scrollTopFromClick(ratio, locked.clientHeight, locked.scrollHeight),
        locked.clientHeight,
        locked.scrollHeight,
      )
    },
    end() {
      locked = null
    },
  }
}

/** 把冲突行标记收成缩略轨上的 0–1 区间。 */
export function conflictBandsOf(changed: readonly boolean[]): ChunkBand[] {
  const lineCount = changed.length
  if (lineCount <= 0) return []
  const bands: ChunkBand[] = []
  let index = 0
  while (index < lineCount) {
    if (!changed[index]) {
      index += 1
      continue
    }
    const start = index
    while (index < lineCount && changed[index]) index += 1
    bands.push({ start: start / lineCount, end: index / lineCount })
  }
  return bands
}
