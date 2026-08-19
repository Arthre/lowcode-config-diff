import { compressConfig } from '@/core/format'
import { parseConfig } from '@/core/parse'
import {
  describeRightDocExport,
  type RightDocExportHint,
} from '@/composables/describeRightDocExport'

export type PackedRightDocDownload = {
  content: string
  filename: string
  hint: RightDocExportHint
}

/** 打包右栏下载：压缩仅对合法 JSON 生效，非法时仍导出原文。 */
export function packRightDocDownload(text: string, compressed: boolean): PackedRightDocDownload {
  const hint = describeRightDocExport(text)
  if (!compressed || hint.kind !== 'valid') {
    return { content: text, filename: 'config.json', hint }
  }
  return {
    content: compressConfig(parseConfig(text)),
    filename: 'config.min.json',
    hint,
  }
}
