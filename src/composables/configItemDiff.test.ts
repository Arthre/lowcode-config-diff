import { describe, expect, it } from 'vitest'
import {
  configItemFieldCountText,
  configItemInvolveText,
  diffConfigItems,
  directoryFieldSummaryText,
  formatJsonPath,
  formatJumpLineNumber,
} from './configItemDiff'

describe('formatJsonPath', () => {
  it('数组下标写成方括号', () => {
    expect(
      formatJsonPath([
        { type: 'key', key: 'tableGrid' },
        { type: 'index', index: 3 },
      ]),
    ).toBe('tableGrid[3]')
  })

  it('首段 key 无前导点，后续 key 用点连接', () => {
    expect(
      formatJsonPath([
        { type: 'key', key: 'pagination' },
        { type: 'key', key: 'pageSize' },
      ]),
    ).toBe('pagination.pageSize')
  })
})

describe('configItemFieldCountText / configItemInvolveText', () => {
  it('中文计数文案', () => {
    expect(configItemFieldCountText(55)).toBe('55 个字段变化')
    expect(configItemInvolveText(12)).toBe('涉及 12 个配置项')
  })
})

describe('directoryFieldSummaryText', () => {
  it('可解析且有变化时拼出目录顶栏摘要', () => {
    expect(directoryFieldSummaryText(55, 12)).toBe('55 个字段变化 · 涉及 12 个配置项')
  })

  it('fields 小于等于 0 时返回空串', () => {
    expect(directoryFieldSummaryText(0, 12)).toBe('')
    expect(directoryFieldSummaryText(-1, 3)).toBe('')
  })
})

describe('formatJumpLineNumber', () => {
  it('正行号格式化为 L 前缀', () => {
    expect(formatJumpLineNumber(218)).toBe('L218')
  })

  it('行号小于等于 0 时返回空串', () => {
    expect(formatJumpLineNumber(0)).toBe('')
    expect(formatJumpLineNumber(-2)).toBe('')
  })
})

describe('diffConfigItems', () => {
  it('非法 JSON 时 available 为 false 且分组为空', () => {
    const result = diffConfigItems('{', '{"a":1}')
    expect(result).toEqual({ available: false, fields: 0, items: 0, groups: [] })
  })

  it('空字符串按 unavailable 处理', () => {
    expect(diffConfigItems('', '{"a":1}')).toEqual({
      available: false,
      fields: 0,
      items: 0,
      groups: [],
    })
    expect(diffConfigItems('{"a":1}', '')).toEqual({
      available: false,
      fields: 0,
      items: 0,
      groups: [],
    })
  })

  it('根不是 object 或 array 时 unavailable', () => {
    expect(diffConfigItems('1', '{"a":1}')).toEqual({
      available: false,
      fields: 0,
      items: 0,
      groups: [],
    })
    expect(diffConfigItems('{"a":1}', '"x"')).toEqual({
      available: false,
      fields: 0,
      items: 0,
      groups: [],
    })
  })

  it('按下标把数组对象项收成配置项并列出字段 from→to', () => {
    const left = JSON.stringify({
      tableGrid: [{ columnType: 'normal', width: '240' }, { title: '旧' }],
    })
    const right = JSON.stringify({
      tableGrid: [{ columnType: 'custom', width: '320' }, { title: '旧' }],
    })
    const result = diffConfigItems(left, right)
    expect(result.available).toBe(true)
    expect(result.items).toBe(1)
    expect(result.fields).toBe(2)
    expect(result.groups[0]?.id).toBe('tableGrid[0]')
    expect(result.groups[0]?.kind).toBe('modified')
    expect(result.groups[0]?.fields.map((f) => f.relativeLabel)).toEqual(['columnType', 'width'])
    expect(result.groups[0]?.fields[0]?.leftText).toBe('"normal"')
    expect(result.groups[0]?.fields[0]?.rightText).toBe('"custom"')
  })

  it('仅目标有的数组项为新增组', () => {
    const left = JSON.stringify({ tableGrid: [{ a: 1 }] })
    const right = JSON.stringify({ tableGrid: [{ a: 1 }, { b: 2 }] })
    const result = diffConfigItems(left, right)
    expect(result.groups.some((g) => g.id === 'tableGrid[1]' && g.kind === 'added')).toBe(true)
  })

  it('一侧缺少对象数组时仍按下标拆成配置项', () => {
    const result = diffConfigItems('{}', JSON.stringify({ tableGrid: [{ a: 1 }, { b: 2 }] }))
    expect(result.available).toBe(true)
    expect(result.groups.map((g) => g.id)).toEqual(['tableGrid[0]', 'tableGrid[1]'])
    expect(result.groups.every((g) => g.kind === 'added')).toBe(true)
  })

  it('右侧缺少对象数组时仍按下标拆成删除组', () => {
    const result = diffConfigItems(JSON.stringify({ tableGrid: [{ a: 1 }, { b: 2 }] }), '{}')
    expect(result.available).toBe(true)
    expect(result.groups.map((g) => g.id)).toEqual(['tableGrid[0]', 'tableGrid[1]'])
    expect(result.groups.every((g) => g.kind === 'removed')).toBe(true)
  })

  it('对象与对象数组类型冲突时不按下标拆', () => {
    const result = diffConfigItems(
      JSON.stringify({ tableGrid: { a: 1 } }),
      JSON.stringify({ tableGrid: [{ a: 1 }] }),
    )
    expect(result.available).toBe(true)
    expect(result.groups.map((g) => g.id)).toEqual(['tableGrid'])
  })

  it('无数组祖先时归到顶层 key', () => {
    const left = JSON.stringify({ pagination: { pageSize: 10 } })
    const right = JSON.stringify({ pagination: { pageSize: 20 } })
    const result = diffConfigItems(left, right)
    expect(result.groups[0]?.id).toBe('pagination')
    expect(result.groups[0]?.fields[0]?.relativeLabel).toBe('pageSize')
  })

  it('相同配置不产出分组', () => {
    const text = JSON.stringify({ pagination: { pageSize: 10 } })
    const result = diffConfigItems(text, text)
    expect(result).toEqual({ available: true, fields: 0, items: 0, groups: [] })
  })

  it('无 object 元素的数组根且内容不同时归为一组，id 为（根）', () => {
    const result = diffConfigItems('[1,2]', '[1,3]')
    expect(result.available).toBe(true)
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]?.id).toBe('（根）')
    expect(result.groups[0]?.kind).toBe('modified')
    expect(result.groups[0]?.fields.length).toBeGreaterThanOrEqual(1)
  })

  it('展示文本超过 80 字时截断并加省略号', () => {
    const long = 'x'.repeat(81)
    const left = JSON.stringify({ title: '短' })
    const right = JSON.stringify({ title: long })
    const result = diffConfigItems(left, right)
    const field = result.groups[0]?.fields[0]
    expect(field?.kind).toBe('modified')
    expect(field?.rightText.endsWith('…')).toBe(true)
    expect(field?.rightText.length).toBe(81)
  })
})
