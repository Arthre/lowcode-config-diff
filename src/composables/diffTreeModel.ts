import { deepEqual } from '@/core/equal'
import type { Config, DiffItem, DiffSide, DiffType, JsonValue } from '@/core/types'

export type DiffTreeNodeKind = 'diff-leaf' | 'container' | 'equal'

export interface DiffTreeNode {
  path: string[]
  segment: string // 展示用末段；根用 '(root)'
  kind: DiffTreeNodeKind
  /** kind==='diff-leaf' */
  leafId?: string
  diffType?: DiffType
  testValue?: JsonValue
  prodValue?: JsonValue
  /** kind==='equal' 时双方相同值 */
  equalValue?: JsonValue
  children: DiffTreeNode[]
}

export type MixedSide = DiffSide | 'mixed' | 'none'

export function pathKey(path: string[]): string {
  return path.length === 0 ? '(root)' : path.join('.')
}

function isPlainObject(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function segmentOf(path: string[]): string {
  return path.length === 0 ? '(root)' : path[path.length - 1]!
}

function isPathPrefix(prefix: string[], path: string[]): boolean {
  if (prefix.length > path.length) return false
  return prefix.every((part, index) => path[index] === part)
}

function walkNode(options: {
  testValue: JsonValue | undefined
  prodValue: JsonValue | undefined
  path: string[]
  leafByPath: Map<string, DiffItem>
  showUnchanged: boolean
}): DiffTreeNode | null {
  const { testValue, prodValue, path, leafByPath, showUnchanged } = options
  const key = pathKey(path)
  const leaf = leafByPath.get(key)

  if (leaf) {
    return {
      path: [...path],
      segment: segmentOf(path),
      kind: 'diff-leaf',
      leafId: leaf.id,
      diffType: leaf.type,
      testValue: leaf.testValue,
      prodValue: leaf.prodValue,
      children: [],
    }
  }

  if (deepEqual(testValue, prodValue)) {
    if (!showUnchanged) return null
    return {
      path: [...path],
      segment: segmentOf(path),
      kind: 'equal',
      equalValue: testValue,
      children: [],
    }
  }

  if (isPlainObject(testValue) && isPlainObject(prodValue)) {
    const keys = [...new Set([...Object.keys(testValue), ...Object.keys(prodValue)])].sort()
    const children: DiffTreeNode[] = []
    for (const childKey of keys) {
      const hasTest = Object.prototype.hasOwnProperty.call(testValue, childKey)
      const hasProd = Object.prototype.hasOwnProperty.call(prodValue, childKey)
      const child = walkNode({
        testValue: hasTest ? testValue[childKey] : undefined,
        prodValue: hasProd ? prodValue[childKey] : undefined,
        path: [...path, childKey],
        leafByPath,
        showUnchanged,
      })
      if (child) children.push(child)
    }
    if (children.length === 0) return null
    return {
      path: [...path],
      segment: segmentOf(path),
      kind: 'container',
      children,
    }
  }

  return null
}

export function buildDiffTree(options: {
  leaves: DiffItem[]
  testConfig: Config
  prodConfig: Config
  showUnchanged: boolean
}): DiffTreeNode[] {
  const leafByPath = new Map<string, DiffItem>()
  for (const leaf of options.leaves) {
    leafByPath.set(pathKey(leaf.path), leaf)
  }

  const root = walkNode({
    testValue: options.testConfig as JsonValue,
    prodValue: options.prodConfig as JsonValue,
    path: [],
    leafByPath,
    showUnchanged: options.showUnchanged,
  })

  if (!root) return []
  if (root.kind === 'container') return root.children
  return [root]
}

export function defaultSideForType(type: DiffType): DiffSide {
  return type === 'removed' ? 'prod' : 'test'
}

export function withSide(leaves: DiffItem[], id: string, side: DiffSide): DiffItem[] {
  return leaves.map((leaf) => (leaf.id === id ? { ...leaf, side } : leaf))
}

export function withAllSides(leaves: DiffItem[], side: DiffSide): DiffItem[] {
  return leaves.map((leaf) => ({ ...leaf, side }))
}

export function withDefaultSides(leaves: DiffItem[]): DiffItem[] {
  return leaves.map((leaf) => ({ ...leaf, side: defaultSideForType(leaf.type) }))
}

export function withDescendantSides(
  leaves: DiffItem[],
  prefix: string[],
  side: DiffSide,
): DiffItem[] {
  return leaves.map((leaf) => (isPathPrefix(prefix, leaf.path) ? { ...leaf, side } : leaf))
}

export function sideStateForPrefix(leaves: DiffItem[], prefix: string[]): MixedSide {
  const descendants = leaves.filter((leaf) => isPathPrefix(prefix, leaf.path))
  if (descendants.length === 0) return 'none'
  const sides = new Set(descendants.map((leaf) => leaf.side))
  if (sides.size === 1) return descendants[0]!.side
  return 'mixed'
}
