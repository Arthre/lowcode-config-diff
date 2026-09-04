import { describe, expect, it, vi } from 'vitest'
import * as useJsonDocument from '@/features/merge/lib/json/document'
import { prepareImportText, pickJsonFile } from './prepareText'
import { LARGE_DOC_BYTES } from '@/features/merge/lib/policy/largeDoc'

describe('prepareImportText', () => {
  it('合法对象 JSON 时格式化一次', () => {
    const result = prepareImportText('{"a":1}')
    expect(result.didFormat).toBe(true)
    expect(result.skippedFormat).toBe(false)
    expect(result.text).toBe('{\n  "a": 1\n}')
  })

  it('合法数组 JSON 时格式化一次', () => {
    const result = prepareImportText('[1]')
    expect(result.didFormat).toBe(true)
    expect(result.skippedFormat).toBe(false)
    expect(result.text).toBe('[\n  1\n]')
  })

  it('非法 JSON 时保留原文且 didFormat 为 false', () => {
    const raw = '{a'
    expect(prepareImportText(raw)).toEqual({
      text: raw,
      didFormat: false,
      skippedFormat: false,
    })
  })

  it('空字符串保留为空', () => {
    expect(prepareImportText('')).toEqual({
      text: '',
      didFormat: false,
      skippedFormat: false,
    })
  })

  it('顶层 null / primitive 保留原文且不格式化', () => {
    expect(prepareImportText('null')).toEqual({
      text: 'null',
      didFormat: false,
      skippedFormat: false,
    })
    expect(prepareImportText('"hi"')).toEqual({
      text: '"hi"',
      didFormat: false,
      skippedFormat: false,
    })
    expect(prepareImportText('1')).toEqual({
      text: '1',
      didFormat: false,
      skippedFormat: false,
    })
  })

  it('小合法 JSON 仍格式化且 skippedFormat 为 false', () => {
    const result = prepareImportText('{"a":1}')
    expect(result.didFormat).toBe(true)
    expect(result.skippedFormat).toBe(false)
    expect(result.text).toBe('{\n  "a": 1\n}')
  })

  it('达到字节阈值时跳过格式化、保留原文且不调用 formatJsonDocument', () => {
    const raw = 'x'.repeat(LARGE_DOC_BYTES)
    const formatSpy = vi.spyOn(useJsonDocument, 'formatJsonDocument')

    const result = prepareImportText(raw)

    expect(result).toEqual({
      text: raw,
      didFormat: false,
      skippedFormat: true,
    })
    expect(formatSpy).not.toHaveBeenCalled()

    formatSpy.mockRestore()
  })
})

function asFileList(files: File[]): FileList {
  const list = Object.assign(files, {
    length: files.length,
    item: (index: number) => files[index] ?? null,
  })
  return list as unknown as FileList
}

describe('pickJsonFile', () => {
  it('空列表返回 null', () => {
    expect(pickJsonFile(null)).toBeNull()
    expect(pickJsonFile(asFileList([]))).toBeNull()
  })

  it('优先选取 .json 文件', () => {
    const txt = new File(['a'], 'notes.txt', { type: 'text/plain' })
    const json = new File(['{}'], 'prod.json', { type: 'application/json' })
    expect(pickJsonFile(asFileList([txt, json]))).toBe(json)
  })

  it('没有 json 时退回第一项', () => {
    const txt = new File(['a'], 'notes.txt', { type: 'text/plain' })
    expect(pickJsonFile(asFileList([txt]))).toBe(txt)
  })
})
