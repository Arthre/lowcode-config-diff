import { formatJsonPath, type ConfigItemGroup } from './configItemDiff'
import type { JsonPathSeg } from './jsonPathOffset'

export type DirectoryTreeNode = {
  id: string
  label: string
  path: JsonPathSeg[]
  kind: ConfigItemGroup['kind']
  changeCount: number
  /** 配置项叶子；中间路径节点为 null，也可在有子节点时同时挂 group */
  group: ConfigItemGroup | null
  children: DirectoryTreeNode[]
}

function pathNodeId(path: readonly JsonPathSeg[]): string {
  const formatted = formatJsonPath(path)
  return formatted === '' ? '（根）' : formatted
}

function pathSegmentLabel(seg: JsonPathSeg): string {
  return seg.type === 'key' ? seg.key : `[${seg.index}]`
}

function mergeParentKind(
  current: ConfigItemGroup['kind'],
  next: ConfigItemGroup['kind'],
): ConfigItemGroup['kind'] {
  return current === next ? current : 'modified'
}

function createNode(
  id: string,
  label: string,
  path: JsonPathSeg[],
  kind: ConfigItemGroup['kind'],
): DirectoryTreeNode {
  return {
    id,
    label,
    path,
    kind,
    changeCount: 0,
    group: null,
    children: [],
  }
}

/**
 * 按完整 JSON path 逐段建树；兄弟共享前缀。
 * 字段仍挂在对应配置项节点上，不摊平为树节点。
 */
export function foldDirectoryGroups(groups: readonly ConfigItemGroup[]): DirectoryTreeNode[] {
  const roots: DirectoryTreeNode[] = []
  const byId = new Map<string, DirectoryTreeNode>()

  const ensureNode = (path: JsonPathSeg[], kind: ConfigItemGroup['kind']): DirectoryTreeNode => {
    const id = pathNodeId(path)
    const existing = byId.get(id)
    if (existing !== undefined) return existing

    const last = path[path.length - 1]
    const label = last === undefined ? id : pathSegmentLabel(last)
    const node = createNode(id, label, path.slice(), kind)
    byId.set(id, node)

    if (path.length <= 1) {
      roots.push(node)
      return node
    }

    const parent = ensureNode(path.slice(0, -1), kind)
    parent.children.push(node)
    return node
  }

  for (const group of groups) {
    const node = ensureNode(group.path, group.kind)
    node.group = group
  }

  const finalize = (node: DirectoryTreeNode): void => {
    for (const child of node.children) finalize(child)
    let count = node.group?.changeCount ?? 0
    let kind = node.group?.kind
    for (const child of node.children) {
      count += child.changeCount
      kind = kind === undefined ? child.kind : mergeParentKind(kind, child.kind)
    }
    node.changeCount = count
    if (kind !== undefined) node.kind = kind
  }

  for (const root of roots) finalize(root)
  return roots
}

/** 当前组完整路径上的每一段节点 id（含自身）。 */
export function directoryGroupAncestorIds(group: ConfigItemGroup): string[] {
  if (group.path.length === 0) return [group.id]
  const ids: string[] = []
  for (let length = 1; length <= group.path.length; length += 1) {
    ids.push(pathNodeId(group.path.slice(0, length)))
  }
  return ids
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
