import { describe, expect, it } from 'vitest'
import { formatPath } from './path'

describe('formatPath', () => {
  it('空 path 展示为 (root)', () => {
    expect(formatPath([])).toBe('(root)')
  })

  it('多段 path 用点号拼接', () => {
    expect(formatPath(['form', 'name', 'required'])).toBe('form.name.required')
  })

  it('单段 path 原样返回', () => {
    expect(formatPath(['table'])).toBe('table')
  })
})
