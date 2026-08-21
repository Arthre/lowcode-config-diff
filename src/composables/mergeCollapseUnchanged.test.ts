import { describe, expect, it } from 'vitest'
import { MERGE_COLLAPSE_UNCHANGED } from './mergeCollapseUnchanged'

describe('mergeCollapseUnchanged', () => {
  it('锁定 margin 与 minSize', () => {
    expect(MERGE_COLLAPSE_UNCHANGED).toEqual({ margin: 3, minSize: 4 })
  })
})
