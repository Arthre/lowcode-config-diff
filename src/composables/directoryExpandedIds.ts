import type { ConfigItemGroup } from './configItemDiff'
import { directoryGroupAncestorIds } from './directoryPathTree'

export type ResolveDirectoryExpandedIdsOptions = {
  activeGroupId: string
  activeGroup: ConfigItemGroup | undefined
  userExpandedIds: ReadonlySet<string>
  userCollapsedIds: ReadonlySet<string>
}

/** 合并当前组强制展开、用户展开与用户折起，得到目录树 expandedIds。 */
export function resolveDirectoryExpandedIds(options: ResolveDirectoryExpandedIdsOptions): string[] {
  const { activeGroupId, activeGroup, userExpandedIds, userCollapsedIds } = options
  const ids: string[] = []
  const seen = new Set<string>()
  const add = (id: string) => {
    if (id === '' || seen.has(id)) return
    ids.push(id)
    seen.add(id)
  }

  if (activeGroupId !== '') {
    if (activeGroup !== undefined) {
      for (const id of directoryGroupAncestorIds(activeGroup)) {
        if (!userCollapsedIds.has(id)) add(id)
      }
    } else {
      add(activeGroupId)
    }
  }

  for (const id of userExpandedIds) {
    if (!userCollapsedIds.has(id)) add(id)
  }

  return ids
}

/** 切换目录组折起时同步清理 userExpandedIds。 */
export function toggleDirectoryGroupCollapse(
  id: string,
  userCollapsedIds: ReadonlySet<string>,
  userExpandedIds: ReadonlySet<string>,
): { userCollapsedIds: Set<string>; userExpandedIds: Set<string> } {
  const nextCollapsed = new Set(userCollapsedIds)
  const nextExpanded = new Set(userExpandedIds)

  if (nextCollapsed.has(id)) {
    nextCollapsed.delete(id)
  } else {
    nextCollapsed.add(id)
    nextExpanded.delete(id)
  }

  return { userCollapsedIds: nextCollapsed, userExpandedIds: nextExpanded }
}
