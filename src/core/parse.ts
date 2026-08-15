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

/** 将引擎原生 JSON.parse 英文错误转为页面可读的中文提示 */
export function toChineseJsonParseMessage(rawMessage: string): string {
  const position = tryReadJsonPosition(rawMessage)

  if (/unexpected end of json input/i.test(rawMessage)) {
    return position === undefined
      ? 'JSON 不完整，内容意外结束'
      : `JSON 不完整，内容意外结束（位置 ${position}）`
  }

  const unexpectedToken = /unexpected token\s+(\S+)\s+in json/i.exec(rawMessage)
  if (unexpectedToken) {
    const token = unexpectedToken[1]!
    return position === undefined
      ? `JSON 语法错误：意外的标记 ${token}`
      : `JSON 语法错误：意外的标记 ${token}（位置 ${position}）`
  }

  if (/unexpected (number|string|identifier|true|false|null)/i.test(rawMessage)) {
    return position === undefined
      ? 'JSON 语法错误：出现意外的值'
      : `JSON 语法错误：出现意外的值（位置 ${position}）`
  }

  if (/expected property name/i.test(rawMessage)) {
    return position === undefined
      ? 'JSON 语法错误：期望属性名'
      : `JSON 语法错误：期望属性名（位置 ${position}）`
  }

  if (/bad control character/i.test(rawMessage)) {
    return position === undefined
      ? 'JSON 语法错误：字符串中含非法控制字符'
      : `JSON 语法错误：字符串中含非法控制字符（位置 ${position}）`
  }

  if (/unexpected non-whitespace/i.test(rawMessage)) {
    return position === undefined
      ? 'JSON 语法错误：合法内容后仍有多余字符'
      : `JSON 语法错误：合法内容后仍有多余字符（位置 ${position}）`
  }

  // 未识别的引擎文案：不把英文原文直接展示给用户
  return position === undefined ? 'JSON 解析失败' : `JSON 解析失败（位置 ${position}）`
}

function isPlainObject(value: unknown): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseConfig(input: string): Config {
  let parsed: unknown
  try {
    parsed = JSON.parse(input) as unknown
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'JSON 解析失败'
    const message = toChineseJsonParseMessage(rawMessage)
    const position = tryReadJsonPosition(rawMessage)
    if (position !== undefined) {
      const { line, column } = positionToLineColumn(input, position)
      throw new ParseConfigError(message, { line, column })
    }
    throw new ParseConfigError(message)
  }

  if (parsed === null || typeof parsed !== 'object') {
    throw new ParseConfigError('配置顶层必须是对象或数组')
  }

  return parsed as Config
}

export function isConfig(value: unknown): value is Config {
  return Array.isArray(value) || isPlainObject(value)
}
