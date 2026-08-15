import { describe, expect, it } from 'vitest'
import { ParseConfigError, parseConfig } from './parse'

describe('parseConfig', () => {
  it('解析合法 object 为 Config', () => {
    expect(parseConfig('{"a":1}')).toEqual({ a: 1 })
  })

  it('解析合法 array（含空数组）为 Config', () => {
    expect(parseConfig('[]')).toEqual([])
    expect(parseConfig('[1,{"x":true}]')).toEqual([1, { x: true }])
  })

  it('非法 JSON 抛出 ParseConfigError', () => {
    expect(() => parseConfig('{')).toThrow(ParseConfigError)
  })

  it('顶层 null 抛出 ParseConfigError', () => {
    expect(() => parseConfig('null')).toThrow(ParseConfigError)
  })

  it('顶层 primitive 抛出 ParseConfigError', () => {
    expect(() => parseConfig('"hi"')).toThrow(ParseConfigError)
    expect(() => parseConfig('1')).toThrow(ParseConfigError)
    expect(() => parseConfig('true')).toThrow(ParseConfigError)
  })

  it('错误信息尽量带行号列号（非法 JSON）', () => {
    try {
      parseConfig('{\n  "a": }')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(ParseConfigError)
      const parseError = error as ParseConfigError
      expect(parseError.message.length).toBeGreaterThan(0)
      if (parseError.line !== undefined) {
        expect(parseError.line).toBeGreaterThanOrEqual(1)
      }
    }
  })
})
