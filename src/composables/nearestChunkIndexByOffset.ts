export type ChunkOffsetSpan = {
  fromA: number
  fromB: number
}

/**
 * 按组/字段偏移找最近文本块下标（0 起）。
 * `side`：删除用 A（fromA），其余用 B（fromB）。
 * 无偏移或块列表空 → `-1`；有偏移则取该侧 from 最接近且不大于目标的块，若全大于则取该侧 from 最小的块。
 */
export function nearestChunkIndexByOffset(options: {
  offset: number | null | undefined
  chunks: readonly ChunkOffsetSpan[]
  side: 'a' | 'b'
}): number {
  const { offset, chunks, side } = options
  if (offset == null || chunks.length === 0) return -1

  const fromAt = (chunk: ChunkOffsetSpan) => (side === 'a' ? chunk.fromA : chunk.fromB)

  let bestIndex = -1
  let bestFrom = -1
  let minIndex = -1
  let minFrom = Number.POSITIVE_INFINITY

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]
    if (chunk === undefined) continue
    const from = fromAt(chunk)
    if (from < minFrom) {
      minFrom = from
      minIndex = index
    }
    if (from <= offset && from >= bestFrom) {
      bestFrom = from
      bestIndex = index
    }
  }

  return bestIndex >= 0 ? bestIndex : minIndex
}
