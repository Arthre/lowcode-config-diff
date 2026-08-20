export const DIRECTORY_DRAWER_OPEN_WIDTH = '16rem'
export const DIRECTORY_DRAWER_DURATION_MS = 240

export function directoryDrawerWidth(open: boolean): string {
  return open ? DIRECTORY_DRAWER_OPEN_WIDTH : '0'
}

export function directoryDrawerAriaLabel(open: boolean): string {
  return open ? '收起目录' : '展开目录'
}
