import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEditorDocSync, DOC_SYNC_IDLE_MS, editorDocNeedsReplace } from './editorDocSync'

type Side = 'left' | 'right'

function countedDoc(text: string) {
  let toStringCalls = 0
  return {
    length: text.length,
    toString() {
      toStringCalls += 1
      return text
    },
    toStringCalls() {
      return toStringCalls
    },
  }
}

describe('createEditorDocSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setup(initial: Record<Side, string> = { left: 'L', right: 'R' }) {
    const store = { ...initial }
    const writes: Array<{ side: Side; text: string }> = []
    const sync = createEditorDocSync({
      idleMs: DOC_SYNC_IDLE_MS,
      readStore: (side) => store[side],
      writeStore: (side, text) => {
        writes.push({ side, text })
        store[side] = text
      },
    })
    return { store, writes, sync }
  }

  it('idleMs 为 200', () => {
    expect(DOC_SYNC_IDLE_MS).toBe(200)
  })

  it('连续 onEditorDoc 时 toString 只在 flush 发生一次', () => {
    const { store, writes, sync } = setup()
    const first = countedDoc('abc')
    const second = countedDoc('abcd')
    const third = countedDoc('abcde')

    sync.onEditorDoc('right', first)
    sync.onEditorDoc('right', second)
    sync.onEditorDoc('right', third)

    expect(first.toStringCalls()).toBe(0)
    expect(second.toStringCalls()).toBe(0)
    expect(third.toStringCalls()).toBe(0)
    expect(writes).toEqual([])

    sync.flush()

    expect(first.toStringCalls()).toBe(0)
    expect(second.toStringCalls()).toBe(0)
    expect(third.toStringCalls()).toBe(1)
    expect(store.right).toBe('abcde')
    expect(writes).toEqual([{ side: 'right', text: 'abcde' }])
  })

  it('idle 到期才 toString 并回写 store', () => {
    const { store, writes, sync } = setup()
    const doc = countedDoc('typed')

    sync.onEditorDoc('right', doc)
    expect(doc.toStringCalls()).toBe(0)
    expect(writes).toEqual([])

    vi.advanceTimersByTime(DOC_SYNC_IDLE_MS - 1)
    expect(doc.toStringCalls()).toBe(0)
    expect(writes).toEqual([])

    vi.advanceTimersByTime(1)
    expect(doc.toStringCalls()).toBe(1)
    expect(store.right).toBe('typed')
  })

  it('连续键入会重置 idle 计时', () => {
    const { writes, sync } = setup()
    sync.onEditorDoc('right', countedDoc('a'))
    vi.advanceTimersByTime(DOC_SYNC_IDLE_MS - 1)
    sync.onEditorDoc('right', countedDoc('ab'))
    vi.advanceTimersByTime(DOC_SYNC_IDLE_MS - 1)
    expect(writes).toEqual([])

    vi.advanceTimersByTime(1)
    expect(writes).toEqual([{ side: 'right', text: 'ab' }])
  })

  it('store 空而文档非空时立刻 flush', () => {
    const { store, writes, sync } = setup({ left: '', right: '' })
    const doc = countedDoc('{')

    sync.onEditorDoc('left', doc)

    expect(doc.toStringCalls()).toBe(1)
    expect(store.left).toBe('{')
    expect(writes).toEqual([{ side: 'left', text: '{' }])
  })

  it('store 非空而文档为空时立刻 flush', () => {
    const { store, writes, sync } = setup({ left: '{ "a": 1 }', right: 'R' })
    const doc = countedDoc('')

    sync.onEditorDoc('left', doc)

    expect(doc.toStringCalls()).toBe(1)
    expect(store.left).toBe('')
    expect(writes).toEqual([{ side: 'left', text: '' }])
  })

  it('flush 取消防抖并立刻写下两侧 pending', () => {
    const { store, sync } = setup()
    const left = countedDoc('left-next')
    const right = countedDoc('right-next')

    sync.onEditorDoc('left', left)
    sync.onEditorDoc('right', right)
    expect(left.toStringCalls()).toBe(0)
    expect(right.toStringCalls()).toBe(0)

    sync.flush()

    expect(left.toStringCalls()).toBe(1)
    expect(right.toStringCalls()).toBe(1)
    expect(store.left).toBe('left-next')
    expect(store.right).toBe('right-next')

    vi.advanceTimersByTime(DOC_SYNC_IDLE_MS)
    expect(left.toStringCalls()).toBe(1)
    expect(right.toStringCalls()).toBe(1)
  })

  it('与 store 相等时 flush 不写', () => {
    const { writes, sync } = setup({ left: 'same', right: 'R' })
    const doc = countedDoc('same')

    sync.onEditorDoc('left', doc)
    sync.flush()

    expect(doc.toStringCalls()).toBe(1)
    expect(writes).toEqual([])
  })
})

describe('editorDocNeedsReplace', () => {
  it('长度不同时不 toString 且判定需要替换', () => {
    const doc = countedDoc('abc')
    expect(editorDocNeedsReplace(doc, 'abcd')).toBe(true)
    expect(doc.toStringCalls()).toBe(0)
  })

  it('长度相同且内容不同时 toString 后判定需要替换', () => {
    const doc = countedDoc('abc')
    expect(editorDocNeedsReplace(doc, 'abd')).toBe(true)
    expect(doc.toStringCalls()).toBe(1)
  })

  it('长度相同且内容相同时 toString 后判定不替换', () => {
    const doc = countedDoc('abc')
    expect(editorDocNeedsReplace(doc, 'abc')).toBe(false)
    expect(doc.toStringCalls()).toBe(1)
  })
})
