import type { Config, JsonValue } from './types'
import { ParseConfigError } from './types'

export { ParseConfigError }

function positionToLineColumn(source: string, position: number): { line: number; column: number } {
  const safePosition = Math.max(0, Math.min(position, source.length))
  const before = source.slice(0, safePosition)
  const lines = before.split('\n')
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 }
}

function tryReadJsonPosition(message: string): number | undefined {
  const match = /position\s+(\d+)/i.exec(message)
  if (!match) return undefined
  return Number(match[1])
}

function isPlainObject(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseConfig(input: string): Config {
  let parsed: unknown
  try {
    parsed = JSON.parse(input) as unknown
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON 解析失败'
    const position = tryReadJsonPosition(message)
    if (position !== undefined) {
      const { line, column } = positionToLineColumn(input, position)
      throw new ParseConfigError(message, { line, column })
    }
    throw new ParseConfigError(message)
  }

  if (parsed === null || typeof parsed !== 'object') {
    throw new ParseConfigError('配置顶层必须是 object 或 array')
  }

  return parsed as Config
}

export function isConfig(value: unknown): value is Config {
  return Array.isArray(value) || isPlainObject(value)
}
