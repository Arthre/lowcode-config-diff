import { describe, expect, it } from 'vitest'
import {
  clampWorkspaceMainPct,
  WORKSPACE_MAIN_PCT_DEFAULT,
  WORKSPACE_MAIN_PCT_MAX,
  WORKSPACE_MAIN_PCT_MIN,
} from './useWorkspaceSplit'

describe('clampWorkspaceMainPct', () => {
  it('非有限值回退默认占比', () => {
    expect(clampWorkspaceMainPct(Number.NaN)).toBe(WORKSPACE_MAIN_PCT_DEFAULT)
    expect(clampWorkspaceMainPct(Number.POSITIVE_INFINITY)).toBe(WORKSPACE_MAIN_PCT_DEFAULT)
  })

  it('限制在最小与最大之间', () => {
    expect(clampWorkspaceMainPct(0)).toBe(WORKSPACE_MAIN_PCT_MIN)
    expect(clampWorkspaceMainPct(100)).toBe(WORKSPACE_MAIN_PCT_MAX)
  })

  it('量化到一位小数', () => {
    expect(clampWorkspaceMainPct(66.66)).toBe(66.7)
    expect(clampWorkspaceMainPct(70)).toBe(70)
  })
})
