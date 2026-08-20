import type { RightDocExportHint } from '@/composables/describeRightDocExport'

export type StatusMessageTone = 'success' | 'warning' | 'error'

/** 成功短、警告稍长、失败更久，避免错误一闪而过。 */
export const STATUS_DISMISS_MS = {
  success: 2000,
  warning: 4000,
  error: 5000,
} as const satisfies Record<StatusMessageTone, number>

export function statusDismissMs(tone: StatusMessageTone): number {
  return STATUS_DISMISS_MS[tone]
}

/** 合法导出为成功；空栏阻断与非法 JSON 仍导出均为警告。 */
export function toneFromExportHint(kind: RightDocExportHint['kind']): StatusMessageTone {
  return kind === 'valid' ? 'success' : 'warning'
}
