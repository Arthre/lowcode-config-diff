export const LARGE_DOC_BYTES = 1_000_000
export const LARGE_DOC_LINES = 15_000
/** 文档变化触发的 chrome layout 防抖（毫秒）。 */
export const CHROME_LAYOUT_DEBOUNCE_MS = 150

/** 文本是否视为大文档（字节或行数阈值）。 */
export function isLargeDoc(text: string): boolean {
  if (text.length >= LARGE_DOC_BYTES) {
    return true
  }
  if (text.length < LARGE_DOC_LINES) {
    return false
  }
  let newlineCount = 0
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      newlineCount++
    }
  }
  const lineEstimate = newlineCount + (text.length > 0 ? 1 : 0)
  return lineEstimate >= LARGE_DOC_LINES
}

/** 导入时是否跳过 JSON 格式化（仅字节阈值）。 */
export function shouldSkipImportFormat(raw: string): boolean {
  return raw.length >= LARGE_DOC_BYTES
}

export const SKIP_IMPORT_FORMAT_NOTICE = '文件较大，已保留原文；需要排版请点栏头格式化'
export const COARSE_DIFF_NOTICE = '文档较大，差异块可能较粗'

/** 本轮导入已提示跳过格式化时，过粗提示让路，避免覆盖同一 UiMessage。 */
export function shouldEmitCoarseNotice(options: {
  coarse: boolean
  alreadyShown: boolean
  skipFormatJustShown: boolean
}): boolean {
  if (options.skipFormatJustShown) return false
  return options.coarse && !options.alreadyShown
}
