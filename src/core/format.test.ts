import { describe, expect, it } from 'vitest'
import { deepEqual } from './equal'
import { formatConfig } from './format'
import { parseConfig } from './parse'

describe('formatConfig', () => {
  it('object 使用缩进 2 的可读 JSON', () => {
    expect(formatConfig({ a: 1 })).toBe('{\n  "a": 1\n}')
  })

  it('array 使用缩进 2 的可读 JSON', () => {
    expect(formatConfig([1, 2])).toBe('[\n  1,\n  2\n]')
  })

  it('format 后再 parse 与原 Config 语义相等', () => {
    const config = { b: [null, { z: true }], a: 1 }
    const roundTrip = parseConfig(formatConfig(config))
    expect(deepEqual(roundTrip, config)).toBe(true)
  })
})
