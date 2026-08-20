import { describe, expect, it } from 'vitest'
import { pointerLeftMergeFrame } from './pointerLeftMergeFrame'

const rect = { left: 10, right: 210, top: 20, bottom: 120 }

function frame(containsRelated: boolean) {
  return {
    contains: () => containsRelated,
    getBoundingClientRect: () => rect as DOMRect,
  }
}

describe('pointerLeftMergeFrame', () => {
  it('relatedTarget 仍在框内时不视为离开（dragenter/dragover 期间穿过子节点）', () => {
    expect(
      pointerLeftMergeFrame(frame(true), {
        relatedTarget: document.createElement('div'),
        clientX: 300,
        clientY: 300,
      }),
    ).toBe(false)
  })

  it('OS 文件拖拽 relatedTarget 为 null 但指针仍在框内时不清除高亮', () => {
    expect(
      pointerLeftMergeFrame(frame(false), {
        relatedTarget: null,
        clientX: 100,
        clientY: 50,
      }),
    ).toBe(false)
  })

  it('指针已离开框外时清除高亮（早于 mouseup/drop）', () => {
    expect(
      pointerLeftMergeFrame(frame(false), {
        relatedTarget: null,
        clientX: 400,
        clientY: 50,
      }),
    ).toBe(true)
  })
})
