import type { Text } from '@codemirror/state'

/** Sticky 最多钉住的祖先行层数。 */
export const STICKY_SCROLL_MAX_LAYERS = 5

/** 语言无关的可折叠区间（开闭偏移，半开或闭区间均可，按包含关系判断）。 */
export type FoldRange = {
  from: number
  to: number
}

/** 钉在视口顶部的祖先行（文档偏移 + 行文本）。 */
export type StickyAncestor = {
  from: number
  to: number
  text: string
}

/**
 * 根据视口顶部文档位置与折叠区间，计算应由外到内展示的 sticky 祖先行。
 * 不解析具体语言；调用方传入 fold 区间（语法折叠或测试假数据）。
 */
export function stickyAncestorsOf(options: {
  doc: Text
  /** 视口顶部对应的文档位置 */
  pos: number
  foldRanges: readonly FoldRange[]
  maxLayers?: number
}): StickyAncestor[] {
  const { doc, pos, foldRanges } = options
  const maxLayers = options.maxLayers ?? STICKY_SCROLL_MAX_LAYERS
  if (maxLayers <= 0 || foldRanges.length === 0) return []

  const clamped = Math.max(0, Math.min(pos, doc.length))
  const candidates: StickyAncestor[] = []
  const seenOpen = new Set<number>()

  for (const range of foldRanges) {
    if (!(range.from < clamped && range.to > clamped)) continue
    const openLine = doc.lineAt(range.from)
    // 开行仍可见（未滚出）时不钉
    if (openLine.to >= clamped) continue
    if (seenOpen.has(openLine.from)) continue
    seenOpen.add(openLine.from)
    candidates.push({
      from: openLine.from,
      to: openLine.to,
      text: openLine.text,
    })
  }

  candidates.sort((left, right) => left.from - right.from)

  if (candidates.length <= maxLayers) return candidates
  return candidates.slice(candidates.length - maxLayers)
}

/**
 * 把祖先行文本压成面包屑短标签。
 * 优先取 JSON 风格 `"key":`；否则取行首括号或截断原文。
 */
export function stickyCrumbLabel(lineText: string): string {
  const trimmed = lineText.trim()
  if (trimmed.length === 0) return '…'

  const keyMatch = /^"((?:\\.|[^"\\])*)"\s*:/.exec(trimmed)
  if (keyMatch?.[1] !== undefined) {
    return keyMatch[1]
      .replace(/\\(["\\/bfnrt])/g, '$1')
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
  }

  if (trimmed === '{' || trimmed.startsWith('{')) return '{…}'
  if (trimmed === '[' || trimmed.startsWith('[')) return '[…]'

  const maxLen = 28
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen - 1)}…`
}
