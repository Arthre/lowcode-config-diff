/** 差异块目录首行预览；空区间或空白为「（空行）」，超长截断并加省略号。 */
export function chunkJumpPreview(source: string, from: number, to: number, maxChars = 80): string {
  const slice = source.slice(from, Math.max(from, to))
  const newline = slice.indexOf('\n')
  const firstLine = (newline === -1 ? slice : slice.slice(0, newline)).trim()
  if (firstLine.length === 0) return '（空行）'
  if (firstLine.length > maxChars) return `${firstLine.slice(0, maxChars)}…`
  return firstLine
}
