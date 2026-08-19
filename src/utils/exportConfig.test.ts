import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copyText, downloadJsonFile } from './exportConfig'

describe('copyText', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('把给定字符串交给 clipboard.writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await copyText('{"a":1}')

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText).toHaveBeenCalledWith('{"a":1}')
  })
})

describe('downloadJsonFile', () => {
  const objectUrl = 'blob:mock-config'

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.replaceChildren()
  })

  it('默认文件名为 config.json', () => {
    let filename = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filename = this.download
    })

    downloadJsonFile('{"a":1}')

    expect(filename).toBe('config.json')
  })

  it('可传入自定义 filename', () => {
    let filename = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      filename = this.download
    })

    downloadJsonFile('{"a":1}', 'merged.json')

    expect(filename).toBe('merged.json')
  })

  it('点击后移除 anchor', () => {
    let inDocumentOnClick = false
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      inDocumentOnClick = document.body.contains(this)
    })

    downloadJsonFile('{"a":1}')

    expect(inDocumentOnClick).toBe(true)
    expect(document.querySelector('a[download]')).toBeNull()
  })
})
