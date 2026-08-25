import { pickJsonFile } from '@/composables/pickJsonFile'
import { formatJsonDocument } from '@/composables/useJsonDocument'
import { useMergeWorkspace, type MergeSide } from '@/stores/mergeWorkspace'

/** 双侧文件导入 / 粘贴全文 / 格式化 / 清空；错误与拖拽态留给宿主画。 */
export function useMergeSideImport() {
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
      workspace.importSide(side, reader.result, file.name)
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
      workspace.importSide(side, text)
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
    pasteAsFullSide,
    formatSide,
    clearSide,
    isClearDisabled,
    isFormatDisabled,
    sideFileName,
  }
}
