/** 差异目录树是否对用户开放。下架期间为 false，实现与测试保留。 */
export const DIRECTORY_TREE_ENABLED = false

export const DIRECTORY_DRAWER_OPEN_WIDTH = '16rem'
export const DIRECTORY_DRAWER_DURATION_MS = 240

export function directoryDrawerWidth(open: boolean): string {
  return open ? DIRECTORY_DRAWER_OPEN_WIDTH : '0'
}

export function directoryDrawerAriaLabel(open: boolean): string {
  return open ? '收起目录' : '展开目录'
}

/** 是否目录列自身的 width 过渡结束（忽略子节点冒泡）。 */
export function isDirectoryWidthTransitionEnd(event: {
  propertyName: string
  target: unknown
  currentTarget: unknown
}): boolean {
  return event.propertyName === 'width' && event.target === event.currentTarget
}

/** 开关后若 transitionend 未到，多少毫秒后兜底补测编辑器。减少动效为 0。 */
export function directoryDrawerMeasureFallbackMs(reducedMotion: boolean): number {
  return reducedMotion ? 0 : DIRECTORY_DRAWER_DURATION_MS
}
