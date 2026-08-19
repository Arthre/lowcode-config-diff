import { describe, expect, it } from 'vitest'
import { parseConfig } from '@/core/parse'
import { packRightDocDownload } from './packRightDocDownload'

describe('packRightDocDownload', () => {
  it('非压缩时文件名为 config.json 且内容原样', () => {
    const packed = packRightDocDownload('{\n  "a": 1\n}', false)
    expect(packed.filename).toBe('config.json')
    expect(packed.content).toBe('{\n  "a": 1\n}')
    expect(packed.hint.kind).toBe('valid')
  })

  it('合法 JSON 压缩后为单行且文件名为 config.min.json', () => {
    const packed = packRightDocDownload('{\n  "a": 1\n}', true)
    expect(packed.filename).toBe('config.min.json')
    expect(packed.content).toBe('{"a":1}')
    expect(parseConfig(packed.content)).toEqual({ a: 1 })
    expect(packed.hint.kind).toBe('valid')
  })

  it('非法 JSON 压缩时仍导出原文且文件名为 config.json', () => {
    const packed = packRightDocDownload('{', true)
    expect(packed.filename).toBe('config.json')
    expect(packed.content).toBe('{')
    expect(packed.hint.kind).toBe('invalid')
  })
})
