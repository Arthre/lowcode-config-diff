import { Change, Chunk } from '@codemirror/merge'
import { Text } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { diffByLine, mergeViewDiffConfig } from './diffByLine'

function sliceChange(text: string, change: Change, side: 'A' | 'B'): string {
  return side === 'A' ? text.slice(change.fromA, change.toA) : text.slice(change.fromB, change.toB)
}

describe('diffByLine', () => {
  it('仅一行不同时变更区间只覆盖该行', () => {
    const left = ['"sortable": true,', '"sortOrder": 1,', '"columnType": "storeDict"'].join('\n')
    const right = ['"sortable": false,', '"sortOrder": 1,', '"columnType": "storeDict"'].join('\n')
    const changes = diffByLine(left, right)
    expect(changes).toHaveLength(1)
    expect(sliceChange(left, changes[0]!, 'A')).toBe('"sortable": true,\n')
    expect(sliceChange(right, changes[0]!, 'B')).toBe('"sortable": false,\n')
  })

  it('中间相同行不纳入变更区间', () => {
    const left = ['A', 'SAME', 'C'].join('\n')
    const right = ['B', 'SAME', 'D'].join('\n')
    const changes = diffByLine(left, right)
    expect(changes).toHaveLength(2)
    expect(sliceChange(left, changes[0]!, 'A')).toBe('A\n')
    expect(sliceChange(right, changes[0]!, 'B')).toBe('B\n')
    expect(sliceChange(left, changes[1]!, 'A')).toBe('C')
    expect(sliceChange(right, changes[1]!, 'B')).toBe('D')
  })

  it('两侧皆空时无变更', () => {
    expect(diffByLine('', '')).toEqual([])
  })

  it('MergeView 配置下相同行不会并进差异块', () => {
    const left = ['"sortable": true,', '"sortOrder": 1,', '"columnType": "storeDict"'].join('\n')
    const right = ['"sortable": false,', '"sortOrder": 1,', '"columnType": "storeDict"'].join('\n')
    const chunks = Chunk.build(
      Text.of(left.split('\n')),
      Text.of(right.split('\n')),
      mergeViewDiffConfig,
    )
    expect(chunks).toHaveLength(1)
    const chunk = chunks[0]!
    expect(left.slice(chunk.fromA, chunk.endA)).toContain('"sortable": true')
    expect(left.slice(chunk.fromA, chunk.endA)).not.toContain('sortOrder')
  })
})
