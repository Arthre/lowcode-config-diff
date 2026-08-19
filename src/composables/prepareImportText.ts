import { formatJsonDocument } from '@/composables/useJsonDocument'

export type PreparedImport = { text: string; didFormat: boolean }

/** 导入文本：合法 object/array 则格式化一次，否则保留原文。 */
export function prepareImportText(raw: string): PreparedImport {
  const formatted = formatJsonDocument(raw)
  if (formatted.ok) {
    return { text: formatted.text, didFormat: true }
  }
  return { text: raw, didFormat: false }
}
