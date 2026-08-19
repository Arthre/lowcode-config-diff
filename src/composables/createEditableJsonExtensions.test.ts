import { undo } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { createEditableJsonExtensions } from './codemirrorTheme'

describe('createEditableJsonExtensions', () => {
  it('状态可写', () => {
    const state = EditorState.create({
      doc: '{"a":1}',
      extensions: createEditableJsonExtensions(),
    })
    expect(state.readOnly).toBe(false)
  })

  it('history 可撤销一次文档变更', () => {
    let state = EditorState.create({
      doc: 'hello',
      extensions: createEditableJsonExtensions(),
    })
    state = state.update({ changes: { from: 0, insert: 'X' } }).state
    expect(state.doc.toString()).toBe('Xhello')
    const ok = undo({
      state,
      dispatch: (tr) => {
        state = tr.state
      },
    })
    expect(ok).toBe(true)
    expect(state.doc.toString()).toBe('hello')
  })
})
