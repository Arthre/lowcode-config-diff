import type { MergeSide } from '@/stores/mergeWorkspace'

export type ClientRectX = {
  left: number
  right: number
}

/** 按横坐标相对左右栏判侧；中线归结果栏。 */
export function sideFromClientX(clientX: number, left: ClientRectX, right: ClientRectX): MergeSide {
  const mid = (left.right + right.left) / 2
  return clientX < mid ? 'left' : 'right'
}
