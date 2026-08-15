import type { DiffItem } from '@/core/types'

export function summarizeMergeSides(leaves: DiffItem[]): {
  total: number
  testCount: number
  prodCount: number
} {
  let testCount = 0
  let prodCount = 0
  for (const leaf of leaves) {
    if (leaf.side === 'test') testCount += 1
    else if (leaf.side === 'prod') prodCount += 1
  }
  return { total: leaves.length, testCount, prodCount }
}

export function buildMergeSummaryText(leaves: DiffItem[]): string {
  const { total, prodCount } = summarizeMergeSides(leaves)
  if (total === 0) return '无差异，结果与 TEST 一致'
  return `共 ${total} 项差异，其中 ${prodCount} 项取 PROD`
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function downloadJsonFile(content: string, filename = 'config.json'): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // 延迟释放，避免部分浏览器下载尚未启动就失效
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
