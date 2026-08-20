import { describe, expect, it } from 'vitest'
import { statusDismissMs, toneFromExportHint } from './statusMessage'

describe('statusMessage', () => {
  it('成功提示 2 秒后可消失', () => {
    expect(statusDismissMs('success')).toBe(2000)
  })

  it('警告比成功停留更久', () => {
    expect(statusDismissMs('warning')).toBe(4000)
  })

  it('失败比警告停留更久', () => {
    expect(statusDismissMs('error')).toBe(5000)
  })

  it('合法导出为成功，空栏与非法为警告', () => {
    expect(toneFromExportHint('valid')).toBe('success')
    expect(toneFromExportHint('empty')).toBe('warning')
    expect(toneFromExportHint('invalid')).toBe('warning')
  })
})
