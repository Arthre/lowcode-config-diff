import { formatJsonDocument } from '@/features/merge/lib/json/document'
import { shouldSkipImportFormat } from '@/features/merge/lib/policy/largeDoc'

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

/** 从拖放或文件选择器中取出优先的 JSON 文件。 */
export function pickJsonFile(fileList: FileList | null | undefined): File | null {
  if (!fileList || fileList.length === 0) return null
  const files = Array.from(fileList)
  const jsonFile = files.find(
    (file) => file.type === 'application/json' || file.name.toLowerCase().endsWith('.json'),
  )
  if (jsonFile) return jsonFile
  const plain = files.find((file) => file.type === '' || file.type === 'text/plain')
  return plain ?? files[0] ?? null
}
