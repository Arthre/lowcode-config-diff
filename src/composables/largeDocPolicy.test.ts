import { describe, expect, it } from 'vitest'
import {
  isLargeDoc,
  shouldEmitCoarseNotice,
  shouldSkipImportFormat,
  LARGE_DOC_BYTES,
  LARGE_DOC_LINES,
} from './largeDocPolicy'

describe('largeDocPolicy', () => {
  it('长度不足行数阈值且小于 1MB 时不是大文档', () => {
    const text = '{\n  "a": 1\n}'
    expect(text.length).toBeLessThan(LARGE_DOC_BYTES)
    expect(isLargeDoc(text)).toBe(false)
    expect(shouldSkipImportFormat(text)).toBe(false)
  })

  it('长度达到 1MB 时是大文档且应跳过导入格式化', () => {
    const text = 'x'.repeat(LARGE_DOC_BYTES)
    expect(text.length).toBeGreaterThanOrEqual(LARGE_DOC_BYTES)
    expect(isLargeDoc(text)).toBe(true)
    expect(shouldSkipImportFormat(text)).toBe(true)
  })

  it('换行数达到 15000 时是大文档但不因行数跳过格式化', () => {
    const line = 'x\n'
    const text = line.repeat(LARGE_DOC_LINES - 1) + 'x'
    expect(text.length).toBeLessThan(LARGE_DOC_BYTES)
    expect(isLargeDoc(text)).toBe(true)
    expect(shouldSkipImportFormat(text)).toBe(false)
  })

  it('刚提示跳过格式化时不发过粗提示', () => {
    expect(
      shouldEmitCoarseNotice({
        coarse: true,
        alreadyShown: false,
        skipFormatJustShown: true,
      }),
    ).toBe(false)
  })

  it('过粗且未展示过且无跳过格式化提示时发出', () => {
    expect(
      shouldEmitCoarseNotice({
        coarse: true,
        alreadyShown: false,
        skipFormatJustShown: false,
      }),
    ).toBe(true)
  })

  it('同一过粗状态已展示过则不再发', () => {
    expect(
      shouldEmitCoarseNotice({
        coarse: true,
        alreadyShown: true,
        skipFormatJustShown: false,
      }),
    ).toBe(false)
  })
})
