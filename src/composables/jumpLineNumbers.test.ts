import { describe, expect, it } from 'vitest'
import type { ConfigItemGroup } from './configItemDiff'
import { buildJumpLineNumberMaps, fieldLineNumberKey } from './jumpLineNumbers'

const leftDoc = `{
  "title": "old",
  "gone": 1
}`

const rightDoc = `{
  "pad": 0,
  "title": "new",
  "fresh": 2
}`

const titleGroup: ConfigItemGroup = {
  id: 'title',
  path: [{ type: 'key', key: 'title' }],
  kind: 'modified',
  changeCount: 1,
  fields: [
    {
      path: [{ type: 'key', key: 'title' }],
      relativeLabel: 'title',
      kind: 'modified',
      leftText: '"old"',
      rightText: '"new"',
    },
  ],
}

const goneGroup: ConfigItemGroup = {
  id: 'gone',
  path: [{ type: 'key', key: 'gone' }],
  kind: 'removed',
  changeCount: 1,
  fields: [
    {
      path: [{ type: 'key', key: 'gone' }],
      relativeLabel: 'gone',
      kind: 'removed',
      leftText: '1',
      rightText: '',
    },
  ],
}

const freshGroup: ConfigItemGroup = {
  id: 'fresh',
  path: [{ type: 'key', key: 'fresh' }],
  kind: 'added',
  changeCount: 1,
  fields: [
    {
      path: [{ type: 'key', key: 'fresh' }],
      relativeLabel: 'fresh',
      kind: 'added',
      leftText: '',
      rightText: '2',
    },
  ],
}

describe('fieldLineNumberKey', () => {
  it('字段行号键为 groupId:fieldIndex', () => {
    expect(fieldLineNumberKey('tableGrid[0]', 2)).toBe('tableGrid[0]:2')
  })
})

describe('buildJumpLineNumberMaps', () => {
  it('修改组与字段用目标文档行号，且每个键只有一个行号', () => {
    const maps = buildJumpLineNumberMaps({
      groups: [titleGroup],
      leftDoc,
      rightDoc,
    })
    // 目标侧 "title" 在第 3 行；参考侧在第 2 行。只写目标行号。
    expect(maps.groupLineNumbers.title).toBe(3)
    expect(maps.fieldLineNumbers[fieldLineNumberKey('title', 0)]).toBe(3)
    expect(Object.keys(maps.groupLineNumbers)).toEqual(['title'])
    expect(Object.keys(maps.fieldLineNumbers)).toEqual(['title:0'])
  })

  it('删除组与字段用参考文档行号', () => {
    const maps = buildJumpLineNumberMaps({
      groups: [goneGroup],
      leftDoc,
      rightDoc,
    })
    expect(maps.groupLineNumbers.gone).toBe(3)
    expect(maps.fieldLineNumbers[fieldLineNumberKey('gone', 0)]).toBe(3)
  })

  it('新增组与字段用目标文档行号', () => {
    const maps = buildJumpLineNumberMaps({
      groups: [freshGroup],
      leftDoc,
      rightDoc,
    })
    expect(maps.groupLineNumbers.fresh).toBe(4)
    expect(maps.fieldLineNumbers[fieldLineNumberKey('fresh', 0)]).toBe(4)
  })

  it('空 path 组按偏移 0 写成第 1 行', () => {
    const rootGroup: ConfigItemGroup = {
      id: '（根）',
      path: [],
      kind: 'modified',
      changeCount: 1,
      fields: [],
    }
    const maps = buildJumpLineNumberMaps({
      groups: [rootGroup],
      leftDoc,
      rightDoc,
    })
    expect(maps.groupLineNumbers['（根）']).toBe(1)
  })

  it('组 path 失败时回退首字段 path', () => {
    const fallbackGroup: ConfigItemGroup = {
      id: 'ghost',
      path: [{ type: 'key', key: 'doesNotExist' }],
      kind: 'modified',
      changeCount: 1,
      fields: [
        {
          path: [{ type: 'key', key: 'title' }],
          relativeLabel: 'title',
          kind: 'modified',
          leftText: '"old"',
          rightText: '"new"',
        },
      ],
    }
    const maps = buildJumpLineNumberMaps({
      groups: [fallbackGroup],
      leftDoc,
      rightDoc,
    })
    expect(maps.groupLineNumbers.ghost).toBe(3)
  })

  it('找不到偏移时不写入该键', () => {
    const missing: ConfigItemGroup = {
      id: 'missing',
      path: [{ type: 'key', key: 'nope' }],
      kind: 'modified',
      changeCount: 1,
      fields: [
        {
          path: [{ type: 'key', key: 'alsoNope' }],
          relativeLabel: 'alsoNope',
          kind: 'modified',
          leftText: '1',
          rightText: '2',
        },
      ],
    }
    const maps = buildJumpLineNumberMaps({
      groups: [missing],
      leftDoc,
      rightDoc,
    })
    expect(maps.groupLineNumbers).toEqual({})
    expect(maps.fieldLineNumbers).toEqual({})
    expect(maps.groupOffsets).toEqual([])
  })

  it('groupOffsets 与组行号同源，删除组用参考文档偏移', () => {
    const maps = buildJumpLineNumberMaps({
      groups: [titleGroup, goneGroup, freshGroup],
      leftDoc,
      rightDoc,
    })
    expect(maps.groupOffsets).toEqual([
      { id: 'title', offset: rightDoc.indexOf('"title"'), kind: 'modified' },
      { id: 'gone', offset: leftDoc.indexOf('"gone"'), kind: 'removed' },
      { id: 'fresh', offset: rightDoc.indexOf('"fresh"'), kind: 'added' },
    ])
  })
})
