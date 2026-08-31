import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { LARGE_DOC_BYTES } from '@/composables/largeDocPolicy'
import { useMergeWorkspace } from '@/stores/mergeWorkspace'
import { useMergeSideImport } from './useMergeSideImport'

describe('useMergeSideImport formatSide', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('合法压缩 JSON 格式化为缩进 2，且不改文件名与对侧', () => {
    const workspace = useMergeWorkspace()
    workspace.importSide('left', '{"a":1}', 'keep.json')
    workspace.setLeftDoc('{"a":1}')
    workspace.setRightDoc('keep-right')

    const { formatSide } = useMergeSideImport()
    formatSide('left')

    expect(workspace.leftDoc).toBe('{\n  "a": 1\n}')
    expect(workspace.leftFileName).toBe('keep.json')
    expect(workspace.rightDoc).toBe('keep-right')
  })

  it('非法 JSON 写入该侧错误且不改文档', () => {
    const workspace = useMergeWorkspace()
    workspace.setLeftDoc('{')

    const { formatSide, leftError } = useMergeSideImport()
    formatSide('left')

    expect(workspace.leftDoc).toBe('{')
    expect(leftError.value.length).toBeGreaterThan(0)
  })

  it('格式化成功后清除该侧错误', () => {
    const workspace = useMergeWorkspace()
    workspace.setRightDoc('{"b":2}')

    const { formatSide, rightError } = useMergeSideImport()
    rightError.value = '上次失败'
    formatSide('right')

    expect(workspace.rightDoc).toBe('{\n  "b": 2\n}')
    expect(rightError.value).toBe('')
  })

  it('空文档禁用格式化', () => {
    const { isFormatDisabled } = useMergeSideImport()
    expect(isFormatDisabled('left')).toBe(true)
    expect(isFormatDisabled('right')).toBe(true)
  })

  it('仅空白文档禁用格式化，有内容则可用', () => {
    const workspace = useMergeWorkspace()
    workspace.setLeftDoc('   ')
    workspace.setRightDoc('{"ok":true}')

    const { isFormatDisabled } = useMergeSideImport()
    expect(isFormatDisabled('left')).toBe(true)
    expect(isFormatDisabled('right')).toBe(false)
  })
})

describe('useMergeSideImport importText', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('跳过格式化时发出栏头提示且不二次解析', () => {
    const notices: { text: string; tone: string }[] = []
    const { importText } = useMergeSideImport({
      onNotice: (notice) => notices.push(notice),
    })
    const raw = 'x'.repeat(LARGE_DOC_BYTES)
    const prepared = importText('left', raw, 'big.json')

    expect(prepared.skippedFormat).toBe(true)
    expect(prepared.text).toBe(raw)
    expect(useMergeWorkspace().leftDoc).toBe(raw)
    expect(notices).toEqual([
      { text: '文件较大，已保留原文；需要排版请点栏头格式化', tone: 'warning' },
    ])
  })

  it('小文件导入不发出跳过格式化提示', () => {
    const notices: { text: string; tone: string }[] = []
    const { importText } = useMergeSideImport({
      onNotice: (notice) => notices.push(notice),
    })
    importText('left', '{"a":1}')
    expect(notices).toEqual([])
  })
})
