import type { MergeChunkRange } from './chunkRevertChange'

export type ChunkKind = 'added' | 'removed' | 'modified'

export type ChunkKindCounts = { added: number; removed: number; modified: number }

export const chunkKindMarker: Record<ChunkKind, string> = {
  added: '＋',
  removed: '−',
  modified: '●',
}

export const chunkKindShortName: Record<ChunkKind, string> = {
  added: '新增',
  removed: '删除',
  modified: '修改',
}

/** 相对目标配置 B：仅目标有为新增，仅参考有为删除，其余为修改。 */
export function kindOfChunk(chunk: MergeChunkRange): ChunkKind {
  if (chunk.fromA === chunk.toA && chunk.fromB !== chunk.toB) return 'added'
  if (chunk.fromB === chunk.toB && chunk.fromA !== chunk.toA) return 'removed'
  return 'modified'
}

export function countChunkKinds(chunks: readonly MergeChunkRange[]): ChunkKindCounts {
  const counts: ChunkKindCounts = { added: 0, removed: 0, modified: 0 }
  for (const chunk of chunks) {
    counts[kindOfChunk(chunk)] += 1
  }
  return counts
}

export function chunkKindSummaryText(counts: ChunkKindCounts): string {
  return `新增 ${counts.added} · 删除 ${counts.removed} · 修改 ${counts.modified}`
}

/** revert 按钮默认提示；layout 对齐后再加上类型前缀。 */
export const revertControlDefaultHint = '将此差异写入目标配置'

const chunkKindHintPrefix: Record<ChunkKind, string> = {
  added: '新增',
  removed: '删除',
  modified: '修改',
}

export function revertControlHint(kind: ChunkKind): string {
  return `${chunkKindHintPrefix[kind]}：${revertControlDefaultHint}`
}
