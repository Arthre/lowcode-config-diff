import { compressConfig } from '@/core/format'
import { parseConfig } from '@/core/parse'
import {
  describeRightDocExport,
  type RightDocExportHint,
} from '@/composables/describeRightDocExport'
import { toneFromExportHint, type StatusMessageTone } from '@/composables/statusMessage'

export type PackedRightDocDownload = {
  content: string
  filename: string
  hint: RightDocExportHint
}

export type GuardedRightDocDownload =
  | { allow: false; message: string; tone: StatusMessageTone }
  | { allow: true; content: string; filename: string; message: string; tone: StatusMessageTone }

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

/** 空栏阻断下载；合法或非法 JSON 才打包文件。 */
export function guardRightDocDownload(text: string, compressed: boolean): GuardedRightDocDownload {
  const packed = packRightDocDownload(text, compressed)
  if (packed.hint.kind === 'empty') {
    return { allow: false, message: '目标配置为空，无法导出', tone: 'warning' }
  }

  const message =
    packed.hint.kind === 'invalid' ? packed.hint.message : compressed ? '已压缩并导出' : '已导出'

  return {
    allow: true,
    content: packed.content,
    filename: packed.filename,
    message,
    tone: toneFromExportHint(packed.hint.kind),
  }
}
