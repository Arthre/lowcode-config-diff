export type ChunkBand = { start: number; end: number }

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
  return {
    start: scrollTop / scrollHeight,
    end: Math.min(1, (scrollTop + clientHeight) / scrollHeight),
  }
}

/** 点击缩略轨比例对应的 scrollTop。 */
export function scrollTopFromClick(
  clickRatio: number,
  clientHeight: number,
  scrollHeight: number,
): number {
  return clickRatio * Math.max(0, scrollHeight - clientHeight)
}
