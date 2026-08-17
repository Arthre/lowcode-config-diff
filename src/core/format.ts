import type { Config } from './types'

export function formatConfig(config: Config): string {
  return JSON.stringify(config, null, 2)
}

/** 无缩进压缩 JSON，便于复制/下载体积更小的结果。 */
export function compressConfig(config: Config): string {
  return JSON.stringify(config)
}
