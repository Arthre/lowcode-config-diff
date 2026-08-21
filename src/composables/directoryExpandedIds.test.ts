import { describe, expect, it } from 'vitest'
import type { ConfigItemGroup } from './configItemDiff'
import { resolveDirectoryExpandedIds, toggleDirectoryGroupCollapse } from './directoryExpandedIds'

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

describe('resolveDirectoryExpandedIds', () => {
  it('无当前组时只保留用户展开且未折起的节点', () => {
    const ids = resolveDirectoryExpandedIds({
      activeGroupId: '',
      activeGroup: undefined,
      userExpandedIds: new Set(['tableGrid']),
      userCollapsedIds: new Set(),
    })
    expect(ids).toEqual(['tableGrid'])
  })

  it('当前数组项会展开父路径，除非用户主动折起', () => {
    const active = group('tableGrid[13]', [
      { type: 'key', key: 'tableGrid' },
      { type: 'index', index: 13 },
    ])
    expect(
      resolveDirectoryExpandedIds({
        activeGroupId: active.id,
        activeGroup: active,
        userExpandedIds: new Set(),
        userCollapsedIds: new Set(),
      }),
    ).toEqual(['tableGrid', 'tableGrid[13]'])

    expect(
      resolveDirectoryExpandedIds({
        activeGroupId: active.id,
        activeGroup: active,
        userExpandedIds: new Set(),
        userCollapsedIds: new Set(['tableGrid']),
      }),
    ).toEqual(['tableGrid[13]'])
  })

  it('userCollapsedIds 优先于 userExpandedIds', () => {
    expect(
      resolveDirectoryExpandedIds({
        activeGroupId: '',
        activeGroup: undefined,
        userExpandedIds: new Set(['tableGrid']),
        userCollapsedIds: new Set(['tableGrid']),
      }),
    ).toEqual([])
  })

  it('当前深路径项会展开每一段祖先', () => {
    const active = group('form.items[0]', [
      { type: 'key', key: 'form' },
      { type: 'key', key: 'items' },
      { type: 'index', index: 0 },
    ])
    expect(
      resolveDirectoryExpandedIds({
        activeGroupId: active.id,
        activeGroup: active,
        userExpandedIds: new Set(),
        userCollapsedIds: new Set(),
      }),
    ).toEqual(['form', 'form.items', 'form.items[0]'])
  })

  it('当前为 title 时手动展开 tableGrid 后可被折起', () => {
    const title = group('title', [{ type: 'key', key: 'title' }])
    expect(
      resolveDirectoryExpandedIds({
        activeGroupId: title.id,
        activeGroup: title,
        userExpandedIds: new Set(['tableGrid']),
        userCollapsedIds: new Set(['tableGrid']),
      }),
    ).toEqual(['title'])
  })

  it('非数组根只有自身', () => {
    const title = group('title', [{ type: 'key', key: 'title' }])
    expect(
      resolveDirectoryExpandedIds({
        activeGroupId: title.id,
        activeGroup: title,
        userExpandedIds: new Set(),
        userCollapsedIds: new Set(),
      }),
    ).toEqual(['title'])
  })
})

describe('toggleDirectoryGroupCollapse', () => {
  it('折起时从 userExpandedIds 移除同一 id', () => {
    const result = toggleDirectoryGroupCollapse('tableGrid', new Set(), new Set(['tableGrid']))
    expect([...result.userCollapsedIds]).toEqual(['tableGrid'])
    expect([...result.userExpandedIds]).toEqual([])
  })

  it('再次展开只改 userCollapsedIds', () => {
    const result = toggleDirectoryGroupCollapse('tableGrid', new Set(['tableGrid']), new Set())
    expect([...result.userCollapsedIds]).toEqual([])
    expect([...result.userExpandedIds]).toEqual([])
  })
})
