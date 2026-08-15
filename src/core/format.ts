import type { Config } from './types'

export function formatConfig(config: Config): string {
  return JSON.stringify(config, null, 2)
}
