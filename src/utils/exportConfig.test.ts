import { describe, expect, it } from 'vitest'
import type { DiffItem } from '@/core/types'
import { buildMergeSummaryText, summarizeMergeSides } from './exportConfig'

function leaf(partial: Partial<DiffItem> & Pick<DiffItem, 'id' | 'type' | 'side'>): DiffItem {
  return { path: [partial.id], ...partial }
}

describe('summarizeMergeSides', () => {
  it('统计 test/prod 数量', () => {
    const leaves = [
      leaf({ id: 'a', type: 'modified', side: 'test' }),
      leaf({ id: 'b', type: 'added', side: 'test' }),
      leaf({ id: 'c', type: 'removed', side: 'prod' }),
    ]
    expect(summarizeMergeSides(leaves)).toEqual({ total: 3, testCount: 2, prodCount: 1 })
  })
})

describe('buildMergeSummaryText', () => {
  it('无差异时说明与 TEST 一致', () => {
    expect(buildMergeSummaryText([])).toMatch(/无差异/)
  })

  it('有差异时包含总数与取 PROD 数', () => {
    const text = buildMergeSummaryText([
      leaf({ id: 'a', type: 'modified', side: 'test' }),
      leaf({ id: 'c', type: 'removed', side: 'prod' }),
    ])
    expect(text).toContain('2')
    expect(text).toMatch(/PROD/)
  })
})
