import { describe, expect, it } from 'vitest'
import { pickJsonFile } from './pickJsonFile'

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
