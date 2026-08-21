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

/** 目录顶栏。fields<=0 返回 '' */
export function directoryFieldSummaryText(fields: number, items: number): string {
  if (fields <= 0) return ''
  return `${configItemFieldCountText(fields)} · ${configItemInvolveText(items)}`
}

export function formatJumpLineNumber(line: number): string {
  if (line <= 0) return ''
  return `L${line}`
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
 * 两侧都是数组且含 object 元素时走数组对齐；一侧 undefined、另一侧是含 object 的数组时，缺席侧当成 []。
 * object 与 array 类型冲突不走数组。
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

/** 低代码配置项认身键：优先 fieldName，其次 field / id。 */
function objectArrayIdentityKey(item: unknown): string | null {
  if (!isPlainObject(item)) return null
  for (const prop of ['fieldName', 'field', 'id'] as const) {
    const value = item[prop]
    if (typeof value === 'string' && value !== '') return value
  }
  return null
}

type ArrayAlignPair = { leftIndex: number | null; rightIndex: number | null }

/**
 * 对象数组对齐：有认身键时先按键配对；未匹配且带认身键的项各自记增/删，不交叉配对；
 * 无认身键的剩余项再按下标补齐；全无认身键时仍全按下标。
 */
function alignObjectArrayItems(leftItems: unknown[], rightItems: unknown[]): ArrayAlignPair[] {
  const leftKeys = leftItems.map(objectArrayIdentityKey)
  const rightKeys = rightItems.map(objectArrayIdentityKey)
  const hasIdentity = leftKeys.some((key) => key !== null) || rightKeys.some((key) => key !== null)

  if (!hasIdentity) {
    const maxLen = Math.max(leftItems.length, rightItems.length)
    return Array.from({ length: maxLen }, (_, index) => ({
      leftIndex: index < leftItems.length ? index : null,
      rightIndex: index < rightItems.length ? index : null,
    }))
  }

  const rightByKey = new Map<string, number[]>()
  for (let index = 0; index < rightKeys.length; index += 1) {
    const key = rightKeys[index]
    if (key === null) continue
    const bucket = rightByKey.get(key)
    if (bucket === undefined) rightByKey.set(key, [index])
    else bucket.push(index)
  }

  const leftMatched = new Array<boolean>(leftItems.length).fill(false)
  const rightMatched = new Array<boolean>(rightItems.length).fill(false)
  const pairs: ArrayAlignPair[] = []

  for (let leftIndex = 0; leftIndex < leftItems.length; leftIndex += 1) {
    const key = leftKeys[leftIndex]
    if (key === null) continue
    const bucket = rightByKey.get(key)
    const rightIndex = bucket?.shift()
    if (rightIndex === undefined) continue
    leftMatched[leftIndex] = true
    rightMatched[rightIndex] = true
    pairs.push({ leftIndex, rightIndex })
  }

  const leftKeyedRemain: number[] = []
  const rightKeyedRemain: number[] = []
  const leftUnkeyedRemain: number[] = []
  const rightUnkeyedRemain: number[] = []
  for (let index = 0; index < leftItems.length; index += 1) {
    if (leftMatched[index]) continue
    if (leftKeys[index] !== null) leftKeyedRemain.push(index)
    else leftUnkeyedRemain.push(index)
  }
  for (let index = 0; index < rightItems.length; index += 1) {
    if (rightMatched[index]) continue
    if (rightKeys[index] !== null) rightKeyedRemain.push(index)
    else rightUnkeyedRemain.push(index)
  }

  for (const leftIndex of leftKeyedRemain) {
    pairs.push({ leftIndex, rightIndex: null })
  }
  for (const rightIndex of rightKeyedRemain) {
    pairs.push({ leftIndex: null, rightIndex })
  }

  const remainMax = Math.max(leftUnkeyedRemain.length, rightUnkeyedRemain.length)
  for (let index = 0; index < remainMax; index += 1) {
    pairs.push({
      leftIndex: leftUnkeyedRemain[index] ?? null,
      rightIndex: rightUnkeyedRemain[index] ?? null,
    })
  }

  pairs.sort((a, b) => {
    const ar = a.rightIndex ?? Number.MAX_SAFE_INTEGER
    const br = b.rightIndex ?? Number.MAX_SAFE_INTEGER
    if (ar !== br) return ar - br
    return (a.leftIndex ?? Number.MAX_SAFE_INTEGER) - (b.leftIndex ?? Number.MAX_SAFE_INTEGER)
  })
  return pairs
}

function groupKindFromFields(fields: readonly ConfigFieldChange[]): ConfigItemGroup['kind'] {
  const first = fields[0]?.kind
  if (first === undefined) return 'modified'
  return fields.every((field) => field.kind === first) ? first : 'modified'
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

  const emitLeaf = (
    rightPath: JsonPathSeg[],
    leftPath: JsonPathSeg[],
    left: unknown,
    right: unknown,
  ) => {
    const kind = changeKind(left, right)
    const anchorPath = right !== undefined ? rightPath : leftPath
    const groupPath = groupPathOf(anchorPath)
    const formattedId = formatJsonPath(groupPath)
    let id = formattedId === '' ? '（根）' : formattedId
    let group = groupsById.get(id)
    // 同下标一侧删除、一侧新增时拆成两个组，避免被合成「修改」
    if (group !== undefined) {
      const existingExclusive =
        group.fields.length > 0 &&
        group.fields.every((field) => field.kind === group.fields[0]?.kind)
      const oppositeOneSided =
        existingExclusive &&
        ((kind === 'removed' && group.fields[0]?.kind === 'added') ||
          (kind === 'added' && group.fields[0]?.kind === 'removed'))
      if (oppositeOneSided) {
        id = kind === 'removed' ? `${id}（删除）` : `${id}（新增）`
        group = groupsById.get(id)
      }
    }
    if (group === undefined) {
      group = {
        id,
        path: groupPath,
        kind,
        changeCount: 0,
        fields: [],
      }
      groupsById.set(id, group)
      groups.push(group)
    }
    const jumpPath = kind === 'removed' ? leftPath : rightPath
    group.fields.push({
      path: jumpPath.slice(),
      relativeLabel: relativeLabelOf(anchorPath, groupPath),
      kind,
      leftText: displayText(left),
      rightText: displayText(right),
    })
    group.changeCount = group.fields.length
    group.kind = groupKindFromFields(group.fields)
  }

  const walk = (
    rightPath: JsonPathSeg[],
    left: unknown,
    right: unknown,
    leftPath: JsonPathSeg[] = rightPath,
  ) => {
    if (deepEqual(left, right)) return

    if (isPlainObject(left) && isPlainObject(right)) {
      for (const key of unionObjectKeys(left, right)) {
        walk([...rightPath, { type: 'key', key }], left[key], right[key], [
          ...leftPath,
          { type: 'key', key },
        ])
      }
      return
    }

    const leftItems = arrayForIndexWalk(left, right)
    const rightItems = arrayForIndexWalk(right, left)
    if (leftItems !== null && rightItems !== null) {
      const pairs = alignObjectArrayItems(leftItems, rightItems)
      for (const pair of pairs) {
        const leftValue = pair.leftIndex === null ? undefined : leftItems[pair.leftIndex]
        const rightValue = pair.rightIndex === null ? undefined : rightItems[pair.rightIndex]
        const indexForRight =
          pair.rightIndex !== null ? pair.rightIndex : (pair.leftIndex as number)
        const indexForLeft = pair.leftIndex !== null ? pair.leftIndex : (pair.rightIndex as number)
        walk([...rightPath, { type: 'index', index: indexForRight }], leftValue, rightValue, [
          ...leftPath,
          { type: 'index', index: indexForLeft },
        ])
      }
      return
    }

    emitLeaf(rightPath, leftPath, left, right)
  }

  walk([], leftRoot, rightRoot)

  return {
    available: true,
    fields: groups.reduce((sum, group) => sum + group.fields.length, 0),
    items: groups.length,
    groups,
  }
}
