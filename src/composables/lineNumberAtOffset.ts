/** 文档偏移对应的 1 起行号（与 CodeMirror line.number 一致）。 */
export function lineNumberAtOffset(source: string, offset: number): number {
  const pos = Math.max(0, Math.min(offset, source.length))
  let line = 1
  for (let i = 0; i < pos; i++) {
    if (source.charCodeAt(i) === 10) line++
  }
  return line
}

/** 同一份文档上多次查行号：先收换行起点，再二分。 */
export function createLineNumberLocator(source: string): (offset: number) => number {
  const starts: number[] = [0]
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === 10) starts.push(i + 1)
  }
  return (offset: number) => {
    const pos = Math.max(0, Math.min(offset, source.length))
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if ((starts[mid] ?? 0) <= pos) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
}
