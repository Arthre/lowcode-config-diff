import { Text } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { collectBraceFoldRanges } from './braceFoldRanges'
import { stickyAncestorsOf } from './stickyScrollAncestors'

describe('collectBraceFoldRanges', () => {
  it('收集嵌套对象与数组区间', () => {
    const doc = Text.of(['{', '  "a": {', '    "b": [', '      1', '    ]', '  }', '}'])
    const ranges = collectBraceFoldRanges(doc)
    expect(ranges.length).toBeGreaterThanOrEqual(3)
    const pos = doc.line(4).from
    const ancestors = stickyAncestorsOf({ doc, pos, foldRanges: ranges })
    expect(ancestors.length).toBeGreaterThan(0)
    expect(ancestors.some((item) => item.text.includes('"a"') || item.text.includes('{'))).toBe(
      true,
    )
  })

  it('字符串内的括号不参与折叠', () => {
    const doc = Text.of(['{', '  "k": "a{b}[c]",', '  "y": 1', '}'])
    const ranges = collectBraceFoldRanges(doc)
    expect(ranges).toHaveLength(1)
    expect(ranges[0]?.from).toBe(0)
  })

  it('空文档返回空', () => {
    expect(collectBraceFoldRanges(Text.of(['']))).toEqual([])
  })
})
