import { describe, expect, it } from 'vitest'
import { parseConfig } from '@/core/parse'
import { guardRightDocDownload, packRightDocDownload } from './packDownload'

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

describe('guardRightDocDownload', () => {
  it('空白目标配置不下载并提示无法导出', () => {
    const guarded = guardRightDocDownload('  \n', false)
    expect(guarded.allow).toBe(false)
    if (!guarded.allow) {
      expect(guarded.message).toBe('目标配置为空，无法导出')
      expect(guarded.tone).toBe('warning')
    }
  })

  it('合法 JSON 允许下载', () => {
    const guarded = guardRightDocDownload('{\n  "a": 1\n}', false)
    expect(guarded.allow).toBe(true)
    if (guarded.allow) {
      expect(guarded.content).toBe('{\n  "a": 1\n}')
      expect(guarded.filename).toBe('config.json')
      expect(guarded.message).toBe('已导出')
      expect(guarded.tone).toBe('success')
    }
  })

  it('非法 JSON 仍允许导出原文', () => {
    const guarded = guardRightDocDownload('{', true)
    expect(guarded.allow).toBe(true)
    if (guarded.allow) {
      expect(guarded.content).toBe('{')
      expect(guarded.filename).toBe('config.json')
      expect(guarded.tone).toBe('warning')
      expect(guarded.message.length).toBeGreaterThan(0)
    }
  })
})
