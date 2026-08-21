export type ChunkNavRange = {
  fromA: number
  toA: number
  fromB: number
  toB: number
}

/** 与 @codemirror/merge moveByChunk 一致：from ≤ pos 且尚未越过 to。 */
export function activeChunkIndexOf(
  chunks: readonly ChunkNavRange[],
  pos: number,
  side: 'a' | 'b',
): number {
  if (chunks.length === 0) return -1
  let lastPast = -1
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    if (!chunk) continue
    const from = side === 'b' ? chunk.fromB : chunk.fromA
    const to = side === 'b' ? chunk.toB : chunk.toA
    if (from <= pos && !(to < pos)) return i
    if (to < pos) lastPast = i
  }
  if (lastPast >= 0) return lastPast
  return 0
}

/** 视口与差异块纵向区间重叠时取最上一块；空白处取已经过的一块。 */
export function activeChunkIndexInViewport(
  bands: readonly { start: number; end: number }[],
  viewStart: number,
  viewEnd: number,
): number {
  if (bands.length === 0) return -1
  let lastPast = -1
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]
    if (!band) continue
    if (overlapsViewport(band.start, band.end, viewStart, viewEnd)) return i
    if (band.end <= viewStart) lastPast = i
  }
  if (lastPast >= 0) return lastPast
  return 0
}

function overlapsViewport(start: number, end: number, viewStart: number, viewEnd: number): boolean {
  if (end <= start) return start >= viewStart && start < viewEnd
  return start < viewEnd && end > viewStart
}

/** 上一条/下一条相对视口锚点的目标下标；到头绕回。 */
export function chunkIndexAfterAnchor(anchorIndex: number, count: number, step: 1 | -1): number {
  if (count <= 0) return -1
  if (anchorIndex < 0) return step > 0 ? 0 : count - 1
  return (anchorIndex + step + count) % count
}

/**
 * 用像素重叠锚点算上一条/下一条目标。
 * 必须走视口重叠，不能用视口顶文档位置：scrollTop 取整后会落在块前空隙，
 * 下一条会停在原地、上一条会连退两块。
 */
export function chunkNavTargetIndex(
  bands: readonly { start: number; end: number }[],
  scrollTop: number,
  clientHeight: number,
  step: 1 | -1,
): number {
  const anchor = activeChunkIndexInViewport(bands, scrollTop, scrollTop + clientHeight)
  return chunkIndexAfterAnchor(anchor, bands.length, step)
}

/** 页眉差异锚点文案。current 为 1 起序号。 */
export function chunkAnchorText(current: number, total: number): string {
  if (total <= 0) return '无差异'
  if (current <= 0) return `差异 ${total}`
  return `差异 ${current} / ${total}`
}

export type ChunkNavDirection = 'prev' | 'next'

/** 上一个/下一个按钮的可见短文案。 */
export function chunkNavVisibleLabel(direction: ChunkNavDirection): string {
  return direction === 'prev' ? '上一个' : '下一个'
}

/** 上一个/下一个按钮的完整无障碍文案。 */
export function chunkNavAriaLabel(direction: ChunkNavDirection): string {
  return direction === 'prev' ? '上一个差异' : '下一个差异'
}
