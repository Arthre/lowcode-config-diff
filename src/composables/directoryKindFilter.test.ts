import { describe, expect, it } from 'vitest'
import type { ConfigItemGroup } from './configItemDiff'
import {
  directoryKindFilterEmptyText,
  filterConfigItemGroups,
  filterJumpItems,
} from './directoryKindFilter'

const groups: ConfigItemGroup[] = [
  {
    id: 'pagination',
    path: [{ type: 'key', key: 'pagination' }],
    kind: 'modified',
    changeCount: 2,
    fields: [
      {
        path: [],
        relativeLabel: 'pageSize',
        kind: 'modified',
        leftText: '10',
        rightText: '20',
      },
      {
        path: [],
        relativeLabel: 'showExport',
        kind: 'removed',
        leftText: 'true',
        rightText: '',
      },
    ],
  },
  {
    id: 'tableGrid[1]',
    path: [
      { type: 'key', key: 'tableGrid' },
      { type: 'index', index: 1 },
    ],
    kind: 'added',
    changeCount: 1,
    fields: [
      {
        path: [],
        relativeLabel: 'prop',
        kind: 'added',
        leftText: '',
        rightText: '"status"',
      },
    ],
  },
]

describe('filterConfigItemGroups', () => {
  it('全部时组数不变', () => {
    expect(filterConfigItemGroups(groups, 'all')).toHaveLength(2)
  })

  it('只看删除时只留删除叶子并改 changeCount', () => {
    const next = filterConfigItemGroups(groups, 'removed')
    expect(next).toHaveLength(1)
    expect(next[0]?.id).toBe('pagination')
    expect(next[0]?.changeCount).toBe(1)
    expect(next[0]?.kind).toBe('removed')
    expect(next[0]?.fields.every((f) => f.kind === 'removed')).toBe(true)
  })

  it('只看新增时丢掉没有新增叶子的组', () => {
    const next = filterConfigItemGroups(groups, 'added')
    expect(next.map((g) => g.id)).toEqual(['tableGrid[1]'])
  })
})

describe('filterJumpItems', () => {
  it('扁平块按 kind 过滤', () => {
    const items = [
      { kind: 'added' as const, index: 0 },
      { kind: 'removed' as const, index: 1 },
    ]
    expect(filterJumpItems(items, 'removed').map((i) => i.index)).toEqual([1])
  })
})

describe('directoryKindFilterEmptyText', () => {
  it('按筛选给出空态文案', () => {
    expect(directoryKindFilterEmptyText('all')).toBe('没有差异块')
    expect(directoryKindFilterEmptyText('removed')).toBe('没有删除项')
  })
})
