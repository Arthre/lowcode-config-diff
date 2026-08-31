import { Change, Chunk } from '@codemirror/merge'
import { Text } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { diffByLine, mergeViewDiffConfig, takeLastDiffCoarse, tokenizeLines } from './diffByLine'

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

describe('tokenizeLines', () => {
  it('maxUnique 为 1 且存在两种不同行时返回 null', () => {
    expect(tokenizeLines(['a\n', 'b\n'], 1)).toBeNull()
  })

  it('maxUnique 为 1 且仅一种行时返回 token', () => {
    const tokens = tokenizeLines(['a\n', 'a\n'], 1)
    expect(tokens).toHaveLength(2)
    expect(tokens?.[0]).toBe(tokens?.[1])
  })
})

describe('takeLastDiffCoarse', () => {
  it('小文件按行对照后不是过粗', () => {
    diffByLine('A\nSAME\nC', 'B\nSAME\nD')
    expect(takeLastDiffCoarse()).toBe(false)
  })
})
