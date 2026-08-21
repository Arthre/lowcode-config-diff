import { describe, expect, it } from 'vitest'
import type { ConfigItemGroup } from './configItemDiff'
import {
  directoryGroupAncestorIds,
  firstDirectoryLeafId,
  foldDirectoryGroups,
} from './directoryPathTree'

function group(
  id: string,
  path: ConfigItemGroup['path'],
  kind: ConfigItemGroup['kind'] = 'modified',
): ConfigItemGroup {
  return {
    id,
    path,
    kind,
    changeCount: 1,
    fields: [
      {
        path,
        relativeLabel: 'label',
        kind,
        leftText: '"a"',
        rightText: '"b"',
      },
    ],
  }
}

describe('foldDirectoryGroups', () => {
  it('把 tableGrid[13] 到 [16] 折成一个一级 tableGrid 与四个子项', () => {
    const groups = [13, 14, 15, 16].map((index) =>
      group(`tableGrid[${index}]`, [
        { type: 'key', key: 'tableGrid' },
        { type: 'index', index },
      ]),
    )
    const tree = foldDirectoryGroups(groups)
    expect(tree).toHaveLength(1)
    expect(tree[0]?.id).toBe('tableGrid')
    expect(tree[0]?.group).toBeNull()
    expect(tree[0]?.children.map((child) => child.label)).toEqual(['[13]', '[14]', '[15]', '[16]'])
    expect(tree[0]?.children.map((child) => child.group?.id)).toEqual([
      'tableGrid[13]',
      'tableGrid[14]',
      'tableGrid[15]',
      'tableGrid[16]',
    ])
    expect(tree[0]?.children.map((child) => child.group?.fields)).toEqual(
      groups.map((g) => g.fields),
    )
    expect(tree[0]?.changeCount).toBe(4)
  })

  it('title 与 tableGrid[0] 仍是两个一级', () => {
    const tree = foldDirectoryGroups([
      group('title', [{ type: 'key', key: 'title' }]),
      group('tableGrid[0]', [
        { type: 'key', key: 'tableGrid' },
        { type: 'index', index: 0 },
      ]),
    ])
    expect(tree.map((node) => node.id)).toEqual(['title', 'tableGrid'])
    expect(tree[0]?.children).toEqual([])
    expect(tree[0]?.group?.id).toBe('title')
    expect(tree[1]?.children).toHaveLength(1)
    expect(tree[1]?.children[0]?.label).toBe('[0]')
  })

  it('非数组 key 不折叠', () => {
    const tree = foldDirectoryGroups([
      group('pagination', [{ type: 'key', key: 'pagination' }]),
      group('title', [{ type: 'key', key: 'title' }], 'removed'),
    ])
    expect(tree.map((node) => node.id)).toEqual(['pagination', 'title'])
    expect(tree.every((node) => node.children.length === 0 && node.group !== null)).toBe(true)
  })
})

describe('directoryGroupAncestorIds', () => {
  it('数组项含父路径与自身', () => {
    expect(
      directoryGroupAncestorIds(
        group('tableGrid[13]', [
          { type: 'key', key: 'tableGrid' },
          { type: 'index', index: 13 },
        ]),
      ),
    ).toEqual(['tableGrid', 'tableGrid[13]'])
  })

  it('非数组根只有自身', () => {
    expect(directoryGroupAncestorIds(group('title', [{ type: 'key', key: 'title' }]))).toEqual([
      'title',
    ])
  })
})

describe('firstDirectoryLeafId', () => {
  it('数组父节点落到第一个子配置项', () => {
    const tree = foldDirectoryGroups([
      group('tableGrid[13]', [
        { type: 'key', key: 'tableGrid' },
        { type: 'index', index: 13 },
      ]),
      group('tableGrid[14]', [
        { type: 'key', key: 'tableGrid' },
        { type: 'index', index: 14 },
      ]),
    ])
    expect(tree[0] && firstDirectoryLeafId(tree[0])).toBe('tableGrid[13]')
  })
})
