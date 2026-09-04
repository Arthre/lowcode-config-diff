import { describe, expect, it } from 'vitest'
import { MERGE_COLLAPSE_UNCHANGED, createCollapseAutoOnce } from './collapse'

describe('MERGE_COLLAPSE_UNCHANGED', () => {
  it('锁定 margin 与 minSize', () => {
    expect(MERGE_COLLAPSE_UNCHANGED).toEqual({ margin: 3, minSize: 4 })
  })
})

describe('createCollapseAutoOnce', () => {
  it('大文档且未抑制时打开折叠', () => {
    const session = createCollapseAutoOnce()
    expect(session.nextEnabled(false, true)).toBe(true)
  })

  it('非大文档时保持当前开关', () => {
    const session = createCollapseAutoOnce()
    expect(session.nextEnabled(false, false)).toBe(false)
    expect(session.nextEnabled(true, false)).toBe(true)
  })

  it('用户关掉后即使仍是大文档也不再自动打开', () => {
    const session = createCollapseAutoOnce()
    expect(session.nextEnabled(false, true)).toBe(true)
    session.onUserSet(false)
    expect(session.nextEnabled(false, true)).toBe(false)
  })
})
