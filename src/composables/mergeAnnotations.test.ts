import { describe, expect, it } from 'vitest'
import {
  buildMergeAnnotations,
  buildSideMarksFromAnnotations,
  isDropLeaf,
  locateJsonPathRange,
} from './mergeAnnotations'
import type { DiffItem } from '@/core/types'

function leaf(
  partial: Partial<DiffItem> & Pick<DiffItem, 'id' | 'path' | 'type' | 'side'>,
): DiffItem {
  return { ...partial }
}

describe('isDropLeaf / buildMergeAnnotations', () => {
  it('added + prod 为 drop（未纳入结果）', () => {
    const item = leaf({
      id: 'a',
      path: ['a'],
      type: 'added',
      side: 'prod',
      testValue: 1,
    })
    expect(isDropLeaf(item)).toBe(true)
    const [anno] = buildMergeAnnotations([item])
    expect(anno?.effect).toBe('drop')
    expect(anno?.label).toContain('未纳入结果')
  })

  it('removed + test 为 drop', () => {
    const item = leaf({
      id: 'b',
      path: ['b'],
      type: 'removed',
      side: 'test',
      prodValue: 2,
    })
    expect(isDropLeaf(item)).toBe(true)
  })

  it('modified + prod 为 keep 且标注取 PROD', () => {
    const item = leaf({
      id: 'c',
      path: ['c'],
      type: 'modified',
      side: 'prod',
      testValue: 1,
      prodValue: 2,
    })
    expect(isDropLeaf(item)).toBe(false)
    const [anno] = buildMergeAnnotations([item])
    expect(anno?.effect).toBe('keep')
    expect(anno?.label).toBe('取 PROD')
    expect(anno?.pathText).toBe('c')
  })

  it('added + test 为 keep 取 TEST', () => {
    const item = leaf({
      id: 'd',
      path: ['d'],
      type: 'added',
      side: 'test',
      testValue: true,
    })
    const [anno] = buildMergeAnnotations([item])
    expect(anno?.effect).toBe('keep')
    expect(anno?.label).toBe('取 TEST')
  })
})

describe('locateJsonPathRange', () => {
  const doc = `{
  "alpha": 1,
  "nested": {
    "beta": "x",
    "gamma": [1, 2]
  }
}`

  it('定位顶层原始值', () => {
    const range = locateJsonPathRange(doc, ['alpha'])
    expect(range).not.toBeNull()
    expect(doc.slice(range!.from, range!.to)).toBe('1')
  })

  it('定位嵌套字符串', () => {
    const range = locateJsonPathRange(doc, ['nested', 'beta'])
    expect(range).not.toBeNull()
    expect(doc.slice(range!.from, range!.to)).toBe('"x"')
  })

  it('定位嵌套数组', () => {
    const range = locateJsonPathRange(doc, ['nested', 'gamma'])
    expect(range).not.toBeNull()
    expect(doc.slice(range!.from, range!.to)).toBe('[1, 2]')
  })

  it('缺失 path 返回 null', () => {
    expect(locateJsonPathRange(doc, ['missing'])).toBeNull()
  })

  it('空 path 覆盖全文', () => {
    const range = locateJsonPathRange(doc, [])
    expect(range).toEqual({ from: 0, to: doc.length })
  })
})

describe('buildSideMarksFromAnnotations', () => {
  it('仅为 keep 叶生成区间', () => {
    const doc = `{\n  "keepMe": 1,\n  "other": 2\n}`
    const annotations = buildMergeAnnotations([
      leaf({
        id: 'keepMe',
        path: ['keepMe'],
        type: 'modified',
        side: 'test',
        testValue: 1,
        prodValue: 9,
      }),
      leaf({
        id: 'gone',
        path: ['gone'],
        type: 'added',
        side: 'prod',
        testValue: 0,
      }),
    ])
    const marks = buildSideMarksFromAnnotations(doc, annotations)
    expect(marks).toHaveLength(1)
    expect(marks[0]?.side).toBe('test')
    expect(doc.slice(marks[0]!.from, marks[0]!.to)).toBe('1')
  })
})
