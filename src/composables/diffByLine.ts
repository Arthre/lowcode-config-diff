import { Change, diff, type DiffConfig } from '@codemirror/merge'

const SURROGATE_START = 0xd800
const SURROGATE_SKIP = 0x800
/** BMP 去掉代理区后可编码的行种类上限；超出则退回字符 diff。 */
const MAX_UNIQUE_LINES = 0xf7ff

function tokenChar(index: number): string {
  const code = index < SURROGATE_START ? index : index + SURROGATE_SKIP
  return String.fromCharCode(code)
}

/** 按行映射到 BMP token；唯一行超出 maxUnique 时返回 null（过粗）。 */
export function tokenizeLines(
  lines: readonly string[],
  maxUnique: number,
  tokenByLine: Map<string, string> = new Map(),
): string[] | null {
  const tokens: string[] = []
  for (const line of lines) {
    const existing = tokenByLine.get(line)
    if (existing !== undefined) {
      tokens.push(existing)
      continue
    }
    if (tokenByLine.size >= maxUnique) return null
    const token = tokenChar(tokenByLine.size)
    tokenByLine.set(line, token)
    tokens.push(token)
  }
  return tokens
}

function linesOf(text: string): string[] {
  if (text.length === 0) return []
  const lines: string[] = []
  let start = 0
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      lines.push(text.slice(start, i + 1))
      start = i + 1
    }
  }
  if (start < text.length) lines.push(text.slice(start))
  return lines
}

function startsOf(lines: string[]): number[] {
  const starts = [0]
  let acc = 0
  for (const line of lines) {
    acc += line.length
    starts.push(acc)
  }
  return starts
}

let lastDiffCoarse = false

/** 最近一次 diff 是否因唯一行溢出或耗时过长而过粗。 */
export function takeLastDiffCoarse(): boolean {
  return lastDiffCoarse
}

/** 按行对照，避免字符 diff 把未改行吞进同一块。 */
export function diffByLine(a: string, b: string): readonly Change[] {
  lastDiffCoarse = false
  const startedAt = performance.now()
  const aLines = linesOf(a)
  const bLines = linesOf(b)
  const aStarts = startsOf(aLines)
  const bStarts = startsOf(bLines)

  const tokenByLine = new Map<string, string>()
  const aTokens = tokenizeLines(aLines, MAX_UNIQUE_LINES, tokenByLine)
  const bTokens = aTokens === null ? null : tokenizeLines(bLines, MAX_UNIQUE_LINES, tokenByLine)

  if (aTokens === null || bTokens === null) {
    lastDiffCoarse = true
    return diff(a, b, { scanLimit: 10_000, timeout: 1000 })
  }

  const changes = diff(aTokens.join(''), bTokens.join('')).map(
    (change) =>
      new Change(
        aStarts[change.fromA] ?? a.length,
        aStarts[change.toA] ?? a.length,
        bStarts[change.fromB] ?? b.length,
        bStarts[change.toB] ?? b.length,
      ),
  )
  if (performance.now() - startedAt >= 1000) {
    lastDiffCoarse = true
  }
  return changes
}

export const mergeViewDiffConfig: DiffConfig = {
  scanLimit: 10_000,
  timeout: 1000,
  override: diffByLine,
}
