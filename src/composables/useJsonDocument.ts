import { formatConfig } from '@/core/format'
import { parseConfig, ParseConfigError } from '@/core/parse'
import type { Config } from '@/core/types'

export type JsonDocumentStatus = 'empty' | 'valid' | 'invalid'

export interface JsonDocumentState {
  text: string
  status: JsonDocumentStatus
  errorMessage?: string
  errorLine?: number
  errorColumn?: number
  config?: Config
}

export function evaluateJsonDocument(text: string): JsonDocumentState {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return { text, status: 'empty' }
  }

  try {
    const config = parseConfig(text)
    return { text, status: 'valid', config }
  } catch (error) {
    if (error instanceof ParseConfigError) {
      return {
        text,
        status: 'invalid',
        errorMessage: error.message,
        errorLine: error.line,
        errorColumn: error.column,
      }
    }
    const message = error instanceof Error ? error.message : 'JSON 校验失败'
    return { text, status: 'invalid', errorMessage: message }
  }
}

export function formatJsonDocument(
  text: string,
): { ok: true; text: string } | { ok: false; message: string } {
  try {
    const config = parseConfig(text)
    return { ok: true, text: formatConfig(config) }
  } catch (error) {
    const message =
      error instanceof ParseConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : '格式化失败'
    return { ok: false, message }
  }
}
