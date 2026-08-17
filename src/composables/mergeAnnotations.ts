import { formatPath } from '@/core/path'
import type { DiffItem, DiffSide, DiffType } from '@/core/types'

export type MergeAnnotationEffect = 'keep' | 'drop'

export interface MergeAnnotation {
  id: string
  path: string[]
  pathText: string
  type: DiffType
  side: DiffSide
  effect: MergeAnnotationEffect
  /** 面向用户的简短说明 */
  label: string
}

/** 与 mergeConfig 中 isDeleteLeaf 对齐 */
export function isDropLeaf(leaf: DiffItem): boolean {
  return (
    (leaf.type === 'added' && leaf.side === 'prod') ||
    (leaf.type === 'removed' && leaf.side === 'test')
  )
}

function annotationLabel(leaf: DiffItem, effect: MergeAnnotationEffect): string {
  if (effect === 'drop') {
    if (leaf.type === 'added' && leaf.side === 'prod') {
      return '未纳入结果（选 PROD，丢弃 TEST 新增）'
    }
    if (leaf.type === 'removed' && leaf.side === 'test') {
      return '未纳入结果（选 TEST，不保留 PROD 独有）'
    }
    return '未纳入结果'
  }
  if (leaf.side === 'test') return '取 TEST'
  return '取 PROD'
}

/** 根据当前选边生成合并来源标注（供结果区列表与高亮）。 */
export function buildMergeAnnotations(leaves: DiffItem[]): MergeAnnotation[] {
  return leaves.map((leaf) => {
    const effect: MergeAnnotationEffect = isDropLeaf(leaf) ? 'drop' : 'keep'
    return {
      id: leaf.id,
      path: [...leaf.path],
      pathText: formatPath(leaf.path),
      type: leaf.type,
      side: leaf.side,
      effect,
      label: annotationLabel(leaf, effect),
    }
  })
}

export type JsonPathRange = { from: number; to: number }

/**
 * 在缩进 2 的 JSON 文本中定位 path 对应值的起止偏移（含值本身，不含键名）。
 * 失败返回 null。
 */
export function locateJsonPathRange(doc: string, path: string[]): JsonPathRange | null {
  if (path.length === 0) {
    const trimmed = doc.trim()
    if (!trimmed) return null
    return { from: 0, to: doc.length }
  }

  let pos = 0
  for (let i = 0; i < path.length; i++) {
    const key = path[i]!
    const keyPattern = `"${escapeJsonKey(key)}"`
    const found = indexOfKeyAtDepth(doc, keyPattern, pos)
    if (found < 0) return null

    const colon = doc.indexOf(':', found + keyPattern.length)
    if (colon < 0) return null

    const valueStart = skipWs(doc, colon + 1)
    if (valueStart >= doc.length) return null

    if (i === path.length - 1) {
      const valueEnd = endOfJsonValue(doc, valueStart)
      if (valueEnd < 0) return null
      return { from: valueStart, to: valueEnd }
    }
    // 中间层只需进入子值；不扫描整个父对象的结束位置。
    pos = valueStart
  }
  return null
}

function escapeJsonKey(key: string): string {
  return key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function skipWs(doc: string, from: number): number {
  let i = from
  while (i < doc.length && /\s/.test(doc[i]!)) i += 1
  return i
}

/** 在 from 之后查找 "key"，要求大致处于对象键位置（前一非空白为 { 或 ,）。 */
function indexOfKeyAtDepth(doc: string, keyPattern: string, from: number): number {
  let searchFrom = from
  while (searchFrom < doc.length) {
    const idx = doc.indexOf(keyPattern, searchFrom)
    if (idx < 0) return -1
    let j = idx - 1
    while (j >= 0 && /\s/.test(doc[j]!)) j -= 1
    const prev = j >= 0 ? doc[j]! : ''
    if (prev === '{' || prev === ',') {
      return idx
    }
    searchFrom = idx + keyPattern.length
  }
  return -1
}

function endOfJsonValue(doc: string, start: number): number {
  const ch = doc[start]
  if (ch === '"') {
    let i = start + 1
    while (i < doc.length) {
      if (doc[i] === '\\') {
        i += 2
        continue
      }
      if (doc[i] === '"') return i + 1
      i += 1
    }
    return -1
  }
  if (ch === '{' || ch === '[') {
    const open = ch
    const close = ch === '{' ? '}' : ']'
    let depth = 0
    let inString = false
    for (let i = start; i < doc.length; i++) {
      const c = doc[i]!
      if (inString) {
        if (c === '\\') {
          i += 1
          continue
        }
        if (c === '"') inString = false
        continue
      }
      if (c === '"') {
        inString = true
        continue
      }
      if (c === open) depth += 1
      else if (c === close) {
        depth -= 1
        if (depth === 0) return i + 1
      }
    }
    return -1
  }
  // number / boolean / null
  let i = start
  while (i < doc.length && /[^\s,}\]]/.test(doc[i]!)) i += 1
  return i
}

export interface SideMark {
  from: number
  to: number
  side: DiffSide
}

/** 仅为 keep 叶生成高亮区间；定位失败则跳过。 */
export function buildSideMarksFromAnnotations(
  doc: string,
  annotations: MergeAnnotation[],
): SideMark[] {
  const marks: SideMark[] = []
  for (const item of annotations) {
    if (item.effect !== 'keep') continue
    const range = locateJsonPathRange(doc, item.path)
    if (!range) continue
    marks.push({ from: range.from, to: range.to, side: item.side })
  }
  return marks
}
