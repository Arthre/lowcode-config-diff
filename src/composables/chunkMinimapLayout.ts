export type ChunkBand = { start: number; end: number }

/** 缩略轨单列色带上限；超出则按比例合并相邻带。 */
export const MINIMAP_BAND_CAP = 200

const MIN_VIEWPORT_SPAN = 0.04

/** 把滑块夹在 0–1 轨道内。 */
export function clampViewportBand(band: ChunkBand): ChunkBand {
  let start = Number.isFinite(band.start) ? band.start : 0
  let end = Number.isFinite(band.end) ? band.end : 1
  start = Math.min(1, Math.max(0, start))
  end = Math.min(1, Math.max(0, end))
  if (end < start) end = start
  return { start, end }
}

/** 滑块高度：真实视口占比，过小时抬到可见下限。 */
function viewportSpan(clientHeight: number, scrollHeight: number): number {
  if (scrollHeight <= 0) return 1
  return Math.min(1, Math.max(clientHeight / scrollHeight, MIN_VIEWPORT_SPAN))
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

/**
 * 当前视口在缩略轨上的 0–1 区间。
 * 与原生滚动条同一套行程：progress = scrollTop / maxTop，
 * 滑块 top = progress * (1 - span)，避免 4% 下限把后段钉死在 96%。
 */
export function viewportBandOf(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
): ChunkBand {
  if (scrollHeight <= 0) return { start: 0, end: 1 }
  const span = viewportSpan(clientHeight, scrollHeight)
  const maxTop = Math.max(0, scrollHeight - clientHeight)
  const progress = maxTop > 0 ? Math.min(1, Math.max(0, scrollTop / maxTop)) : 0
  const start = progress * (1 - span)
  return clampViewportBand({ start, end: start + span })
}

/**
 * 点击/拖动缩略轨比例对应的 scrollTop。
 * 与编辑器原生滚动条一致：轨道 0–1 = 可滚动余量行程。
 */
export function scrollTopFromClick(
  clickRatio: number,
  clientHeight: number,
  scrollHeight: number,
): number {
  const maxTop = Math.max(0, scrollHeight - clientHeight)
  const ratio = Number.isFinite(clickRatio) ? Math.min(1, Math.max(0, clickRatio)) : 0
  return maxTop * ratio
}

/** 合并编辑器内容高与滚动根 scrollHeight，避免折叠条导致色带/滑块用两套高度。 */
export function mergeScrollHeight(scrollHeight: number, contentHeight: number): number {
  return Math.max(0, scrollHeight, contentHeight)
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

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** 超过上限时按比例合并相邻带，保序且覆盖原起止。 */
function capMinimapBands(bands: ChunkBand[], cap = MINIMAP_BAND_CAP): ChunkBand[] {
  if (bands.length <= cap) return bands
  const capped: ChunkBand[] = []
  for (let index = 0; index < cap; index += 1) {
    const from = Math.floor((index * bands.length) / cap)
    const to = Math.floor(((index + 1) * bands.length) / cap)
    const first = bands[from]
    const last = bands[to - 1]
    if (first === undefined || last === undefined) continue
    capped.push({ start: first.start, end: last.end })
  }
  return capped
}

/** 把对齐像素区间换成缩略轨 0–1 带，相邻或重叠的合并。 */
export function bandsFromPixelSpans(
  spans: readonly { start: number; end: number }[],
  scrollHeight: number,
): ChunkBand[] {
  if (scrollHeight <= 0) return []
  const units: ChunkBand[] = []
  for (const span of spans) {
    const start = clampUnit(span.start / scrollHeight)
    const end = clampUnit(span.end / scrollHeight)
    if (end < start) continue
    units.push({ start, end })
  }
  units.sort((a, b) => a.start - b.start || a.end - b.end)
  const merged: ChunkBand[] = []
  for (const band of units) {
    const last = merged[merged.length - 1]
    if (last && band.start <= last.end) {
      last.end = Math.max(last.end, band.end)
    } else {
      merged.push({ start: band.start, end: band.end })
    }
  }
  return capMinimapBands(merged)
}

/** 按块类型分到左右列：删除/修改画左，新增/修改画右。 */
export function splitMinimapBandsByKind(
  chunks: readonly { kind: 'added' | 'removed' | 'modified'; start: number; end: number }[],
  scrollHeight: number,
): { leftBands: ChunkBand[]; rightBands: ChunkBand[] } {
  if (scrollHeight <= 0) return { leftBands: [], rightBands: [] }
  const leftSpans: { start: number; end: number }[] = []
  const rightSpans: { start: number; end: number }[] = []
  for (const chunk of chunks) {
    const span = { start: chunk.start, end: chunk.end }
    if (chunk.kind === 'removed' || chunk.kind === 'modified') leftSpans.push(span)
    if (chunk.kind === 'added' || chunk.kind === 'modified') rightSpans.push(span)
  }
  return {
    leftBands: bandsFromPixelSpans(leftSpans, scrollHeight),
    rightBands: bandsFromPixelSpans(rightSpans, scrollHeight),
  }
}
