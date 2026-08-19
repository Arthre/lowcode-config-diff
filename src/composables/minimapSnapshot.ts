export type MinimapCellRole = 'string' | 'number' | 'punct' | 'word'

export type MinimapCell = {
  from: number
  to: number
  role: MinimapCellRole
}

const PUNCT = new Set('{}[]:,')

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

/** 把一行拆成缩略快照色块；空白不绘制。 */
export function minimapCellsOf(line: string): MinimapCell[] {
  const cells: MinimapCell[] = []
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (ch === ' ' || ch === '\t') {
      i += 1
      continue
    }
    if (ch === '"') {
      const start = i
      i += 1
      while (i < line.length) {
        if (line[i] === '\\' && i + 1 < line.length) {
          i += 2
          continue
        }
        if (line[i] === '"') {
          i += 1
          break
        }
        i += 1
      }
      cells.push({ from: start, to: i, role: 'string' })
      continue
    }
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      const start = i
      if (ch === '-') i += 1
      while (i < line.length && ((line[i] >= '0' && line[i] <= '9') || line[i] === '.')) i += 1
      cells.push({ from: start, to: i, role: 'number' })
      continue
    }
    if (PUNCT.has(ch)) {
      cells.push({ from: i, to: i + 1, role: 'punct' })
      i += 1
      continue
    }
    const start = i
    i += 1
    while (i < line.length) {
      const next = line[i]
      if (next === ' ' || next === '\t' || next === '"' || PUNCT.has(next)) break
      if (next === '-' || (next >= '0' && next <= '9')) break
      i += 1
    }
    cells.push({ from: start, to: i, role: 'word' })
  }
  return cells
}

/** 画布像素行对应的源文档行。 */
export function snapshotLineIndex(pixelY: number, canvasHeight: number, lineCount: number): number {
  if (lineCount <= 0 || canvasHeight <= 0) return 0
  return Math.min(lineCount - 1, Math.floor((pixelY / canvasHeight) * lineCount))
}

export type MinimapPalette = {
  bg: string
  text: string
  string: string
  number: string
  punct: string
  changedLeft: string
  changedRight: string
}

function colorOf(role: MinimapCellRole, colors: MinimapPalette): string {
  if (role === 'string') return colors.string
  if (role === 'number') return colors.number
  if (role === 'punct') return colors.punct
  return colors.text
}

function paintColumn(
  ctx: CanvasRenderingContext2D,
  lines: readonly string[],
  changed: readonly boolean[],
  x: number,
  width: number,
  height: number,
  colors: MinimapPalette,
  changedFill: string,
) {
  const count = Math.max(lines.length, 1)
  const charW = 2
  const maxChars = Math.max(1, Math.floor(width / charW))
  const cellsByLine = lines.map(minimapCellsOf)
  for (let y = 0; y < height; y++) {
    const lineIndex = snapshotLineIndex(y, height, count)
    if (changed[lineIndex]) {
      ctx.fillStyle = changedFill
      ctx.fillRect(x, y, width, 1)
    }
    for (const cell of cellsByLine[lineIndex] ?? []) {
      if (cell.from >= maxChars) break
      const to = Math.min(cell.to, maxChars)
      ctx.fillStyle = colorOf(cell.role, colors)
      ctx.fillRect(x + cell.from * charW, y, Math.max(1, (to - cell.from) * charW - 0.25), 1)
    }
  }
}

/** 在画布上绘制左右两栏代码快照。 */
export function paintMinimapSnapshot(
  ctx: CanvasRenderingContext2D,
  options: {
    leftText: string
    rightText: string
    leftChanged: readonly boolean[]
    rightChanged: readonly boolean[]
    width: number
    height: number
    colors: MinimapPalette
  },
): void {
  const { width, height, colors } = options
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, width, height)
  const gap = 2
  const colW = Math.max(1, Math.floor((width - gap) / 2))
  paintColumn(
    ctx,
    options.leftText.split('\n'),
    options.leftChanged,
    0,
    colW,
    height,
    colors,
    colors.changedLeft,
  )
  paintColumn(
    ctx,
    options.rightText.split('\n'),
    options.rightChanged,
    colW + gap,
    Math.max(1, width - colW - gap),
    height,
    colors,
    colors.changedRight,
  )
}
