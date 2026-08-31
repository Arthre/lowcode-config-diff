import { formatJsonDocument } from '@/composables/useJsonDocument'
import { shouldSkipImportFormat } from '@/composables/largeDocPolicy'

export type PreparedImport = {
  text: string
  didFormat: boolean
  skippedFormat?: boolean
}

/** 导入文本：合法 object/array 则格式化一次，否则保留原文。 */
export function prepareImportText(raw: string): PreparedImport {
  if (shouldSkipImportFormat(raw)) {
    return { text: raw, didFormat: false, skippedFormat: true }
  }

  const formatted = formatJsonDocument(raw)
  if (formatted.ok) {
    return { text: formatted.text, didFormat: true, skippedFormat: false }
  }
  return { text: raw, didFormat: false, skippedFormat: false }
}
