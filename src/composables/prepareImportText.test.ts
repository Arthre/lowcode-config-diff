import { describe, expect, it } from 'vitest'
import { prepareImportText } from './prepareImportText'

describe('prepareImportText', () => {
  it('合法对象 JSON 时格式化一次', () => {
    const result = prepareImportText('{"a":1}')
    expect(result.didFormat).toBe(true)
    expect(result.text).toBe('{\n  "a": 1\n}')
  })

  it('合法数组 JSON 时格式化一次', () => {
    const result = prepareImportText('[1]')
    expect(result.didFormat).toBe(true)
    expect(result.text).toBe('[\n  1\n]')
  })

  it('非法 JSON 时保留原文且 didFormat 为 false', () => {
    const raw = '{a'
    expect(prepareImportText(raw)).toEqual({ text: raw, didFormat: false })
  })

  it('空字符串保留为空', () => {
    expect(prepareImportText('')).toEqual({ text: '', didFormat: false })
  })

  it('顶层 null / primitive 保留原文且不格式化', () => {
    expect(prepareImportText('null')).toEqual({ text: 'null', didFormat: false })
    expect(prepareImportText('"hi"')).toEqual({ text: '"hi"', didFormat: false })
    expect(prepareImportText('1')).toEqual({ text: '1', didFormat: false })
  })
})
