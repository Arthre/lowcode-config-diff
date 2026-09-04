export type RevertDirection = 'a-to-b' | 'b-to-a'

export type MergeChunkRange = {
  fromA: number
  toA: number
  fromB: number
  toB: number
}

/**
 * 对齐 @codemirror/merge revertClicked：
 * 源区间 slice 到 to-1；非空块且目标 to 未越界时补 lineBreak。
 */
export function chunkRevertChange(
  direction: RevertDirection,
  chunk: MergeChunkRange,
  sourceText: string,
  destLength: number,
  lineBreak = '\n',
): { from: number; to: number; insert: string } {
  const srcFrom = direction === 'a-to-b' ? chunk.fromA : chunk.fromB
  const srcTo = direction === 'a-to-b' ? chunk.toA : chunk.toB
  const destFrom = direction === 'a-to-b' ? chunk.fromB : chunk.fromA
  const destTo = direction === 'a-to-b' ? chunk.toB : chunk.toA
  let insert = sourceText.slice(srcFrom, Math.max(srcFrom, srcTo - 1))
  if (srcFrom !== srcTo && destTo <= destLength) insert += lineBreak
  return {
    from: destFrom,
    to: Math.min(destLength, destTo),
    insert,
  }
}
