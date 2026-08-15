import { describe, expect, it } from 'vitest'
import { diffConfig } from '@/core/diff'
import {
  buildDiffTree,
  defaultSideForType,
  sideStateForPrefix,
  withAllSides,
  withDefaultSides,
  withDescendantSides,
  withSide,
} from './diffTreeModel'

describe('buildDiffTree', () => {
  it('默认仅差异：不含相同子树', () => {
    const test = { keep: 1, nest: { a: 1, b: 2 } }
    const prod = { keep: 1, nest: { a: 9, b: 2 } }
    const leaves = diffConfig(test, prod)
    const tree = buildDiffTree({ leaves, testConfig: test, prodConfig: prod, showUnchanged: false })
    const json = JSON.stringify(tree)
    expect(json).toContain('nest')
    expect(json).toContain('"a"')
    expect(json).not.toContain('"keep"')
    // b 相同，默认不出现
    expect(json.includes('"segment":"b"') || json.includes('"path":["nest","b"]')).toBe(false)
  })

  it('显示无差异时出现相同节点且为 equal', () => {
    const test = { keep: 1, x: 2 }
    const prod = { keep: 1, x: 3 }
    const leaves = diffConfig(test, prod)
    const tree = buildDiffTree({ leaves, testConfig: test, prodConfig: prod, showUnchanged: true })
    const flat: string[] = []
    const walk = (nodes: ReturnType<typeof buildDiffTree>) => {
      for (const n of nodes) {
        flat.push(`${n.segment}:${n.kind}`)
        walk(n.children)
      }
    }
    walk(tree)
    expect(flat.some((s) => s.startsWith('keep:equal'))).toBe(true)
    expect(flat.some((s) => s.startsWith('x:diff-leaf'))).toBe(true)
  })

  it('根 array 整段差异为单个 diff-leaf', () => {
    const test = [1, 2]
    const prod = [1, 3]
    const leaves = diffConfig(test, prod)
    const tree = buildDiffTree({ leaves, testConfig: test, prodConfig: prod, showUnchanged: false })
    expect(tree).toHaveLength(1)
    expect(tree[0]?.kind).toBe('diff-leaf')
    expect(tree[0]?.path).toEqual([])
  })
})

describe('选边工具', () => {
  const leaves = diffConfig({ a: 1, b: 2 }, { a: 9, c: 3 })

  it('defaultSideForType 符合 M2 表', () => {
    expect(defaultSideForType('modified')).toBe('test')
    expect(defaultSideForType('added')).toBe('test')
    expect(defaultSideForType('removed')).toBe('prod')
  })

  it('withSide / withAllSides / withDefaultSides', () => {
    const one = withSide(leaves, leaves.find((l) => l.path[0] === 'a')!.id, 'prod')
    expect(one.find((l) => l.path[0] === 'a')?.side).toBe('prod')
    expect(withAllSides(leaves, 'prod').every((l) => l.side === 'prod')).toBe(true)
    const reset = withDefaultSides(withAllSides(leaves, 'prod'))
    for (const leaf of reset) {
      expect(leaf.side).toBe(defaultSideForType(leaf.type))
    }
  })

  it('父级批量与混合态', () => {
    const test = { form: { name: { required: true, label: 'A' }, x: 1 } }
    const prod = { form: { name: { required: false, label: 'B' }, x: 1 } }
    const items = diffConfig(test, prod)
    const mixed = withSide(
      withSide(items, items.find((l) => l.path.at(-1) === 'required')!.id, 'test'),
      items.find((l) => l.path.at(-1) === 'label')!.id,
      'prod',
    )
    expect(sideStateForPrefix(mixed, ['form', 'name'])).toBe('mixed')
    const allTest = withDescendantSides(mixed, ['form', 'name'], 'test')
    expect(sideStateForPrefix(allTest, ['form', 'name'])).toBe('test')
  })
})
