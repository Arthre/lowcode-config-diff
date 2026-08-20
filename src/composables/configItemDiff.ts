import { deepEqual } from '@/core/equal'
import { parseConfig } from '@/core/parse'
import type { JsonPathSeg } from './jsonPathOffset'

export type ConfigFieldChange = {
  path: JsonPathSeg[]
  relativeLabel: string
  kind: 'added' | 'removed' | 'modified'
  leftText: string
  rightText: string
}

export type ConfigItemGroup = {
  id: string
  path: JsonPathSeg[]
  kind: 'added' | 'removed' | 'modified'
  changeCount: number
  fields: ConfigFieldChange[]
}

export type ConfigItemDiffResult = {
  available: boolean
  fields: number
  items: number
  groups: ConfigItemGroup[]
}

const VALUE_TEXT_LIMIT = 80

const unavailableResult: ConfigItemDiffResult = {
  available: false,
  fields: 0,
  items: 0,
  groups: [],
}

/** 将路径段格式化为 tableGrid[3]、pagination.pageSize 这类展示串。 */
export function formatJsonPath(path: readonly JsonPathSeg[]): string {
  let text = ''
  for (const seg of path) {
    if (seg.type === 'key') {
      text += text.length === 0 ? seg.key : `.${seg.key}`
    } else {
      text += `[${seg.index}]`
    }
  }
  return text
}

export function configItemFieldCountText(fields: number): string {
  return `${fields} 个字段变化`
}

export function configItemInvolveText(items: number): string {
  return `涉及 ${items} 个配置项`
}

function tryParseConfig(text: string) {
  try {
    return parseConfig(text)
  } catch {
    return null
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasObjectElement(items: readonly unknown[]): boolean {
  return items.some((item) => isPlainObject(item))
}

/**
 * 两侧都是数组且含 object 元素时按下标走；一侧 undefined、另一侧是含 object 的数组时，缺席侧当成 []。
 * object 与 array 类型冲突不走下标。
 */
function arrayForIndexWalk(self: unknown, other: unknown): unknown[] | null {
  if (
    Array.isArray(self) &&
    Array.isArray(other) &&
    (hasObjectElement(self) || hasObjectElement(other))
  ) {
    return self
  }
  if (self === undefined && Array.isArray(other) && hasObjectElement(other)) return []
  if (Array.isArray(self) && other === undefined && hasObjectElement(self)) return self
  return null
}

function formatPathSeg(seg: JsonPathSeg): string {
  return seg.type === 'key' ? seg.key : `[${seg.index}]`
}

/** 叶子归组：最近的 index 段（含该段）；没有 index 则取第一段顶层 key。 */
function groupPathOf(path: readonly JsonPathSeg[]): JsonPathSeg[] {
  for (let i = path.length - 1; i >= 0; i--) {
    const seg = path[i]
    if (seg !== undefined && seg.type === 'index') {
      return path.slice(0, i + 1)
    }
  }
  return path.slice(0, 1)
}

function relativeLabelOf(path: readonly JsonPathSeg[], groupPath: readonly JsonPathSeg[]): string {
  const formatted = formatJsonPath(path.slice(groupPath.length))
  if (formatted !== '') return formatted
  const last = path[path.length - 1]
  return last === undefined ? '' : formatPathSeg(last)
}

function valueAt(root: unknown, path: readonly JsonPathSeg[]): unknown {
  let current: unknown = root
  for (const seg of path) {
    if (current === undefined || current === null) return undefined
    if (seg.type === 'key') {
      if (!isPlainObject(current)) return undefined
      current = current[seg.key]
      continue
    }
    if (!Array.isArray(current)) return undefined
    current = current[seg.index]
  }
  return current
}

function unionObjectKeys(left: Record<string, unknown>, right: Record<string, unknown>): string[] {
  const keys = Object.keys(left)
  for (const key of Object.keys(right)) {
    if (!Object.prototype.hasOwnProperty.call(left, key)) {
      keys.push(key)
    }
  }
  return keys
}

function changeKind(left: unknown, right: unknown): ConfigFieldChange['kind'] {
  if (left === undefined) return 'added'
  if (right === undefined) return 'removed'
  return 'modified'
}

function displayText(value: unknown): string {
  if (value === undefined) return ''
  const text = JSON.stringify(value)
  return text.length > VALUE_TEXT_LIMIT ? `${text.slice(0, VALUE_TEXT_LIMIT)}…` : text
}

/** 两侧均能 parseConfig 时按对象/数组走树，产出配置项分组与字段变化。 */
export function diffConfigItems(leftText: string, rightText: string): ConfigItemDiffResult {
  const leftRoot = tryParseConfig(leftText)
  const rightRoot = tryParseConfig(rightText)
  if (leftRoot === null || rightRoot === null) return unavailableResult

  const groups: ConfigItemGroup[] = []
  const groupsById = new Map<string, ConfigItemGroup>()

  const emitLeaf = (path: JsonPathSeg[], left: unknown, right: unknown) => {
    const groupPath = groupPathOf(path)
    const formattedId = formatJsonPath(groupPath)
    const id = formattedId === '' ? '（根）' : formattedId
    let group = groupsById.get(id)
    if (group === undefined) {
      group = {
        id,
        path: groupPath,
        kind: changeKind(valueAt(leftRoot, groupPath), valueAt(rightRoot, groupPath)),
        changeCount: 0,
        fields: [],
      }
      groupsById.set(id, group)
      groups.push(group)
    }
    group.fields.push({
      path: path.slice(),
      relativeLabel: relativeLabelOf(path, groupPath),
      kind: changeKind(left, right),
      leftText: displayText(left),
      rightText: displayText(right),
    })
    group.changeCount = group.fields.length
  }

  const walk = (path: JsonPathSeg[], left: unknown, right: unknown) => {
    if (deepEqual(left, right)) return

    if (isPlainObject(left) && isPlainObject(right)) {
      for (const key of unionObjectKeys(left, right)) {
        walk([...path, { type: 'key', key }], left[key], right[key])
      }
      return
    }

    const leftItems = arrayForIndexWalk(left, right)
    const rightItems = arrayForIndexWalk(right, left)
    if (leftItems !== null && rightItems !== null) {
      const maxLen = Math.max(leftItems.length, rightItems.length)
      for (let index = 0; index < maxLen; index++) {
        walk([...path, { type: 'index', index }], leftItems[index], rightItems[index])
      }
      return
    }

    emitLeaf(path, left, right)
  }

  walk([], leftRoot, rightRoot)

  return {
    available: true,
    fields: groups.reduce((sum, group) => sum + group.fields.length, 0),
    items: groups.length,
    groups,
  }
}
