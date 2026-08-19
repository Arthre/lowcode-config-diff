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
