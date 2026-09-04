import { SKIP_IMPORT_FORMAT_NOTICE } from '@/features/merge/lib/policy/largeDoc'
import { pickJsonFile } from '@/features/merge/lib/import/prepareText'
import type { PreparedImport } from '@/features/merge/lib/import/prepareText'
import type { StatusMessageTone } from '@/features/merge/lib/policy/statusMessage'
import { formatJsonDocument } from '@/features/merge/lib/json/document'
import { useMergeWorkspace, type MergeSide } from '@/stores/mergeWorkspace'

export type MergeNotice = {
  text: string
  tone: StatusMessageTone
}

/** 双侧文件导入 / 粘贴全文 / 格式化 / 清空；错误与拖拽态留给宿主画。 */
export function useMergeSideImport(options?: { onNotice?: (notice: MergeNotice) => void }) {
  const workspace = useMergeWorkspace()

  const leftDragDepth = ref(0)
  const rightDragDepth = ref(0)
  const leftError = ref('')
  const rightError = ref('')

  function sideError(side: MergeSide) {
    return side === 'left' ? leftError : rightError
  }

  function sideDragDepth(side: MergeSide) {
    return side === 'left' ? leftDragDepth : rightDragDepth
  }

  function sideDoc(side: MergeSide) {
    return side === 'left' ? workspace.leftDoc : workspace.rightDoc
  }

  function sideFileName(side: MergeSide) {
    return side === 'left' ? workspace.leftFileName : workspace.rightFileName
  }

  function isClearDisabled(side: MergeSide) {
    return !sideDoc(side) && !sideFileName(side)
  }

  function isFormatDisabled(side: MergeSide) {
    return sideDoc(side).trim().length === 0
  }

  function importText(side: MergeSide, raw: string, fileName?: string): PreparedImport {
    const prepared = workspace.importSide(side, raw, fileName)
    if (prepared.skippedFormat) {
      options?.onNotice?.({
        text: SKIP_IMPORT_FORMAT_NOTICE,
        tone: 'warning',
      })
    }
    return prepared
  }

  function formatSide(side: MergeSide) {
    if (isFormatDisabled(side)) return

    const formatted = formatJsonDocument(sideDoc(side))
    if (!formatted.ok) {
      sideError(side).value = formatted.message
      return
    }

    sideError(side).value = ''
    if (side === 'left') workspace.setLeftDoc(formatted.text)
    else workspace.setRightDoc(formatted.text)
  }

  function readFile(side: MergeSide, file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        sideError(side).value = '读取文件失败，请重试'
        return
      }
      sideError(side).value = ''
      importText(side, reader.result, file.name)
    }
    reader.onerror = () => {
      sideError(side).value = '读取文件失败，请重试'
    }
    reader.readAsText(file)
  }

  function onFileSelected(side: MergeSide, event: Event) {
    const input = event.target as HTMLInputElement
    const file = pickJsonFile(input.files)
    if (file) readFile(side, file)
    input.value = ''
  }

  function enterDrag(side: MergeSide) {
    sideDragDepth(side).value += 1
  }

  function leaveDrag(side: MergeSide) {
    const depth = sideDragDepth(side)
    depth.value = Math.max(0, depth.value - 1)
  }

  function dropFiles(side: MergeSide, fileList: FileList | null | undefined) {
    sideDragDepth(side).value = 0
    const file = pickJsonFile(fileList)
    if (file) readFile(side, file)
  }

  async function pasteAsFullSide(side: MergeSide) {
    try {
      const text = await navigator.clipboard.readText()
      sideError(side).value = ''
      importText(side, text)
    } catch {
      sideError(side).value = '无法读取剪贴板，请检查浏览器权限'
    }
  }

  function clearSide(side: MergeSide) {
    workspace.clearSide(side)
    sideError(side).value = ''
  }

  return {
    leftDragDepth,
    rightDragDepth,
    leftError,
    rightError,
    onFileSelected,
    enterDrag,
    leaveDrag,
    dropFiles,
    importText,
    pasteAsFullSide,
    formatSide,
    clearSide,
    isClearDisabled,
    isFormatDisabled,
    sideFileName,
  }
}
