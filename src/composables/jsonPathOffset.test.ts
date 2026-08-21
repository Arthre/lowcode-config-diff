import { describe, expect, it } from 'vitest'
import { jsonPathOffset, jsonPathOffsets } from './jsonPathOffset'

describe('jsonPathOffset', () => {
  it('空路径返回 0', () => {
    expect(jsonPathOffset('{"a":1}', [])).toBe(0)
  })

  it('空源且空路径仍返回 0', () => {
    expect(jsonPathOffset('', [])).toBe(0)
  })

  it('定位对象属性名起始', () => {
    const source = '{\n  "title": "A"\n}'
    expect(jsonPathOffset(source, [{ type: 'key', key: 'title' }])).toBe(source.indexOf('"title"'))
  })

  it('定位数组元素起始', () => {
    const source = '{"items":[1, {"x":2}, 3]}'
    const offset = jsonPathOffset(source, [
      { type: 'key', key: 'items' },
      { type: 'index', index: 1 },
    ])
    expect(offset).toBe(source.indexOf('{"x":2}'))
  })

  it('定位嵌套数组元素的字段', () => {
    const source = `{
  "tableGrid": [
    { "columnType": "normal" },
    { "columnType": "custom" }
  ]
}`
    const offset = jsonPathOffset(source, [
      { type: 'key', key: 'tableGrid' },
      { type: 'index', index: 1 },
      { type: 'key', key: 'columnType' },
    ])
    expect(offset).toBe(source.lastIndexOf('"columnType"'))
  })

  it('路径不存在或非法 JSON 返回 null', () => {
    expect(jsonPathOffset('{"a":1}', [{ type: 'key', key: 'b' }])).toBeNull()
    expect(jsonPathOffset('{', [{ type: 'key', key: 'a' }])).toBeNull()
  })

  it('字符串内的括号不干扰扫描', () => {
    const source = '{"note":"[not-an-array]","list":[true]}'
    const offset = jsonPathOffset(source, [
      { type: 'key', key: 'list' },
      { type: 'index', index: 0 },
    ])
    expect(offset).toBe(source.indexOf('true'))
  })

  it('定位 Unicode 键', () => {
    const source = '{"标题":"A"}'
    expect(jsonPathOffset(source, [{ type: 'key', key: '标题' }])).toBe(source.indexOf('"标题"'))
  })

  it('转义键按解码后的键名定位', () => {
    const source = '{"a\\\\b":1}'
    expect(jsonPathOffset(source, [{ type: 'key', key: 'a\\b' }])).toBe(source.indexOf('"a\\\\b"'))
  })
})

describe('jsonPathOffsets', () => {
  it('空路径批量仍为 0，且不因非法源失败', () => {
    expect(jsonPathOffsets('', [[]])).toEqual([0])
    expect(jsonPathOffsets('{', [[]])).toEqual([0])
  })

  it('一次扫描收下共享前缀的多条路径', () => {
    const source = `{
  "tableGrid": [
    { "columnType": "normal", "hidden": false },
    { "columnType": "custom", "hidden": true }
  ],
  "title": "A"
}`
    const table0Type = [
      { type: 'key' as const, key: 'tableGrid' },
      { type: 'index' as const, index: 0 },
      { type: 'key' as const, key: 'columnType' },
    ]
    const table1Hidden = [
      { type: 'key' as const, key: 'tableGrid' },
      { type: 'index' as const, index: 1 },
      { type: 'key' as const, key: 'hidden' },
    ]
    const title = [{ type: 'key' as const, key: 'title' }]
    const missing = [{ type: 'key' as const, key: 'nope' }]

    expect(
      jsonPathOffsets(source, [table0Type, [], table1Hidden, title, missing, table0Type]),
    ).toEqual([
      jsonPathOffset(source, table0Type),
      0,
      jsonPathOffset(source, table1Hidden),
      jsonPathOffset(source, title),
      null,
      jsonPathOffset(source, table0Type),
    ])
  })

  it('字符串内的转义引号不干扰后续键', () => {
    const source = '{"note":"say \\"hi\\"","ok":true}'
    expect(jsonPathOffsets(source, [[{ type: 'key', key: 'ok' }]])).toEqual([
      source.indexOf('"ok"'),
    ])
  })
})
