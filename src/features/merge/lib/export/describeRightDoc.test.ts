import { describe, expect, it } from 'vitest'
import { describeRightDocExport } from './describeRightDoc'

describe('describeRightDocExport', () => {
  it('空白视为 empty', () => {
    expect(describeRightDocExport('  \n')).toEqual({ kind: 'empty' })
  })

  it('合法 JSON 为 valid', () => {
    expect(describeRightDocExport('{"a":1}')).toEqual({ kind: 'valid' })
  })

  it('非法 JSON 返回中文 message', () => {
    const hint = describeRightDocExport('{')
    expect(hint.kind).toBe('invalid')
    if (hint.kind === 'invalid') {
      expect(hint.message.length).toBeGreaterThan(0)
      expect(hint.message).not.toMatch(/invalid|error|parse/i)
    }
  })

  it('非法 JSON 在有行列时拼入行与列', () => {
    const hint = describeRightDocExport('{a')
    expect(hint.kind).toBe('invalid')
    if (hint.kind === 'invalid') {
      expect(hint.message).toMatch(/行 \d+，列 \d+/)
      expect(hint.message).not.toMatch(/invalid|error|parse/i)
    }
  })
})
