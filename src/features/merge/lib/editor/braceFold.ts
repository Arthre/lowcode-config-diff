import type { Text } from '@codemirror/state'
import type { FoldRange } from './stickyScrollAncestors'

/**
 * 无语法树时用括号栈收集 `{}` / `[]` 折叠区间（跳过字符串）。
 * 供大文件 lite（无 language）Sticky 回退；不解析 JSON 语义。
 */
export function collectBraceFoldRanges(doc: Text): FoldRange[] {
  if (doc.length === 0) return []

  const ranges: FoldRange[] = []
  const stack: { from: number; open: '{' | '[' }[] = []
  let inString = false
  let escape = false

  for (let lineNum = 1; lineNum <= doc.lines; lineNum += 1) {
    const line = doc.line(lineNum)
    const text = line.text
    for (let i = 0; i < text.length; i += 1) {
      const ch = text.charCodeAt(i)
      const pos = line.from + i

      if (inString) {
        if (escape) {
          escape = false
          continue
        }
        if (ch === 92 /* \ */) {
          escape = true
          continue
        }
        if (ch === 34 /* " */) inString = false
        continue
      }

      if (ch === 34 /* " */) {
        inString = true
        continue
      }
      if (ch === 123 /* { */ || ch === 91 /* [ */) {
        stack.push({ from: pos, open: ch === 123 ? '{' : '[' })
        continue
      }
      if (ch === 125 /* } */ || ch === 93 /* ] */) {
        const expected = ch === 125 ? '{' : '['
        const top = stack.pop()
        if (!top || top.open !== expected) {
          stack.length = 0
          continue
        }
        if (pos + 1 > top.from) {
          ranges.push({ from: top.from, to: pos + 1 })
        }
      }
    }
  }

  return ranges
}
