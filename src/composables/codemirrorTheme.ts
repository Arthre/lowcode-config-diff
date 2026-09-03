import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
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
import { EditorState, Prec, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'

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
  '$ unchanged lines': '$ 行相同',
})

/** Merge 冲突高亮对齐设计 token（覆盖 merge 包默认绿/红）。 */
export const mergeHighlightTheme: Extension = [
  EditorView.theme({
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
  }),
  // &light/&dark 仅 baseTheme 支持；应用靠 html.dark 换 token，两侧都覆盖
  EditorView.baseTheme({
    '&light .cm-collapsedLines, &dark .cm-collapsedLines': {
      color: 'var(--muted)',
      background:
        'linear-gradient(to bottom, transparent 0, var(--surface-raised) 30%, var(--surface-raised) 70%, transparent 100%)',
    },
  }),
]

/**
 * 查找状态与快捷键。默认面板改为幽灵节点，真正 UI 由 MergeSearchDock 承担。
 * - Mod-f / Mod-h：打开自定义查找框
 * - Mod-g / F3：下一个；Mod-Shift-g / Shift-F3：上一个
 */
export function createSearchExtensions(onOpenSearch?: () => boolean): Extension[] {
  return [
    editorPhrases,
    search({
      createPanel: () => {
        const dom = document.createElement('div')
        dom.className = 'cm-search-ghost'
        return { dom, top: true }
      },
    }),
    highlightSelectionMatches(),
    Prec.highest(
      keymap.of([
        {
          key: 'Mod-f',
          run: (view) => (onOpenSearch ? onOpenSearch() : openSearchPanel(view)),
          preventDefault: true,
        },
        {
          key: 'Mod-h',
          run: (view) => (onOpenSearch ? onOpenSearch() : openSearchPanel(view)),
          preventDefault: true,
        },
      ]),
    ),
    keymap.of(searchKeymap),
  ]
}

/** lite 时卸掉的 JSON 语言 / 高亮 / 折叠 gutter，供 Compartment 热切。 */
export function createLiteVariableExtensions(lite: boolean): Extension[] {
  if (lite) return []
  return [foldGutter(), json(), syntaxHighlighting(defaultHighlightStyle, { fallback: true })]
}

export function createEditableJsonExtensions(
  extra: Extension[] = [],
  onOpenSearch?: () => boolean,
  lite?: boolean,
): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    ...createLiteVariableExtensions(lite === true),
    drawSelection(),
    history(),
    keymap.of(historyKeymap),
    keymap.of(defaultKeymap),
    bracketMatching(),
    appEditorTheme,
    ...createSearchExtensions(onOpenSearch),
    ...extra,
  ]
}
