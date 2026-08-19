import { Change, diff, type DiffConfig } from '@codemirror/merge'

const SURROGATE_START = 0xd800
const SURROGATE_SKIP = 0x800
/** BMP 去掉代理区后可编码的行种类上限；超出则退回字符 diff。 */
const MAX_UNIQUE_LINES = 0xf7ff

function tokenChar(index: number): string {
  const code = index < SURROGATE_START ? index : index + SURROGATE_SKIP
  return String.fromCharCode(code)
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

/** 按行对照，避免字符 diff 把未改行吞进同一块。 */
export function diffByLine(a: string, b: string): readonly Change[] {
  const aLines = linesOf(a)
  const bLines = linesOf(b)
  const aStarts = startsOf(aLines)
  const bStarts = startsOf(bLines)

  const tokenByLine = new Map<string, string>()
  const tokenOf = (line: string): string | null => {
    const existing = tokenByLine.get(line)
    if (existing !== undefined) return existing
    if (tokenByLine.size >= MAX_UNIQUE_LINES) return null
    const token = tokenChar(tokenByLine.size)
    tokenByLine.set(line, token)
    return token
  }

  const aTokens: string[] = []
  const bTokens: string[] = []
  for (const line of aLines) {
    const token = tokenOf(line)
    if (token === null) return diff(a, b, { scanLimit: 10_000, timeout: 1000 })
    aTokens.push(token)
  }
  for (const line of bLines) {
    const token = tokenOf(line)
    if (token === null) return diff(a, b, { scanLimit: 10_000, timeout: 1000 })
    bTokens.push(token)
  }

  return diff(aTokens.join(''), bTokens.join('')).map(
    (change) =>
      new Change(
        aStarts[change.fromA] ?? a.length,
        aStarts[change.toA] ?? a.length,
        bStarts[change.fromB] ?? b.length,
        bStarts[change.toB] ?? b.length,
      ),
  )
}

export const mergeViewDiffConfig: DiffConfig = {
  scanLimit: 10_000,
  timeout: 1000,
  override: diffByLine,
}
