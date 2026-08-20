import type { ConfigItemGroup } from './configItemDiff'
import { jsonPathOffset } from './jsonPathOffset'
import { lineNumberAtOffset } from './lineNumberAtOffset'

/** 与 ChunkJumpList.fieldLineLabel 键格式一致。 */
export function fieldLineNumberKey(groupId: string, fieldIndex: number): string {
  return `${groupId}:${fieldIndex}`
}

function sourceOfKind(kind: ConfigItemGroup['kind'], leftDoc: string, rightDoc: string): string {
  return kind === 'removed' ? leftDoc : rightDoc
}

function offsetOfGroup(group: ConfigItemGroup, source: string): number | null {
  const fromPath = jsonPathOffset(source, group.path)
  if (fromPath !== null) return fromPath
  const firstField = group.fields[0]
  if (firstField === undefined) return null
  return jsonPathOffset(source, firstField.path)
}

/** 组/字段跳转侧行号；找不到偏移则不写该键。删除用参考文档，其余用目标文档。 */
export function buildJumpLineNumberMaps(options: {
  groups: readonly ConfigItemGroup[]
  leftDoc: string
  rightDoc: string
}): { groupLineNumbers: Record<string, number>; fieldLineNumbers: Record<string, number> } {
  const groupLineNumbers: Record<string, number> = {}
  const fieldLineNumbers: Record<string, number> = {}

  for (const group of options.groups) {
    const groupSource = sourceOfKind(group.kind, options.leftDoc, options.rightDoc)
    const groupOffset = offsetOfGroup(group, groupSource)
    if (groupOffset !== null) {
      groupLineNumbers[group.id] = lineNumberAtOffset(groupSource, groupOffset)
    }

    group.fields.forEach((field, fieldIndex) => {
      const fieldSource = sourceOfKind(field.kind, options.leftDoc, options.rightDoc)
      const fieldOffset = jsonPathOffset(fieldSource, field.path)
      if (fieldOffset === null) return
      fieldLineNumbers[fieldLineNumberKey(group.id, fieldIndex)] = lineNumberAtOffset(
        fieldSource,
        fieldOffset,
      )
    })
  }

  return { groupLineNumbers, fieldLineNumbers }
}
