import { json } from '@codemirror/lang-json'
import { EditorState, Text } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { stickyAncestorsOf } from './stickyScrollAncestors'
import { collectFoldRanges, stickyLayerTopPx } from './stickyScrollExtension'

describe('collectFoldRanges', () => {
  it('JSON 语言包可收集嵌套折叠区间且 sticky 可消费', () => {
    const state = EditorState.create({
      doc: Text.of(['{', '  "a": {', '    "b": [', '      1', '    ]', '  }', '}']),
      extensions: [json()],
    })
    const foldRanges = collectFoldRanges(state)
    expect(foldRanges.length).toBeGreaterThan(0)

    const pos = state.doc.line(4).from
    const ancestors = stickyAncestorsOf({
      doc: state.doc,
      pos,
      foldRanges,
    })
    expect(ancestors.length).toBeGreaterThan(0)
    expect(ancestors[0]?.text).toContain('{')
  })

  it('无语言扩展时回退括号栈仍能得到区间', () => {
    const state = EditorState.create({
      doc: Text.of(['{', '  "a": {', '    "b": 1', '  }', '}']),
    })
    const foldRanges = collectFoldRanges(state)
    expect(foldRanges.length).toBeGreaterThan(0)
    const ancestors = stickyAncestorsOf({
      doc: state.doc,
      pos: state.doc.line(3).from,
      foldRanges,
    })
    expect(ancestors.length).toBeGreaterThan(0)
  })
})

describe('stickyLayerTopPx', () => {
  it('编辑器顶在视口下时为 0', () => {
    expect(stickyLayerTopPx(100, 120)).toBe(0)
  })

  it('编辑器已滚出视口顶时跟视口对齐', () => {
    expect(stickyLayerTopPx(100, 40)).toBe(60)
  })
})
