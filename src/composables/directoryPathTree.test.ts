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
  changeCount = 1,
): ConfigItemGroup {
  return {
    id,
    path,
    kind,
    changeCount,
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
  it('把 tableGrid[13] 到 [16] 折成 tableGrid 与四个下标子项', () => {
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

  it('单段对象 key 仍各自为一级叶子', () => {
    const tree = foldDirectoryGroups([
      group('pagination', [{ type: 'key', key: 'pagination' }]),
      group('title', [{ type: 'key', key: 'title' }], 'removed'),
    ])
    expect(tree.map((node) => node.id)).toEqual(['pagination', 'title'])
    expect(tree.every((node) => node.children.length === 0 && node.group !== null)).toBe(true)
  })

  it('按完整 JSON path 逐段建深树', () => {
    const tree = foldDirectoryGroups([
      group('form.items[0]', [
        { type: 'key', key: 'form' },
        { type: 'key', key: 'items' },
        { type: 'index', index: 0 },
      ]),
      group(
        'form.items[1]',
        [
          { type: 'key', key: 'form' },
          { type: 'key', key: 'items' },
          { type: 'index', index: 1 },
        ],
        'added',
      ),
    ])
    expect(tree.map((node) => node.id)).toEqual(['form'])
    expect(tree[0]?.label).toBe('form')
    expect(tree[0]?.group).toBeNull()
    expect(tree[0]?.children.map((child) => child.id)).toEqual(['form.items'])
    expect(tree[0]?.children[0]?.label).toBe('items')
    expect(tree[0]?.children[0]?.children.map((child) => child.label)).toEqual(['[0]', '[1]'])
    expect(tree[0]?.children[0]?.children.map((child) => child.group?.id)).toEqual([
      'form.items[0]',
      'form.items[1]',
    ])
    expect(tree[0]?.changeCount).toBe(2)
    expect(tree[0]?.kind).toBe('modified')
  })

  it('中间路径既可挂 group 也可有子节点', () => {
    const formGroup = group('form', [{ type: 'key', key: 'form' }], 'modified', 2)
    const itemGroup = group(
      'form.items[0]',
      [
        { type: 'key', key: 'form' },
        { type: 'key', key: 'items' },
        { type: 'index', index: 0 },
      ],
      'added',
    )
    const tree = foldDirectoryGroups([formGroup, itemGroup])
    expect(tree[0]?.group?.id).toBe('form')
    expect(tree[0]?.children[0]?.id).toBe('form.items')
    expect(tree[0]?.children[0]?.children[0]?.group?.id).toBe('form.items[0]')
    expect(tree[0]?.changeCount).toBe(3)
  })

  it('空 path 根组单独成一级', () => {
    const tree = foldDirectoryGroups([group('（根）', [])])
    expect(tree).toHaveLength(1)
    expect(tree[0]?.id).toBe('（根）')
    expect(tree[0]?.label).toBe('（根）')
    expect(tree[0]?.group?.id).toBe('（根）')
    expect(tree[0]?.children).toEqual([])
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

  it('深路径返回每一段祖先', () => {
    expect(
      directoryGroupAncestorIds(
        group('form.items[0]', [
          { type: 'key', key: 'form' },
          { type: 'key', key: 'items' },
          { type: 'index', index: 0 },
        ]),
      ),
    ).toEqual(['form', 'form.items', 'form.items[0]'])
  })

  it('非数组根只有自身', () => {
    expect(directoryGroupAncestorIds(group('title', [{ type: 'key', key: 'title' }]))).toEqual([
      'title',
    ])
  })

  it('空 path 只有根 id', () => {
    expect(directoryGroupAncestorIds(group('（根）', []))).toEqual(['（根）'])
  })
})

describe('firstDirectoryLeafId', () => {
  it('深树父节点落到第一个带配置项的后代', () => {
    const tree = foldDirectoryGroups([
      group('form.items[13]', [
        { type: 'key', key: 'form' },
        { type: 'key', key: 'items' },
        { type: 'index', index: 13 },
      ]),
      group('form.items[14]', [
        { type: 'key', key: 'form' },
        { type: 'key', key: 'items' },
        { type: 'index', index: 14 },
      ]),
    ])
    expect(tree[0] && firstDirectoryLeafId(tree[0])).toBe('form.items[13]')
  })
})
