import type { ChunkKind } from './chunkKind'
import type { ConfigItemGroup } from './configItemDiff'

export type DirectoryKindFilter = 'all' | ChunkKind

export function filterConfigItemGroups(
  groups: readonly ConfigItemGroup[],
  filter: DirectoryKindFilter,
): ConfigItemGroup[] {
  if (filter === 'all') return [...groups]

  return groups.flatMap((group) => {
    const fields = group.fields.filter((field) => field.kind === filter)
    return fields.length === 0
      ? []
      : [{ ...group, kind: filter, changeCount: fields.length, fields }]
  })
}

export function filterJumpItems<T extends { kind: ChunkKind }>(
  items: readonly T[],
  filter: DirectoryKindFilter,
): T[] {
  return filter === 'all' ? [...items] : items.filter((item) => item.kind === filter)
}

export function directoryKindFilterEmptyText(filter: DirectoryKindFilter): string {
  if (filter === 'added') return '没有新增项'
  if (filter === 'removed') return '没有删除项'
  if (filter === 'modified') return '没有修改项'
  return '没有差异块'
}
