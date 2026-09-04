import { describe, expect, it } from 'vitest'
import { SAMPLE_REFERENCE_JSON, SAMPLE_TARGET_JSON, isSampleFillAvailable } from './sampleDocs'

describe('isSampleFillAvailable', () => {
  it('仅双侧都空时为真', () => {
    expect(isSampleFillAvailable('', '')).toBe(true)
    expect(isSampleFillAvailable('{', '')).toBe(false)
    expect(isSampleFillAvailable('', '{')).toBe(false)
  })
})

describe('示例配置对', () => {
  it('可解析为对象且双侧内容不同', () => {
    const left = JSON.parse(SAMPLE_REFERENCE_JSON) as Record<string, unknown>
    const right = JSON.parse(SAMPLE_TARGET_JSON) as Record<string, unknown>
    expect(left).toEqual(expect.any(Object))
    expect(right).toEqual(expect.any(Object))
    expect(left).not.toEqual(right)
    expect(left.pageSize).toBe(10)
    expect(right.pageSize).toBe(20)
    expect(left).toHaveProperty('showExport')
    expect(right).not.toHaveProperty('showExport')
  })
})
