/** 文档偏移对应的 1 起行号（与 CodeMirror line.number 一致）。 */
export function lineNumberAtOffset(source: string, offset: number): number {
  const pos = Math.max(0, Math.min(offset, source.length))
  let line = 1
  for (let i = 0; i < pos; i++) {
    if (source.charCodeAt(i) === 10) line++
  }
  return line
}
