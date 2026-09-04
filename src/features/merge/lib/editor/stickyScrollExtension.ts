import { foldNodeProp, syntaxTree } from '@codemirror/language'
import type { EditorState, Extension } from '@codemirror/state'
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import { collectBraceFoldRanges } from './braceFold'
import {
  STICKY_SCROLL_MAX_LAYERS,
  stickyAncestorsOf,
  stickyCrumbLabel,
  type FoldRange,
  type StickyAncestor,
} from './stickyScrollAncestors'

/** Sticky Scroll 扩展选项。 */
export type StickyScrollOptions = {
  /** 竖滚根；Merge 应返回 mergeView.dom。构造期可返回 null。 */
  getScrollRoot: (view: EditorView) => HTMLElement | null
  maxLayers?: number
}

/**
 * sticky 层相对 `.cm-editor` 的 top：钉在滚动根视口顶，而非整篇文档顶。
 * `rootTop` / `editorTop` 为 getBoundingClientRect().top。
 */
export function stickyLayerTopPx(rootTop: number, editorTop: number): number {
  return Math.max(0, rootTop - editorTop)
}

/**
 * 优先语法树 fold；无树（lite）时回退括号栈，保证大文件也能 sticky。
 */
export function collectFoldRanges(state: EditorState): FoldRange[] {
  const fromTree = collectSyntaxFoldRanges(state)
  if (fromTree.length > 0) return fromTree
  return collectBraceFoldRanges(state.doc)
}

function collectSyntaxFoldRanges(state: EditorState): FoldRange[] {
  const tree = syntaxTree(state)
  if (tree.length === 0) return []

  const ranges: FoldRange[] = []
  tree.iterate({
    enter(node) {
      const fold = node.type.prop(foldNodeProp)
      if (!fold) return
      const range = fold(node.node, state)
      if (range && range.to > range.from) {
        ranges.push({ from: range.from, to: range.to })
      }
    },
  })
  return ranges
}

/** VS Code 式 sticky 行层：跟外层滚动根，不假定 cm-scroller 竖滚。 */
export function stickyScrollExtension(options: StickyScrollOptions): Extension {
  const maxLayers = options.maxLayers ?? STICKY_SCROLL_MAX_LAYERS

  const plugin = ViewPlugin.fromClass(
    class {
      readonly view: EditorView
      readonly dom: HTMLElement
      private attachedRoot: HTMLElement | null = null
      private readonly onRootScroll = () => {
        this.redraw()
      }
      private lastKey = ''
      private cachedFoldRanges: FoldRange[] = []
      private foldCacheDocLength = -1
      private redrawRaf = 0

      constructor(view: EditorView) {
        this.view = view
        this.dom = document.createElement('div')
        this.dom.className = 'cm-sticky-scroll'
        this.dom.setAttribute('aria-hidden', 'false')

        this.dom.addEventListener('mousedown', (event) => {
          const target = event.target
          if (!(target instanceof HTMLElement)) return
          const row = target.closest<HTMLElement>('[data-sticky-from]')
          if (!row) return
          event.preventDefault()
          event.stopPropagation()
          const from = Number(row.dataset.stickyFrom)
          if (!Number.isFinite(from)) return
          this.jumpTo(from)
        })

        this.view.dom.appendChild(this.dom)
        this.ensureScrollListener()
        this.invalidateFoldCache()
        this.scheduleRedraw()
      }

      update(update: ViewUpdate) {
        this.ensureScrollListener()
        if (update.docChanged) this.invalidateFoldCache()
        // 禁止在 update 内读 layout（lineBlockAtHeight / getBoundingClientRect）
        this.scheduleRedraw()
      }

      destroy() {
        if (this.redrawRaf) cancelAnimationFrame(this.redrawRaf)
        this.redrawRaf = 0
        this.detachScroll()
        this.dom.remove()
      }

      /** 推迟到本帧 update 结束后再量布局。 */
      private scheduleRedraw() {
        if (this.redrawRaf) return
        this.redrawRaf = requestAnimationFrame(() => {
          this.redrawRaf = 0
          this.redraw()
        })
      }

      private ensureScrollListener() {
        const root = options.getScrollRoot(this.view)
        if (root === this.attachedRoot) return
        this.detachScroll()
        if (!root) return
        root.addEventListener('scroll', this.onRootScroll, { passive: true })
        this.attachedRoot = root
      }

      private detachScroll() {
        if (this.attachedRoot) {
          this.attachedRoot.removeEventListener('scroll', this.onRootScroll)
        }
        this.attachedRoot = null
      }

      private invalidateFoldCache() {
        this.foldCacheDocLength = -1
        this.cachedFoldRanges = []
      }

      private foldRanges(): FoldRange[] {
        const { doc } = this.view.state
        if (this.foldCacheDocLength !== -1 && this.foldCacheDocLength === doc.length) {
          return this.cachedFoldRanges
        }
        this.cachedFoldRanges = collectFoldRanges(this.view.state)
        this.foldCacheDocLength = doc.length
        return this.cachedFoldRanges
      }

      private jumpTo(from: number) {
        const root = options.getScrollRoot(this.view)
        if (!root) return
        const clamped = Math.max(0, Math.min(from, this.view.state.doc.length))
        const maxTop = Math.max(0, root.scrollHeight - root.clientHeight)
        root.scrollTop = Math.min(this.view.lineBlockAt(clamped).top, maxTop)
        this.view.dispatch({
          selection: { anchor: clamped },
          userEvent: 'select.sticky',
          scrollIntoView: false,
        })
        this.redraw()
      }

      private syncViewportTop() {
        const root = options.getScrollRoot(this.view)
        if (!root) return
        const top = stickyLayerTopPx(
          root.getBoundingClientRect().top,
          this.view.dom.getBoundingClientRect().top,
        )
        this.dom.style.top = `${top}px`
      }

      private redraw() {
        const root = options.getScrollRoot(this.view)
        if (!root) {
          this.clear()
          return
        }

        this.syncViewportTop()

        const scrollTop = root.scrollTop
        const topBlock = this.view.lineBlockAtHeight(scrollTop)
        const ancestors = stickyAncestorsOf({
          doc: this.view.state.doc,
          pos: topBlock.from,
          foldRanges: this.foldRanges(),
          maxLayers,
        })

        const key = ancestorsKey(ancestors)
        if (key !== this.lastKey) {
          this.lastKey = key
          this.render(ancestors)
        }

        if (ancestors.length === 0) {
          this.dom.style.display = 'none'
          return
        }

        this.dom.style.display = 'block'
      }

      private clear() {
        this.lastKey = ''
        this.dom.replaceChildren()
        this.dom.style.display = 'none'
      }

      private render(ancestors: readonly StickyAncestor[]) {
        this.dom.replaceChildren()
        const trail = document.createElement('div')
        trail.className = 'cm-sticky-scroll-crumbs'
        trail.setAttribute('role', 'navigation')
        trail.setAttribute('aria-label', '粘性路径')

        ancestors.forEach((ancestor, index) => {
          if (index > 0) {
            const sep = document.createElement('span')
            sep.className = 'cm-sticky-scroll-sep'
            sep.textContent = '›'
            sep.setAttribute('aria-hidden', 'true')
            trail.appendChild(sep)
          }

          const crumb = document.createElement('button')
          crumb.type = 'button'
          crumb.className = 'cm-sticky-scroll-crumb'
          crumb.dataset.stickyFrom = String(ancestor.from)
          const label = stickyCrumbLabel(ancestor.text)
          crumb.textContent = label
          crumb.title = `跳转到该行：${ancestor.text.trim()}`
          crumb.setAttribute('aria-label', `跳转到 ${label}`)
          trail.appendChild(crumb)
        })

        this.dom.appendChild(trail)
      }
    },
  )

  const theme = EditorView.theme({
    '&': {
      position: 'relative',
    },
    '.cm-sticky-scroll': {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      zIndex: '6',
      overflow: 'hidden',
      backgroundColor: 'color-mix(in srgb, var(--code-bg) 92%, var(--surface))',
      borderBottom: '1px solid var(--border-subtle)',
      boxShadow: '0 1px 0 color-mix(in srgb, var(--border-subtle) 80%, transparent)',
      fontFamily: 'var(--mono)',
      fontSize: '0.75rem',
      lineHeight: '1.35',
      pointerEvents: 'auto',
    },
    '.cm-sticky-scroll-crumbs': {
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'center',
      gap: '0.15rem',
      minHeight: '1.65rem',
      padding: '0.15rem 0.55rem 0.15rem 0.45rem',
      overflowX: 'auto',
      scrollbarWidth: 'thin',
    },
    '.cm-sticky-scroll-sep': {
      flex: '0 0 auto',
      color: 'var(--muted)',
      opacity: '0.7',
      userSelect: 'none',
      padding: '0 0.1rem',
    },
    '.cm-sticky-scroll-crumb': {
      flex: '0 1 auto',
      minWidth: '0',
      maxWidth: '12rem',
      margin: '0',
      padding: '0.1rem 0.35rem',
      overflow: 'hidden',
      border: 'none',
      borderRadius: 'var(--radius-xs, 0)',
      background: 'transparent',
      color: 'var(--text-h)',
      font: 'inherit',
      textAlign: 'left',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
    },
    '.cm-sticky-scroll-crumb:hover': {
      backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
      color: 'var(--accent)',
    },
    '.cm-sticky-scroll-crumb:last-of-type': {
      fontWeight: '600',
      color: 'var(--accent)',
    },
  })

  return [plugin, theme]
}

function ancestorsKey(ancestors: readonly StickyAncestor[]): string {
  if (ancestors.length === 0) return ''
  return ancestors.map((item) => `${item.from}:${item.to}`).join('|')
}
