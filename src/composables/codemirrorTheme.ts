import { json } from '@codemirror/lang-json'
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  syntaxHighlighting,
} from '@codemirror/language'
import {
  highlightSelectionMatches,
  openSearchPanel,
  search,
  searchKeymap,
} from '@codemirror/search'
import { EditorState, Prec, StateEffect, StateField, type Extension } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  drawSelection,
  EditorView,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  ViewPlugin,
} from '@codemirror/view'
import type { DiffSide } from '@/core/types'

/** Theme follows CSS variables so light/dark html.dark swaps stay in sync. */
export const appEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--code-bg)',
    color: 'var(--text-h)',
  },
  '.cm-content': {
    fontFamily: 'var(--mono)',
    caretColor: 'var(--accent)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 28%, transparent)',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--code-bg)',
    color: 'var(--muted)',
    borderRight: '1px solid var(--border-subtle)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
  },
  '.cm-merge-side-test': {
    backgroundColor: 'color-mix(in srgb, var(--side-test) 16%, transparent)',
  },
  '.cm-merge-side-prod': {
    backgroundColor: 'color-mix(in srgb, var(--side-prod) 16%, transparent)',
  },
  '.cm-panel.cm-search': {
    backgroundColor: 'var(--surface)',
    color: 'var(--text-h)',
    borderBottom: '1px solid var(--border-subtle)',
    padding: '0.4rem 0.5rem',
    fontFamily: 'var(--font-sans, inherit)',
  },
  '.cm-panel.cm-search input, .cm-panel.cm-search button, .cm-panel.cm-search label': {
    fontSize: '0.75rem',
  },
})

/**
 * 差异区专用：默认不抢滚轮；指针点入编辑器后允许内部滚动，点到编辑器外再交还外层。
 * （比仅依赖 cm-focused 更稳，避免选中后仍无法滚动。）
 */
export function createFocusScrollExtension(): Extension[] {
  const armClass = 'cm-scroll-armed'
  return [
    EditorView.theme({
      '.cm-scroller': {
        overflow: 'hidden',
      },
      [`&.${armClass} .cm-scroller, &.cm-focused .cm-scroller, &:focus-within .cm-scroller`]: {
        overflow: 'auto',
      },
    }),
    ViewPlugin.fromClass(
      class {
        private view: EditorView
        private onDocPointerDown: (event: PointerEvent) => void

        constructor(view: EditorView) {
          this.view = view
          this.onDocPointerDown = (event: PointerEvent) => {
            const target = event.target
            if (!(target instanceof Node) || !this.view.dom.contains(target)) {
              this.view.dom.classList.remove(armClass)
            }
          }
          document.addEventListener('pointerdown', this.onDocPointerDown, true)
        }

        destroy() {
          document.removeEventListener('pointerdown', this.onDocPointerDown, true)
          this.view.dom.classList.remove(armClass)
        }
      },
    ),
    EditorView.domEventHandlers({
      pointerdown(_event, view) {
        view.dom.classList.add(armClass)
        return false
      },
    }),
  ]
}

/** 只读编辑器：隐藏替换控件（仍可用查找）。 */
export const readonlySearchTheme = EditorView.theme({
  '.cm-panel.cm-search input[name=replace], .cm-panel.cm-search button[name=replace], .cm-panel.cm-search button[name=replaceAll]':
    {
      display: 'none',
    },
})

/** CodeMirror 面板与提示中文文案 */
export const editorPhrases = EditorState.phrases.of({
  Find: '查找',
  Replace: '替换',
  next: '下一个',
  previous: '上一个',
  all: '全部',
  'match case': '区分大小写',
  regexp: '正则',
  'by word': '全词',
  replace: '替换',
  'replace all': '全部替换',
  close: '关闭',
  'Go to line': '跳转到行',
  go: '前往',
  'current match': '当前匹配',
  'on line': '位于行',
  'replaced match on line $': '已替换第 $ 行的匹配',
  'replaced $ matches': '已替换 $ 处匹配',
})

/** Merge 冲突高亮对齐设计 token（覆盖 merge 包默认绿/红）。 */
export const mergeHighlightTheme = EditorView.theme({
  '&.cm-merge-a .cm-changedLine, .cm-deletedChunk': {
    backgroundColor: 'color-mix(in srgb, var(--diff-removed) 14%, transparent)',
  },
  '&.cm-merge-b .cm-changedLine, .cm-inlineChangedLine': {
    backgroundColor: 'color-mix(in srgb, var(--diff-added) 14%, transparent)',
  },
  '&.cm-merge-a .cm-changedText, .cm-deletedChunk .cm-deletedText': {
    background: 'color-mix(in srgb, var(--diff-removed) 28%, transparent)',
  },
  '&.cm-merge-b .cm-changedText': {
    background: 'color-mix(in srgb, var(--diff-added) 28%, transparent)',
  },
  '&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter': {
    backgroundColor: 'var(--diff-removed)',
  },
  '&.cm-merge-b .cm-changedLineGutter': {
    backgroundColor: 'var(--diff-added)',
  },
})

export type SideMarkSpec = { from: number; to: number; side: DiffSide }

export const setSideMarksEffect = StateEffect.define<readonly SideMarkSpec[]>()

function buildSideMarkDecorations(marks: readonly SideMarkSpec[]): DecorationSet {
  const sorted = [...marks]
    .filter((mark) => mark.from < mark.to)
    .sort((a, b) => a.from - b.from || a.to - b.to)
  return Decoration.set(
    sorted.map((mark) =>
      Decoration.mark({
        class: mark.side === 'prod' ? 'cm-merge-side-prod' : 'cm-merge-side-test',
      }).range(mark.from, mark.to),
    ),
    true,
  )
}

export const sideMarksField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setSideMarksEffect)) {
        return buildSideMarkDecorations(effect.value)
      }
    }
    if (tr.docChanged) {
      return value.map(tr.changes)
    }
    return value
  },
  provide: (field) => EditorView.decorations.from(field),
})

/**
 * 查找 / 替换面板与快捷键。
 * - Mod-f / Mod-h：打开编辑器查找（preventDefault，避免浏览器查找）
 * - Mod-g / F3：下一个；Mod-Shift-g / Shift-F3：上一个
 * - Mod-Alt-g：跳转到行
 */
export function createSearchExtensions(options: { replaceable?: boolean } = {}): Extension[] {
  const replaceable = options.replaceable ?? true
  return [
    editorPhrases,
    search({ top: true }),
    highlightSelectionMatches(),
    // 高于默认 keymap，并拦截浏览器 Ctrl/Cmd+F
    Prec.highest(
      keymap.of([
        { key: 'Mod-f', run: openSearchPanel, preventDefault: true },
        { key: 'Mod-h', run: openSearchPanel, preventDefault: true },
      ]),
    ),
    keymap.of(searchKeymap),
    ...(replaceable ? [] : [readonlySearchTheme]),
  ]
}

export function createReadonlyJsonExtensions(
  extra: Extension[] = [],
  options: { focusScroll?: boolean } = {},
): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    foldGutter(),
    drawSelection(),
    // 仅 readOnly：保留可聚焦，才能接收快捷键。
    EditorState.readOnly.of(true),
    json(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    appEditorTheme,
    ...(options.focusScroll ? createFocusScrollExtension() : []),
    ...createSearchExtensions({ replaceable: false }),
    ...extra,
  ]
}
