import { kindOfChunk } from './chunkKind'
import type { ConfigItemGroup } from './configItemDiff'
import type { MergeChunkRange } from './chunkRevertChange'

export type CachedGroupOffset = {
  id: string
  offset: number
  kind: ConfigItemGroup['kind']
}

/**
 * 按当前块类型分轨取组：删除只扫 removed + fromA，其余只扫非 removed + fromB。
 * 同轨按 offset 排序后取最后一个 offset <= 锚点的 id；没有则空串。
 */
export function activeGroupIdFromChunk(
  chunk: MergeChunkRange,
  offsets: readonly CachedGroupOffset[],
): string {
  const chunkKind = kindOfChunk(chunk)
  const compareAt = chunkKind === 'removed' ? chunk.fromA : chunk.fromB
  const lane =
    chunkKind === 'removed'
      ? offsets.filter((entry) => entry.kind === 'removed')
      : offsets.filter((entry) => entry.kind !== 'removed')
  const sorted = [...lane].sort((left, right) => left.offset - right.offset)
  let foundId = ''
  for (const entry of sorted) {
    if (entry.offset <= compareAt) foundId = entry.id
  }
  return foundId
}
