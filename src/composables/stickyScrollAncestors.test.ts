import { Text } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import {
  STICKY_SCROLL_MAX_LAYERS,
  stickyAncestorsOf,
  stickyCrumbLabel,
  type FoldRange,
} from './stickyScrollAncestors'

/** 构造多行文档，并用「行号 → 覆盖到某行」生成假 fold（不解析语言）。 */
function docWithLineFolds(lines: string[], foldOpenToClose: readonly [number, number][]) {
  // Text.of 只接受「行数组」，传入整串会被当成逐字符分行
  const doc = Text.of(lines)
  const foldRanges: FoldRange[] = foldOpenToClose.map(([openLine, closeLine]) => {
    const open = doc.line(openLine)
    const close = doc.line(closeLine)
    return { from: open.from, to: close.to }
  })
  return { doc, foldRanges }
}

describe('stickyAncestorsOf', () => {
  it('嵌套 object/array 时返回由外到内的祖先行', () => {
    const { doc, foldRanges } = docWithLineFolds(
      ['{', '  "a": {', '    "b": [', '      1', '    ]', '  }', '}'],
      [
        [1, 7],
        [2, 6],
        [3, 5],
      ],
    )
    const pos = doc.line(4).from
    const ancestors = stickyAncestorsOf({ doc, pos, foldRanges })
    expect(ancestors.map((item) => item.text)).toEqual(['{', '  "a": {', '    "b": ['])
    expect(ancestors[0]?.from).toBe(doc.line(1).from)
    expect(ancestors[2]?.from).toBe(doc.line(3).from)
  })

  it('视口在文档根附近时返回空列表', () => {
    const { doc, foldRanges } = docWithLineFolds(['{', '  "a": 1', '}'], [[1, 3]])
    const ancestors = stickyAncestorsOf({ doc, pos: doc.line(1).from, foldRanges })
    expect(ancestors).toEqual([])
  })

  it('超过最大层数时只保留最内层', () => {
    const lines = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'inner']
    const folds: [number, number][] = [
      [1, 8],
      [2, 8],
      [3, 8],
      [4, 8],
      [5, 8],
      [6, 8],
      [7, 8],
    ]
    const { doc, foldRanges } = docWithLineFolds(lines, folds)
    const pos = doc.line(8).from
    const ancestors = stickyAncestorsOf({
      doc,
      pos,
      foldRanges,
      maxLayers: STICKY_SCROLL_MAX_LAYERS,
    })
    expect(ancestors).toHaveLength(STICKY_SCROLL_MAX_LAYERS)
    expect(ancestors.map((item) => item.text)).toEqual(['L3', 'L4', 'L5', 'L6', 'L7'])
  })

  it('无折叠区间时返回空列表', () => {
    const doc = Text.of(['plain', 'text'])
    const ancestors = stickyAncestorsOf({
      doc,
      pos: doc.line(2).from,
      foldRanges: [],
    })
    expect(ancestors).toEqual([])
  })

  it('可用假 fold 区间证明不依赖 JSON 解析', () => {
    const { doc, foldRanges } = docWithLineFolds(
      ['def outer():', '  def inner():', '    return 1'],
      [
        [1, 3],
        [2, 3],
      ],
    )
    const ancestors = stickyAncestorsOf({
      doc,
      pos: doc.line(3).from,
      foldRanges,
    })
    expect(ancestors.map((item) => item.text)).toEqual(['def outer():', '  def inner():'])
  })
})

describe('stickyCrumbLabel', () => {
  it('提取 JSON key', () => {
    expect(stickyCrumbLabel('  "fieldName": {')).toBe('fieldName')
    expect(stickyCrumbLabel('"items": [')).toBe('items')
  })

  it('纯括号行用省略标记', () => {
    expect(stickyCrumbLabel('{')).toBe('{…}')
    expect(stickyCrumbLabel('  [')).toBe('[…]')
  })

  it('其它语言行截断过长文本', () => {
    expect(stickyCrumbLabel('def outer():')).toBe('def outer():')
    const long = 'x'.repeat(40)
    expect(stickyCrumbLabel(long).endsWith('…')).toBe(true)
    expect(stickyCrumbLabel(long).length).toBe(28)
  })
})
