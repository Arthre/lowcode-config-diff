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

/** 判断 dragleave 是否真的离开合并框；OS 文件拖拽 relatedTarget 常为 null。 */
export function pointerLeftMergeFrame(
  frame: Pick<Element, 'contains'> & { getBoundingClientRect: () => DOMRect },
  event: { relatedTarget: EventTarget | null; clientX: number; clientY: number },
): boolean {
  if (event.relatedTarget instanceof Node && frame.contains(event.relatedTarget)) return false
  const rect = frame.getBoundingClientRect()
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
}
