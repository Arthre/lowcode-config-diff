import type { ConfigItemGroup } from './configItemDiff'
import { jsonPathOffsets, type JsonPathSeg } from './jsonPathOffset'
import { createLineNumberLocator } from './lineNumberAtOffset'

/** 与 ChunkJumpList.fieldLineLabel 键格式一致。 */
export function fieldLineNumberKey(groupId: string, fieldIndex: number): string {
  return `${groupId}:${fieldIndex}`
}

export type JumpGroupOffset = {
  id: string
  offset: number
  kind: ConfigItemGroup['kind']
}

type QuerySlot =
  | { kind: 'group-primary'; id: string }
  | { kind: 'group-fallback'; id: string }
  | { kind: 'field'; groupId: string; fieldIndex: number }

function sideOf(kind: ConfigItemGroup['kind']): 'left' | 'right' {
  return kind === 'removed' ? 'left' : 'right'
}

/** 组/字段跳转侧行号与组偏移；找不到偏移则不写该键。删除用参考文档，其余用目标文档。 */
export function buildJumpLineNumberMaps(options: {
  groups: readonly ConfigItemGroup[]
  leftDoc: string
  rightDoc: string
}): {
  groupLineNumbers: Record<string, number>
  fieldLineNumbers: Record<string, number>
  groupOffsets: JumpGroupOffset[]
} {
  const groupLineNumbers: Record<string, number> = {}
  const fieldLineNumbers: Record<string, number> = {}
  const groupOffsets: JumpGroupOffset[] = []

  if (options.groups.length === 0) {
    return { groupLineNumbers, fieldLineNumbers, groupOffsets }
  }

  const leftPaths: JsonPathSeg[][] = []
  const rightPaths: JsonPathSeg[][] = []
  const leftSlots: QuerySlot[] = []
  const rightSlots: QuerySlot[] = []

  const enqueue = (side: 'left' | 'right', path: JsonPathSeg[], slot: QuerySlot) => {
    if (side === 'left') {
      leftPaths.push(path)
      leftSlots.push(slot)
      return
    }
    rightPaths.push(path)
    rightSlots.push(slot)
  }

  for (const group of options.groups) {
    const groupSide = sideOf(group.kind)
    enqueue(groupSide, group.path, { kind: 'group-primary', id: group.id })
    const firstField = group.fields[0]
    if (firstField !== undefined) {
      enqueue(groupSide, firstField.path, { kind: 'group-fallback', id: group.id })
    }
    group.fields.forEach((field, fieldIndex) => {
      enqueue(sideOf(field.kind), field.path, {
        kind: 'field',
        groupId: group.id,
        fieldIndex,
      })
    })
  }

  const leftHits = leftPaths.length === 0 ? [] : jsonPathOffsets(options.leftDoc, leftPaths)
  const rightHits = rightPaths.length === 0 ? [] : jsonPathOffsets(options.rightDoc, rightPaths)
  const leftLineAt = leftPaths.length === 0 ? () => 1 : createLineNumberLocator(options.leftDoc)
  const rightLineAt = rightPaths.length === 0 ? () => 1 : createLineNumberLocator(options.rightDoc)

  const primaryById = new Map<string, number | null>()
  const fallbackById = new Map<string, number | null>()

  const takeHits = (
    hits: readonly (number | null)[],
    slots: readonly QuerySlot[],
    lineAt: (offset: number) => number,
  ) => {
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      if (slot === undefined) continue
      const offset = hits[i] ?? null
      if (slot.kind === 'field') {
        if (offset === null) continue
        fieldLineNumbers[fieldLineNumberKey(slot.groupId, slot.fieldIndex)] = lineAt(offset)
        continue
      }
      if (slot.kind === 'group-primary') primaryById.set(slot.id, offset)
      else fallbackById.set(slot.id, offset)
    }
  }

  takeHits(leftHits, leftSlots, leftLineAt)
  takeHits(rightHits, rightSlots, rightLineAt)

  for (const group of options.groups) {
    const offset = primaryById.get(group.id) ?? fallbackById.get(group.id)
    if (offset === undefined || offset === null) continue
    const lineAt = group.kind === 'removed' ? leftLineAt : rightLineAt
    groupLineNumbers[group.id] = lineAt(offset)
    groupOffsets.push({ id: group.id, offset, kind: group.kind })
  }

  return { groupLineNumbers, fieldLineNumbers, groupOffsets }
}
