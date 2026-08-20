import { evaluateJsonDocument } from '@/composables/useJsonDocument'

export type RightDocExportHint =
  { kind: 'empty' } | { kind: 'valid' } | { kind: 'invalid'; message: string }

/** 描述右栏文档状态：empty / valid / invalid。下载是否放行由 guardRightDocDownload 决定。 */
export function describeRightDocExport(rightDoc: string): RightDocExportHint {
  const state = evaluateJsonDocument(rightDoc)

  if (state.status === 'empty') {
    return { kind: 'empty' }
  }

  if (state.status === 'valid') {
    return { kind: 'valid' }
  }

  const parts = [state.errorMessage ?? 'JSON 校验失败']
  if (state.errorLine != null && state.errorColumn != null) {
    parts.push(`（行 ${state.errorLine}，列 ${state.errorColumn}）`)
  }

  return { kind: 'invalid', message: parts.join(' ') }
}
