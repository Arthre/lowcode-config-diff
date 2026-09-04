export const DOC_SYNC_IDLE_MS = 200

export type EditorDocSide = 'left' | 'right'

export type EditorDocLike = {
  length: number
  toString: () => string
}

/** 长度不同则不必 toString；长度相同才物化比较。 */
export function editorDocNeedsReplace(doc: EditorDocLike, next: string): boolean {
  return doc.length !== next.length || doc.toString() !== next
}

export function createEditorDocSync(options: {
  idleMs: number
  readStore: (side: EditorDocSide) => string
  writeStore: (side: EditorDocSide, text: string) => void
}): {
  onEditorDoc: (side: EditorDocSide, doc: EditorDocLike) => void
  flush: () => void
} {
  const pending: Record<EditorDocSide, EditorDocLike | null> = {
    left: null,
    right: null,
  }
  let idleTimer: ReturnType<typeof setTimeout> | undefined

  function cancelIdle() {
    if (idleTimer === undefined) return
    clearTimeout(idleTimer)
    idleTimer = undefined
  }

  function writePending(side: EditorDocSide) {
    const doc = pending[side]
    if (doc === null) return
    pending[side] = null
    const text = doc.toString()
    if (text !== options.readStore(side)) {
      options.writeStore(side, text)
    }
  }

  function flush() {
    cancelIdle()
    writePending('left')
    writePending('right')
  }

  function scheduleIdle() {
    cancelIdle()
    idleTimer = setTimeout(() => {
      idleTimer = undefined
      flush()
    }, options.idleMs)
  }

  function onEditorDoc(side: EditorDocSide, doc: EditorDocLike) {
    pending[side] = doc
    const storeEmpty = options.readStore(side).length === 0
    const docEmpty = doc.length === 0
    if (storeEmpty !== docEmpty) {
      flush()
      return
    }
    scheduleIdle()
  }

  return { onEditorDoc, flush }
}
