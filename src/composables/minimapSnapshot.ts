/** 把文档偏移换成 0 起的行号。 */
export function lineAtOffset(text: string, offset: number): number {
  if (text.length === 0) return 0
  let line = 0
  const limit = Math.max(0, Math.min(offset, text.length))
  for (let i = 0; i < limit; i++) {
    if (text.charCodeAt(i) === 10) line += 1
  }
  return line
}

/** 按区间标记哪些行发生了差异（区间按 [from, to)）。 */
export function changedLineFlags(
  text: string,
  ranges: readonly { from: number; to: number }[],
): boolean[] {
  const lineCount = text.split('\n').length
  const flags = Array.from({ length: lineCount }, () => false)
  for (const range of ranges) {
    const from = Math.max(0, Math.min(range.from, text.length))
    const to = Math.max(0, Math.min(range.to, text.length))
    const start = lineAtOffset(text, from)
    const end = to > from ? lineAtOffset(text, to - 1) : start
    for (let i = start; i <= end && i < flags.length; i++) flags[i] = true
  }
  return flags
}
