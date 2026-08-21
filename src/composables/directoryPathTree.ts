import { formatJsonPath, type ConfigItemGroup } from './configItemDiff'
import type { JsonPathSeg } from './jsonPathOffset'

export type DirectoryTreeNode = {
  id: string
  label: string
  path: JsonPathSeg[]
  kind: ConfigItemGroup['kind']
  changeCount: number
  /** 叶子配置项；数组父节点为 null */
  group: ConfigItemGroup | null
  children: DirectoryTreeNode[]
}

function lastPathSeg(path: readonly JsonPathSeg[]): JsonPathSeg | undefined {
  return path[path.length - 1]
}

function parentIdOf(path: readonly JsonPathSeg[]): string {
  const parentPath = path.slice(0, -1)
  const formatted = formatJsonPath(parentPath)
  return formatted === '' ? '（根）' : formatted
}

function leafNode(group: ConfigItemGroup, label: string): DirectoryTreeNode {
  return {
    id: group.id,
    label,
    path: group.path,
    kind: group.kind,
    changeCount: group.changeCount,
    group,
    children: [],
  }
}

function mergeParentKind(
  current: ConfigItemGroup['kind'],
  next: ConfigItemGroup['kind'],
): ConfigItemGroup['kind'] {
  return current === next ? current : 'modified'
}

/**
 * 把同父路径的数组下标兄弟折到一个一级节点下。
 * 对象根 key 仍各自为一级；字段仍挂在原配置项下，不摊平。
 */
export function foldDirectoryGroups(groups: readonly ConfigItemGroup[]): DirectoryTreeNode[] {
  const roots: DirectoryTreeNode[] = []
  const parents = new Map<string, DirectoryTreeNode>()

  for (const group of groups) {
    const last = lastPathSeg(group.path)
    if (last === undefined || last.type !== 'index') {
      roots.push(leafNode(group, group.id))
      continue
    }

    const parentId = parentIdOf(group.path)
    let parent = parents.get(parentId)
    if (parent === undefined) {
      parent = {
        id: parentId,
        label: parentId,
        path: group.path.slice(0, -1),
        kind: group.kind,
        changeCount: 0,
        group: null,
        children: [],
      }
      parents.set(parentId, parent)
      roots.push(parent)
    }
    parent.children.push(leafNode(group, formatJsonPath([last])))
    parent.changeCount += group.changeCount
    parent.kind = mergeParentKind(parent.kind, group.kind)
  }

  return roots
}

/** 当前组及其数组父路径；非数组根只有自身。 */
export function directoryGroupAncestorIds(group: ConfigItemGroup): string[] {
  const last = lastPathSeg(group.path)
  if (last === undefined || last.type !== 'index') return [group.id]
  return [parentIdOf(group.path), group.id]
}

/** 父节点跳转目标：第一个带配置项的后代。 */
export function firstDirectoryLeafId(node: DirectoryTreeNode): string {
  if (node.group !== null) return node.group.id
  for (const child of node.children) {
    const id = firstDirectoryLeafId(child)
    if (id !== '') return id
  }
  return ''
}
