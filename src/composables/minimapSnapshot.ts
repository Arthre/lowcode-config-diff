import type { ChunkBand } from './chunkMinimapLayout'

/** 每个换行后的行起点（含文首 0；末尾换行会多一个空行起点）。 */
export function lineStartsOf(text: string): number[] {
  const starts = [0]
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1)
  }
  return starts
}

/** 在已建好的行起点上二分取 0 起行号。 */
export function lineIndexAt(starts: readonly number[], docLength: number, offset: number): number {
  if (starts.length === 0) return 0
  const pos = Math.max(0, Math.min(offset, docLength))
  let lo = 0
  let hi = starts.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const start = starts[mid] ?? 0
    if (pos < start) {
      hi = mid - 1
      continue
    }
    const nextStart = mid + 1 < starts.length ? (starts[mid + 1] ?? docLength + 1) : docLength + 1
    if (pos >= nextStart) {
      lo = mid + 1
      continue
    }
    return mid
  }
  return Math.max(0, starts.length - 1)
}

/** 把文档偏移换成 0 起的行号。 */
export function lineAtOffset(text: string, offset: number): number {
  if (text.length === 0) return 0
  return lineIndexAt(lineStartsOf(text), text.length, offset)
}

/** 按区间标记哪些行发生了差异（区间按 [from, to)）。 */
export function changedLineFlags(
  text: string,
  ranges: readonly { from: number; to: number }[],
): boolean[] {
  const starts = lineStartsOf(text)
  const flags = new Array<boolean>(starts.length).fill(false)
  for (const range of ranges) {
    const from = Math.max(0, Math.min(range.from, text.length))
    const to = Math.max(0, Math.min(range.to, text.length))
    const start = lineIndexAt(starts, text.length, from)
    const end = to > from ? lineIndexAt(starts, text.length, to - 1) : start
    flags.fill(true, start, Math.min(end + 1, flags.length))
  }
  return flags
}

/**
 * 由文档偏移区间直接收成缩略轨 0–1 带，避免先铺一整份逐行布尔数组。
 * `lineAt` 返回 0 起行号（可用 CodeMirror `doc.lineAt(pos).number - 1`）。
 */
export function conflictBandsFromOffsetRanges(
  lineCount: number,
  docLength: number,
  ranges: readonly { from: number; to: number }[],
  lineAt: (offset: number) => number,
): ChunkBand[] {
  if (lineCount <= 0 || ranges.length === 0) return []
  const spans: { start: number; end: number }[] = []
  for (const range of ranges) {
    const from = Math.max(0, Math.min(range.from, docLength))
    const to = Math.max(0, Math.min(range.to, docLength))
    const start = Math.max(0, Math.min(lineAt(from), lineCount - 1))
    const last = to > from ? lineAt(to - 1) : start
    const end = Math.min(lineCount, Math.max(start, last) + 1)
    spans.push({ start, end })
  }
  spans.sort((a, b) => a.start - b.start || a.end - b.end)
  const merged: { start: number; end: number }[] = []
  for (const span of spans) {
    const last = merged[merged.length - 1]
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end)
    } else {
      merged.push({ start: span.start, end: span.end })
    }
  }
  return merged.map((span) => ({
    start: span.start / lineCount,
    end: span.end / lineCount,
  }))
}
