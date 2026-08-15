import { describe, expect, it } from 'vitest'
import { evaluateJsonDocument, formatJsonDocument } from './useJsonDocument'

describe('evaluateJsonDocument', () => {
  it('空文本为 empty', () => {
    expect(evaluateJsonDocument('').status).toBe('empty')
    expect(evaluateJsonDocument('   ').status).toBe('empty')
  })

  it('合法 object / array 为 valid 并带 config', () => {
    const obj = evaluateJsonDocument('{"a":1}')
    expect(obj.status).toBe('valid')
    expect(obj.config).toEqual({ a: 1 })

    const arr = evaluateJsonDocument('[1]')
    expect(arr.status).toBe('valid')
    expect(arr.config).toEqual([1])
  })

  it('非法 JSON 为 invalid 并带错误信息', () => {
    const result = evaluateJsonDocument('{')
    expect(result.status).toBe('invalid')
    expect(result.errorMessage?.length).toBeGreaterThan(0)
  })

  it('顶层 null / primitive 为 invalid', () => {
    expect(evaluateJsonDocument('null').status).toBe('invalid')
    expect(evaluateJsonDocument('"hi"').status).toBe('invalid')
    expect(evaluateJsonDocument('1').status).toBe('invalid')
  })
})

describe('formatJsonDocument', () => {
  it('合法 JSON 格式化为缩进 2', () => {
    const result = formatJsonDocument('{"a":1}')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.text).toBe('{\n  "a": 1\n}')
    }
  })

  it('非法 JSON 返回 ok false', () => {
    const result = formatJsonDocument('{')
    expect(result.ok).toBe(false)
  })
})
