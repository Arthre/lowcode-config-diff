import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { LARGE_DOC_BYTES } from '@/features/merge/lib/policy/largeDoc'
import { useMergeWorkspace } from './mergeWorkspace'

describe('useMergeWorkspace', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始两侧文档与文件名皆为空', () => {
    const store = useMergeWorkspace()
    expect(store.leftDoc).toBe('')
    expect(store.rightDoc).toBe('')
    expect(store.leftFileName).toBe('')
    expect(store.rightFileName).toBe('')
  })

  it('importSide left 写入格式化文本且不改已有 right', () => {
    const store = useMergeWorkspace()
    store.setRightDoc('keep-me')
    store.importSide('left', '{"x":1}', 't.json')
    expect(store.leftDoc).toContain('"x"')
    expect(store.rightDoc).toBe('keep-me')
    expect(store.leftFileName).toBe('t.json')
    expect(store.rightFileName).toBe('')
  })

  it('importSide right 覆盖 rightDoc', () => {
    const store = useMergeWorkspace()
    store.setRightDoc('old')
    store.importSide('right', '{"y":2}', 'p.json')
    expect(store.rightDoc).toContain('"y"')
    expect(store.rightFileName).toBe('p.json')
  })

  it('省略 fileName 时该侧文件名清空且不改另一侧', () => {
    const store = useMergeWorkspace()
    store.importSide('left', '{"a":1}', 'keep.json')
    store.importSide('right', '{"b":2}', 'other.json')
    store.importSide('left', '{"a":3}')
    expect(store.leftFileName).toBe('')
    expect(store.rightFileName).toBe('other.json')
    expect(store.leftDoc).toContain('"a"')
  })

  it('非法 JSON 导入保留原文且不改另一侧', () => {
    const store = useMergeWorkspace()
    store.setRightDoc('keep-me')
    store.importSide('left', '{a', 'bad.json')
    expect(store.leftDoc).toBe('{a')
    expect(store.rightDoc).toBe('keep-me')
    expect(store.leftFileName).toBe('bad.json')
  })

  it('setRightDoc 只改文档不改文件名', () => {
    const store = useMergeWorkspace()
    store.importSide('right', '{"y":2}', 'p.json')
    store.setRightDoc('typed')
    expect(store.rightDoc).toBe('typed')
    expect(store.rightFileName).toBe('p.json')
  })

  it('clearSide left 清空左侧文档与文件名且不改右侧', () => {
    const store = useMergeWorkspace()
    store.importSide('left', '{"x":1}', 't.json')
    store.importSide('right', '{"y":2}', 'p.json')
    store.clearSide('left')
    expect(store.leftDoc).toBe('')
    expect(store.leftFileName).toBe('')
    expect(store.rightDoc).toContain('"y"')
    expect(store.rightFileName).toBe('p.json')
  })

  it('importSide 返回 PreparedImport 且小 JSON 已格式化', () => {
    const store = useMergeWorkspace()
    const result = store.importSide('left', '{"x":1}', 't.json')
    expect(result.didFormat).toBe(true)
    expect(result.skippedFormat).toBe(false)
    expect(result.text).toBe(store.leftDoc)
    expect(store.leftFileName).toBe('t.json')
  })

  it('超大原文导入返回 skippedFormat 且原文不变', () => {
    const store = useMergeWorkspace()
    const raw = 'x'.repeat(LARGE_DOC_BYTES)
    const result = store.importSide('left', raw, 'big.json')
    expect(result.skippedFormat).toBe(true)
    expect(result.didFormat).toBe(false)
    expect(result.text).toBe(raw)
    expect(store.leftDoc).toBe(raw)
  })
})
