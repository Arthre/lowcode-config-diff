import { describe, expect, it } from 'vitest'
import { chunkJumpPreview } from './chunkJumpPreview'

describe('chunkJumpPreview', () => {
  it('空区间为中文占位', () => {
    expect(chunkJumpPreview('abc', 2, 2)).toBe('（空行）')
  })

  it('多行只取首行', () => {
    expect(chunkJumpPreview('foo\nbar\n', 0, 8)).toBe('foo')
  })

  it('超长截断', () => {
    const line = 'x'.repeat(90)
    expect(chunkJumpPreview(line, 0, 90, 80)).toBe(`${'x'.repeat(80)}…`)
  })

  it('默认上限为 80 字符', () => {
    const line = 'y'.repeat(90)
    expect(chunkJumpPreview(line, 0, 90)).toBe(`${'y'.repeat(80)}…`)
  })

  it('全空白为中文占位', () => {
    expect(chunkJumpPreview('  \n\t', 0, 4)).toBe('（空行）')
  })
})
