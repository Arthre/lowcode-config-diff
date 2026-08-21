import { describe, expect, it } from 'vitest'
import { diffConfigItems } from './configItemDiff'
import { SAMPLE_REFERENCE_JSON, SAMPLE_TARGET_JSON, isSampleFillAvailable } from './sampleMergeDocs'

describe('isSampleFillAvailable', () => {
  it('仅双侧都空时为真', () => {
    expect(isSampleFillAvailable('', '')).toBe(true)
    expect(isSampleFillAvailable('{', '')).toBe(false)
    expect(isSampleFillAvailable('', '{')).toBe(false)
  })
})

describe('示例配置对', () => {
  it('可解析且含修改、新增、删除叶子', () => {
    const result = diffConfigItems(SAMPLE_REFERENCE_JSON, SAMPLE_TARGET_JSON)
    expect(result.available).toBe(true)
    const kinds = new Set(result.groups.flatMap((g) => g.fields.map((f) => f.kind)))
    expect(kinds.has('modified')).toBe(true)
    expect(kinds.has('added')).toBe(true)
    expect(kinds.has('removed')).toBe(true)
  })
})
