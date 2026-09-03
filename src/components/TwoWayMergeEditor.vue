<script setup lang="ts" name="TwoWayMergeEditor">
import { MergeView } from '@codemirror/merge'
import {
  SearchQuery,
  findNext,
  findPrevious,
  replaceAll,
  replaceNext,
  selectMatches,
  setSearchQuery,
} from '@codemirror/search'
import { EditorView } from '@codemirror/view'
import { Compartment, Prec } from '@codemirror/state'
import ChunkJumpList from '@/components/ChunkJumpList.vue'
import DiffMinimap from '@/components/DiffMinimap.vue'
import MergePaneEmptyState from '@/components/MergePaneEmptyState.vue'
import MergeSearchDock from '@/components/MergeSearchDock.vue'
import UiTooltip from '@/components/UiTooltip.vue'
import {
  countChunkKinds,
  kindOfChunk,
  revertControlDefaultHint,
  revertControlHint,
  type ChunkKind,
  type ChunkKindCounts,
} from '@/composables/chunkKind'
import { chunkJumpPreview } from '@/composables/chunkJumpPreview'
import {
  createMinimapDragSession,
  mergeScrollHeight,
  splitMinimapBandsByKind,
  viewportBandOf,
  type ChunkBand,
} from '@/composables/chunkMinimapLayout'
import { activeChunkIndexInViewport, chunkNavTargetIndex } from '@/composables/chunkNavAnchor'
import {
  diffConfigItems,
  directoryFieldSummaryText,
  type ConfigItemGroup,
} from '@/composables/configItemDiff'
import { foldDirectoryGroups, type DirectoryTreeNode } from '@/composables/directoryPathTree'
import { jsonPathOffset, type JsonPathSeg } from '@/composables/jsonPathOffset'
import { buildJumpLineNumberMaps } from '@/composables/jumpLineNumbers'
import { nearestChunkIndexByOffset } from '@/composables/nearestChunkIndexByOffset'
import {
  createEditableJsonExtensions,
  createLiteVariableExtensions,
  mergeHighlightTheme,
} from '@/composables/codemirrorTheme'
import { mergeViewDiffConfig, takeLastDiffCoarse } from '@/composables/diffByLine'
import {
  DIRECTORY_TREE_ENABLED,
  directoryDrawerMeasureFallbackMs,
  directoryDrawerWidth,
  isDirectoryWidthTransitionEnd,
} from '@/composables/directoryDrawer'
import { pointerLeftMergeFrame } from '@/composables/pointerLeftMergeFrame'
import {
  SAMPLE_REFERENCE_FILE_NAME,
  SAMPLE_REFERENCE_JSON,
  SAMPLE_TARGET_FILE_NAME,
  SAMPLE_TARGET_JSON,
  isSampleFillAvailable,
} from '@/composables/sampleMergeDocs'
import { sideFromClientX } from '@/composables/sideFromClientX'
import { MERGE_COLLAPSE_UNCHANGED } from '@/composables/mergeCollapseUnchanged'
import { createHorizontalScrollSync } from '@/composables/syncEditorScrollLeft'
import {
  createEditorDocSync,
  DOC_SYNC_IDLE_MS,
  editorDocNeedsReplace,
} from '@/composables/editorDocSync'
import {
  CHROME_LAYOUT_DEBOUNCE_MS,
  COARSE_DIFF_NOTICE,
  isLargeDoc,
  shouldEmitCoarseNotice,
  SKIP_IMPORT_FORMAT_NOTICE,
} from '@/composables/largeDocPolicy'
import type { StatusMessageTone } from '@/composables/statusMessage'
import { useMergeSideImport } from '@/composables/useMergeSideImport'
import { useMergeWorkspace, type MergeSide } from '@/stores/mergeWorkspace'

const workspace = useMergeWorkspace()
type ChunkFieldSummary = { available: boolean; fields: number; items: number }
const emptyFieldSummary: ChunkFieldSummary = { available: false, fields: 0, items: 0 }
const emit = defineEmits<{
  chunks: [count: number, current: number, kinds: ChunkKindCounts, fieldSummary: ChunkFieldSummary]
  notice: [payload: { text: string; tone: StatusMessageTone }]
}>()
/** 推开式目录；默认展开，不写 localStorage；开关在页眉。 */
const directoryOpen = defineModel<boolean>('directoryOpen', { default: true })
/** 折叠未改行；默认关，不写 localStorage；开关在页眉。 */
const collapseUnchanged = defineModel<boolean>('collapseUnchanged', { default: false })
const {
  leftDragDepth,
  rightDragDepth,
  leftError,
  rightError,
  onFileSelected,
  dropFiles,
  pasteAsFullSide,
  formatSide: formatStoreSide,
  clearSide,
  isClearDisabled,
  isFormatDisabled,
} = useMergeSideImport({
  onNotice: (notice) => {
    if (notice.text === SKIP_IMPORT_FORMAT_NOTICE) {
      skipFormatNoticeThisImport = true
    }
    emit('notice', notice)
  },
})

const docSync = createEditorDocSync({
  idleMs: DOC_SYNC_IDLE_MS,
  readStore: (side) => (side === 'left' ? workspace.leftDoc : workspace.rightDoc),
  writeStore: (side, text) => {
    if (side === 'left') workspace.setLeftDoc(text)
    else workspace.setRightDoc(text)
  },
})

function flushDocs() {
  docSync.flush()
}

/** 先 flush 再读右栏，供复制 / 导出取最新文本。 */
function getRightDoc() {
  flushDocs()
  return workspace.rightDoc
}

/** 栏头格式化读 store，须先把编辑器 pending 回写。 */
function formatSide(side: MergeSide) {
  flushDocs()
  formatStoreSide(side)
}

const hostRef = ref<HTMLElement | null>(null)
const leftFileInput = ref<HTMLInputElement | null>(null)
const rightFileInput = ref<HTMLInputElement | null>(null)
const searchDockRef = ref<{ focusFind: () => void } | null>(null)
const searchOpen = ref(false)
const searchFind = ref('')
const searchReplace = ref('')
const searchCase = ref(false)
const searchRegexp = ref(false)
const searchWord = ref(false)
const searchSide = ref<MergeSide>('right')
const leftBands = ref<ChunkBand[]>([])
const rightBands = ref<ChunkBand[]>([])
const viewportBand = ref<ChunkBand>({ start: 0, end: 1 })
let mergeView: MergeView | null = null
const leftLiteCompartment = new Compartment()
const rightLiteCompartment = new Compartment()
let leftLite = false
let rightLite = false
/** 同一过粗状态只提示一次 */
let coarseNoticeShown = false
/** 本轮导入刚提示过跳过格式化，随后 layout 的过粗提示让路 */
let skipFormatNoticeThisImport = false
/** 差异块像素带；只在文档/块数/尺寸变化时重测，滚动只做重叠判断。 */
let cachedChunkBands: { start: number; end: number }[] = []
const minimapDrag = createMinimapDragSession()
let minimapDragging = false
/** 上次已通知的差异块数量与当前下标；-1 保证挂载后必 emit 一次 */
let lastChunkCount = -1
let lastChunkCurrent = -1
/** 块类型构成；只在 shouldLayout 时重算，滚动沿用缓存 */
let lastChunkKinds: ChunkKindCounts = { added: 0, removed: 0, modified: 0 }
/** 字段/配置项摘要；只在 shouldLayout 时随分组更新，滚动沿用缓存 */
let lastFieldSummary: ChunkFieldSummary = emptyFieldSummary
/** 目录条目与 bands / kinds 同拍；滚动不带动目录列表。 */
const jumpItems = ref<{ kind: ChunkKind; preview: string; index: number }[]>([])
const chunkCurrent = ref(0)
/** 配置项分组；非法 JSON 或无组时为空，目录走扁平回退 */
const configItemGroups = ref<ConfigItemGroup[]>([])
const userExpandedIds = ref<Set<string>>(new Set())
/** 组路径文档偏移（含 kind 以便滚动时选 fromA/fromB）；只在 layout 时算 */
let cachedGroupOffsets: { id: string; offset: number; kind: ConfigItemGroup['kind'] }[] = []
const fieldSummaryText = ref('')
const expandedIds = computed(() => [...userExpandedIds.value])

const leftEmpty = computed(() => workspace.leftDoc.length === 0)
const rightEmpty = computed(() => workspace.rightDoc.length === 0)
const showMinimap = computed(() => !leftEmpty.value || !rightEmpty.value)

/** 只提供 a-to-b；← 暂时下线，控件必须是 button 以便库设置 top */
function renderRevertControl() {
  const toRight = document.createElement('button')
  toRight.type = 'button'
  toRight.textContent = '→'
  toRight.setAttribute('aria-label', revertControlDefaultHint)
  toRight.title = revertControlDefaultHint
  return toRight
}

/** 按 DOM 顺序把 revert 按钮与差异块对齐；数量不一致时只对齐较短一侧。 */
function alignRevertControlMeta() {
  if (!mergeView) return
  const buttons = mergeView.dom.querySelectorAll<HTMLButtonElement>('.cm-merge-revert button')
  const { chunks } = mergeView
  const aligned = Math.min(buttons.length, chunks.length)
  for (let index = 0; index < aligned; index += 1) {
    const button = buttons[index]
    const chunk = chunks[index]
    if (!button || !chunk) continue
    const kind = kindOfChunk(chunk)
    const hint = revertControlHint(kind)
    button.dataset.chunkKind = kind
    button.dataset.chunkIndex = String(index)
    button.setAttribute('aria-label', hint)
    button.title = hint
  }
}

/** 按页眉 current（1 起）切换 revert 当前态；只用已有 data-chunk-index。 */
function syncRevertCurrentState(current: number) {
  if (!mergeView) return
  const currentKey = current > 0 ? String(current - 1) : null
  const buttons = mergeView.dom.querySelectorAll<HTMLButtonElement>('.cm-merge-revert button')
  for (const button of buttons) {
    const isCurrent = currentKey !== null && button.dataset.chunkIndex === currentKey
    button.classList.toggle('is-current', isCurrent)
    if (isCurrent) {
      button.setAttribute('aria-current', 'true')
    } else {
      button.removeAttribute('aria-current')
    }
  }
}

/** 滚动根与左右编辑器内容高取较大值，色带与滑块共用。 */
function mergeScrollerMetrics(): { clientHeight: number; scrollHeight: number } | null {
  if (!mergeView) return null
  const scroller = mergeView.dom
  return {
    clientHeight: scroller.clientHeight,
    scrollHeight: mergeScrollHeight(
      scroller.scrollHeight,
      Math.max(mergeView.a.contentHeight, mergeView.b.contentHeight),
    ),
  }
}

/** 页眉锚点与视口带随滚动更新；分组、色带与块像素带只在文档或块数量变化时重建。 */
function syncEditorChrome(rebuildLayout: boolean, remasureBands = false) {
  if (!mergeView) return
  const scroller = mergeView.dom
  const metrics = mergeScrollerMetrics()
  const count = mergeView.chunks.length
  const shouldLayout = rebuildLayout || count !== lastChunkCount
  if (shouldLayout) {
    refreshChunkBands()
    refreshMinimapSnapshot()
    lastChunkKinds = countChunkKinds(mergeView.chunks)
    alignRevertControlMeta()
    if (DIRECTORY_TREE_ENABLED) {
      refreshJumpItems()
      refreshConfigItemGroups()
    }
  } else if (remasureBands) {
    refreshChunkBands()
    refreshMinimapSnapshot()
  }
  const index = activeChunkIndexInViewport(
    cachedChunkBands,
    scroller.scrollTop,
    scroller.scrollTop + scroller.clientHeight,
  )
  const current = count === 0 || index < 0 ? 0 : index + 1
  chunkCurrent.value = current
  if (shouldLayout || current !== lastChunkCurrent) {
    lastChunkCount = count
    lastChunkCurrent = current
    emit('chunks', count, current, lastChunkKinds, lastFieldSummary)
  }
  if (shouldLayout) {
    emitCoarseNoticeIfNeeded()
  }
  syncRevertCurrentState(current)
  if (metrics === null) return
  const nextViewport = viewportBandOf(
    scroller.scrollTop,
    metrics.clientHeight,
    metrics.scrollHeight,
  )
  if (
    nextViewport.start !== viewportBand.value.start ||
    nextViewport.end !== viewportBand.value.end
  ) {
    viewportBand.value = nextViewport
  }
}

function emitCoarseNoticeIfNeeded() {
  const coarse = takeLastDiffCoarse()
  const skipFormatJustShown = skipFormatNoticeThisImport
  if (skipFormatJustShown) skipFormatNoticeThisImport = false
  if (
    shouldEmitCoarseNotice({
      coarse,
      alreadyShown: coarseNoticeShown,
      skipFormatJustShown,
    })
  ) {
    coarseNoticeShown = true
    emit('notice', { text: COARSE_DIFF_NOTICE, tone: 'warning' })
  } else if (!coarse) {
    coarseNoticeShown = false
  } else {
    coarseNoticeShown = true
  }
}

function syncSideLite(side: MergeSide, text: string) {
  if (!mergeView) return
  const nextLite = isLargeDoc(text)
  if (side === 'left') {
    if (nextLite === leftLite) return
    leftLite = nextLite
    mergeView.a.dispatch({
      effects: leftLiteCompartment.reconfigure(createLiteVariableExtensions(nextLite)),
    })
    return
  }
  if (nextLite === rightLite) return
  rightLite = nextLite
  mergeView.b.dispatch({
    effects: rightLiteCompartment.reconfigure(createLiteVariableExtensions(nextLite)),
  })
}

/** store 回写到编辑器：替换与 lite 热切尽量同一 dispatch，避免大文档先吃 json/foldGutter。 */
function applyStoreDoc(side: MergeSide, next: string) {
  if (!mergeView) return
  const view = side === 'left' ? mergeView.a : mergeView.b
  const doc = view.state.doc
  if (!editorDocNeedsReplace(doc, next)) {
    syncSideLite(side, next)
    return
  }
  const nextLite = isLargeDoc(next)
  const currentLite = side === 'left' ? leftLite : rightLite
  const compartment = side === 'left' ? leftLiteCompartment : rightLiteCompartment
  if (nextLite !== currentLite) {
    if (side === 'left') leftLite = nextLite
    else rightLite = nextLite
    view.dispatch({
      changes: { from: 0, to: doc.length, insert: next },
      effects: compartment.reconfigure(createLiteVariableExtensions(nextLite)),
    })
    return
  }
  view.dispatch({
    changes: { from: 0, to: doc.length, insert: next },
  })
}

function onMergeScroll() {
  if (minimapDragging) return
  syncEditorChrome(false)
}

const onWindowResize = useDebounceFn(() => {
  refreshChunkBands()
  refreshMinimapSnapshot()
  syncEditorChrome(false)
}, 100)

/** 左右 View 补测后再读 lineBlockAt / 设 scrollTop；拖动中不要走这条。 */
function afterEditorMeasure(run: () => void) {
  if (!mergeView) return
  mergeView.a.requestMeasure()
  mergeView.b.requestMeasure()
  requestAnimationFrame(run)
}

function refreshChunkBands() {
  if (!mergeView) {
    cachedChunkBands = []
    return
  }
  const view = mergeView.b
  const docLength = view.state.doc.length
  cachedChunkBands = mergeView.chunks.map((chunk) => {
    const from = Math.min(chunk.fromB, docLength)
    const toPos = Math.min(Math.max(from, chunk.toB - 1), docLength)
    const startBlock = view.lineBlockAt(from)
    const endBlock = view.lineBlockAt(toPos)
    return { start: startBlock.top, end: Math.max(endBlock.bottom, startBlock.top) }
  })
}

/** 目录预览只在 layout 时读左右 doc 各一次；滚动禁止重跑。 */
function refreshJumpItems() {
  if (!mergeView) {
    jumpItems.value = []
    return
  }
  const sourceA = mergeView.a.state.doc.toString()
  const sourceB = mergeView.b.state.doc.toString()
  jumpItems.value = mergeView.chunks.map((chunk, index) => {
    const kind = kindOfChunk(chunk)
    const preview =
      kind === 'removed'
        ? chunkJumpPreview(sourceA, chunk.fromA, chunk.toA)
        : chunkJumpPreview(sourceB, chunk.fromB, chunk.toB)
    return { kind, preview, index }
  })
}

/** 用缓存块像素带与 Merge scrollHeight 分列；resize 可重测，滚动禁止重算。 */
function refreshMinimapSnapshot() {
  if (!mergeView) {
    leftBands.value = []
    rightBands.value = []
    return
  }
  const { chunks } = mergeView
  if (cachedChunkBands.length !== chunks.length) refreshChunkBands()
  const split = splitMinimapBandsByKind(
    chunks.map((chunk, index) => {
      const band = cachedChunkBands[index]
      return {
        kind: kindOfChunk(chunk),
        start: band === undefined ? 0 : band.start,
        end: band === undefined ? 0 : band.end,
      }
    }),
    mergeScrollerMetrics()?.scrollHeight ?? mergeView.dom.scrollHeight,
  )
  leftBands.value = split.leftBands
  rightBands.value = split.rightBands
}

function jsonPathEquals(left: readonly JsonPathSeg[], right: readonly JsonPathSeg[]): boolean {
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]
    const b = right[index]
    if (a === undefined || b === undefined || a.type !== b.type) return false
    if (a.type === 'key' && b.type === 'key' && a.key !== b.key) return false
    if (a.type === 'index' && b.type === 'index' && a.index !== b.index) return false
  }
  return true
}

/** 组路径偏移：删除用 A，其余用 B；空 path 为 0；失败再试首字段。 */
function offsetOfGroup(group: ConfigItemGroup, leftDoc: string, rightDoc: string): number | null {
  const source = group.kind === 'removed' ? leftDoc : rightDoc
  if (group.path.length === 0) return 0
  const fromPath = jsonPathOffset(source, group.path)
  if (fromPath !== null) return fromPath
  const firstField = group.fields[0]
  if (firstField === undefined) return null
  return jsonPathOffset(source, firstField.path)
}

/** 目录树默认可展开的节点（父级 + 叶子），不跟编辑器滚动。 */
function expandableDirectoryIds(groups: readonly ConfigItemGroup[]): string[] {
  const ids: string[] = []
  const walk = (nodes: DirectoryTreeNode[]) => {
    for (const node of nodes) {
      ids.push(node.id)
      walk(node.children)
    }
  }
  walk(foldDirectoryGroups(groups))
  return ids
}

/** 配置项分组、组偏移与行号只在 layout 时算；偏移与行号共用一次路径扫描。滚动禁止 jsonPathOffset。 */
function refreshConfigItemGroups() {
  if (!mergeView) {
    userExpandedIds.value = new Set()
    configItemGroups.value = []
    cachedGroupOffsets = []
    lastFieldSummary = emptyFieldSummary
    fieldSummaryText.value = ''
    return
  }
  const leftDoc = mergeView.a.state.doc.toString()
  const rightDoc = mergeView.b.state.doc.toString()
  const result = diffConfigItems(leftDoc, rightDoc)
  lastFieldSummary = result.available
    ? { available: true, fields: result.fields, items: result.items }
    : emptyFieldSummary
  configItemGroups.value = result.available && result.groups.length > 0 ? result.groups : []
  userExpandedIds.value = new Set(expandableDirectoryIds(configItemGroups.value))
  const maps = buildJumpLineNumberMaps({
    groups: configItemGroups.value,
    leftDoc,
    rightDoc,
  })
  cachedGroupOffsets = maps.groupOffsets
  fieldSummaryText.value =
    lastFieldSummary.available && lastFieldSummary.fields > 0
      ? directoryFieldSummaryText(lastFieldSummary.fields, lastFieldSummary.items)
      : ''
}

function onMinimapJump(ratio: number) {
  if (!mergeView) return
  const live = mergeScrollerMetrics()
  if (live === null) return
  minimapDragging = true
  const scroller = mergeView.dom
  const maxTop = Math.max(0, live.scrollHeight - live.clientHeight)
  scroller.scrollTop = Math.min(minimapDrag.scrollTopForRatio(ratio, live), maxTop)
  viewportBand.value = minimapDrag.viewportForRatio(ratio, live)
  const count = mergeView.chunks.length
  const index = activeChunkIndexInViewport(
    cachedChunkBands,
    scroller.scrollTop,
    scroller.scrollTop + scroller.clientHeight,
  )
  const current = count === 0 || index < 0 ? 0 : index + 1
  chunkCurrent.value = current
  if (current !== lastChunkCurrent) {
    lastChunkCount = count
    lastChunkCurrent = current
    emit('chunks', count, current, lastChunkKinds, lastFieldSummary)
  }
  syncRevertCurrentState(current)
}

function resyncChromeAfterMeasure() {
  afterEditorMeasure(() => {
    refreshChunkBands()
    refreshMinimapSnapshot()
    syncEditorChrome(false)
  })
}

function onMinimapDragEnd() {
  minimapDragging = false
  minimapDrag.end()
  resyncChromeAfterMeasure()
}

function onDirectoryTransitionEnd(event: TransitionEvent) {
  if (!isDirectoryWidthTransitionEnd(event)) return
  directoryMeasureEpoch += 1
  cancelDirectoryMeasureTimer()
  resyncChromeAfterMeasure()
}

let directoryMeasureTimer: ReturnType<typeof setTimeout> | undefined
let directoryMeasureEpoch = 0

function cancelDirectoryMeasureTimer() {
  if (directoryMeasureTimer === undefined) return
  clearTimeout(directoryMeasureTimer)
  directoryMeasureTimer = undefined
}

/** 列宽落地后补测编辑器宽度；transitionend 不可靠时按时长兜底。 */
function scheduleDirectoryEditorMeasure() {
  cancelDirectoryMeasureTimer()
  const epoch = ++directoryMeasureEpoch
  const delay = directoryDrawerMeasureFallbackMs(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  if (delay === 0) {
    void nextTick(() => {
      requestAnimationFrame(() => {
        if (epoch !== directoryMeasureEpoch) return
        resyncChromeAfterMeasure()
      })
    })
    return
  }
  directoryMeasureTimer = setTimeout(() => {
    directoryMeasureTimer = undefined
    resyncChromeAfterMeasure()
  }, delay)
}

watch(directoryOpen, scheduleDirectoryEditorMeasure)

/** 文档变化后的 layout 防抖；折叠 / 补测 / resize 仍立即重测。 */
const scheduleChromeLayout = useDebounceFn(() => {
  syncEditorChrome(true)
}, CHROME_LAYOUT_DEBOUNCE_MS)

/** 键入 / → / Undo：只记下文档引用，idle 到期才 toString 回写 store */
function createSideListener(side: 'left' | 'right') {
  return EditorView.updateListener.of((update) => {
    if (update.view.hasFocus) searchSide.value = side
    if (update.docChanged) {
      docSync.onEditorDoc(side, update.state.doc)
    }
    if (minimapDragging) return
    if (update.docChanged) {
      scheduleChromeLayout()
      return
    }
    syncEditorChrome(false, update.heightChanged)
  })
}

function searchView(): EditorView | null {
  if (!mergeView) return null
  return searchSide.value === 'left' ? mergeView.a : mergeView.b
}

function applySearchQuery() {
  const view = searchView()
  if (!view) return
  view.dispatch({
    effects: setSearchQuery.of(
      new SearchQuery({
        search: searchFind.value,
        replace: searchReplace.value,
        caseSensitive: searchCase.value,
        regexp: searchRegexp.value,
        wholeWord: searchWord.value,
      }),
    ),
  })
}

function runSearch(command: (view: EditorView) => boolean) {
  applySearchQuery()
  const view = searchView()
  if (view) command(view)
}

function openSearch(): boolean {
  searchOpen.value = true
  void nextTick(() => searchDockRef.value?.focusFind())
  return true
}

function closeSearch() {
  searchOpen.value = false
}

function goToNextChunk() {
  goToChunkFromAnchor(1)
}

function goToPrevChunk() {
  goToChunkFromAnchor(-1)
}

/** 点击路径允许单次 lineBlockAt：滚到文档偏移并选中对应侧。 */
function goToDocOffset(side: MergeSide, offset: number) {
  afterEditorMeasure(() => {
    if (!mergeView) return
    const view = side === 'left' ? mergeView.a : mergeView.b
    const scroller = mergeView.dom
    const clamped = Math.max(0, Math.min(offset, view.state.doc.length))
    const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    scroller.scrollTop = Math.min(view.lineBlockAt(clamped).top, maxTop)
    view.dispatch({
      selection: { anchor: clamped },
      userEvent: 'select.byPath',
      scrollIntoView: false,
    })
  })
}

function jumpNearestChunk(offset: number | null, removed: boolean) {
  if (!mergeView) return
  const index = nearestChunkIndexByOffset({
    offset,
    chunks: mergeView.chunks,
    side: removed ? 'a' : 'b',
  })
  if (index >= 0) goToChunkAt(index)
}

function onJumpGroup(id: string) {
  if (!mergeView) return
  const cached = cachedGroupOffsets.find((entry) => entry.id === id)
  if (cached !== undefined) {
    const side: MergeSide = cached.kind === 'removed' ? 'left' : 'right'
    goToDocOffset(side, cached.offset)
    return
  }
  const group = configItemGroups.value.find((item) => item.id === id)
  if (group === undefined) return
  const leftDoc = mergeView.a.state.doc.toString()
  const rightDoc = mergeView.b.state.doc.toString()
  jumpNearestChunk(offsetOfGroup(group, leftDoc, rightDoc), group.kind === 'removed')
}

function onJumpField(path: JsonPathSeg[]) {
  if (!mergeView) return
  let group: ConfigItemGroup | undefined
  let fieldKind: ConfigItemGroup['kind'] | null = null
  for (const item of configItemGroups.value) {
    const field = item.fields.find((entry) => jsonPathEquals(entry.path, path))
    if (field === undefined) continue
    group = item
    fieldKind = field.kind
    break
  }
  const side: MergeSide = fieldKind === 'removed' ? 'left' : 'right'
  const source =
    side === 'left' ? mergeView.a.state.doc.toString() : mergeView.b.state.doc.toString()
  const offset = jsonPathOffset(source, path)
  if (offset !== null) {
    goToDocOffset(side, offset)
    return
  }
  if (group === undefined) return
  const leftDoc = mergeView.a.state.doc.toString()
  const rightDoc = mergeView.b.state.doc.toString()
  jumpNearestChunk(offsetOfGroup(group, leftDoc, rightDoc), group.kind === 'removed')
}

function onToggleGroup(id: string) {
  const next = new Set(userExpandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  userExpandedIds.value = next
}

/** 滚到缓存块顶并选中 B 的 fromB；与「下一个差异」共用 bands。 */
function goToChunkAt(index: number) {
  afterEditorMeasure(() => {
    if (!mergeView) return
    const { chunks } = mergeView
    const count = chunks.length
    if (count === 0 || index < 0 || index >= count) return
    refreshChunkBands()
    const chunk = chunks[index]
    const band = cachedChunkBands[index]
    if (!chunk || !band) return
    const scroller = mergeView.dom
    const from = Math.min(chunk.fromB, mergeView.b.state.doc.length)
    const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    scroller.scrollTop = Math.min(band.start, maxTop)
    mergeView.b.dispatch({
      selection: { anchor: from },
      userEvent: 'select.byChunk',
      scrollIntoView: false,
    })
  })
}

/** 以上一条/下一条相对当前视口锚点跳转，滚到目标块顶并选中。 */
function goToChunkFromAnchor(step: 1 | -1) {
  if (!mergeView) return
  const count = mergeView.chunks.length
  if (count === 0) return
  const scroller = mergeView.dom
  if (cachedChunkBands.length !== count) refreshChunkBands()
  goToChunkAt(
    chunkNavTargetIndex(cachedChunkBands, scroller.scrollTop, scroller.clientHeight, step),
  )
}

function openFilePicker(side: MergeSide) {
  const input = side === 'left' ? leftFileInput.value : rightFileInput.value
  input?.click()
}

function fillSampleDocs() {
  if (!isSampleFillAvailable(workspace.leftDoc, workspace.rightDoc)) return
  workspace.importSide('left', SAMPLE_REFERENCE_JSON, SAMPLE_REFERENCE_FILE_NAME)
  workspace.importSide('right', SAMPLE_TARGET_JSON, SAMPLE_TARGET_FILE_NAME)
}

function sideFromPointer(clientX: number): MergeSide | null {
  if (!mergeView) return null
  return sideFromClientX(
    clientX,
    mergeView.a.dom.getBoundingClientRect(),
    mergeView.b.dom.getBoundingClientRect(),
  )
}

function highlightDropSide(side: MergeSide | null) {
  leftDragDepth.value = side === 'left' ? 1 : 0
  rightDragDepth.value = side === 'right' ? 1 : 0
}

function onHostDragEnter(event: DragEvent) {
  event.preventDefault()
  highlightDropSide(sideFromPointer(event.clientX))
}

function onHostDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  highlightDropSide(sideFromPointer(event.clientX))
}

function onHostDragLeave(event: DragEvent) {
  event.preventDefault()
  const frame = hostRef.value?.parentElement
  if (!frame || !pointerLeftMergeFrame(frame, event)) return
  highlightDropSide(null)
}

/** 文件放下由宿主 importSide 整栏替换；拦截后 CM 不再按光标插入。 */
const swallowEditorFileDrop = Prec.highest(
  EditorView.domEventHandlers({
    drop(event) {
      return (event.dataTransfer?.files?.length ?? 0) > 0
    },
  }),
)

function onHostDrop(event: DragEvent) {
  event.preventDefault()
  const side = sideFromPointer(event.clientX)
  highlightDropSide(null)
  if (side) dropFiles(side, event.dataTransfer?.files)
}

defineExpose({ goToPrevChunk, goToNextChunk, openSearch, flushDocs, getRightDoc })

const hScrollSync = createHorizontalScrollSync()

function onLeftHScroll() {
  if (!mergeView) return
  hScrollSync.onScroll(mergeView.a.scrollDOM, mergeView.b.scrollDOM)
}

function onRightHScroll() {
  if (!mergeView) return
  hScrollSync.onScroll(mergeView.b.scrollDOM, mergeView.a.scrollDOM)
}

/** 把页眉「仅显示差异」同步到 MergeView；构造时也要带上，避免 watch 早于 mergeView 时丢一次。 */
function applyCollapseUnchanged(enabled: boolean) {
  if (!mergeView) return
  mergeView.reconfigure({
    collapseUnchanged: enabled ? MERGE_COLLAPSE_UNCHANGED : undefined,
  })
  afterEditorMeasure(() => syncEditorChrome(false, true))
}

onMounted(() => {
  const hostEl = hostRef.value
  if (!hostEl) return

  // 仅挂载时创建；导入只 dispatch 变化侧，禁止 destroy 重建
  leftLite = isLargeDoc(workspace.leftDoc)
  rightLite = isLargeDoc(workspace.rightDoc)
  mergeView = new MergeView({
    parent: hostEl,
    a: {
      doc: workspace.leftDoc,
      extensions: [
        ...createEditableJsonExtensions([mergeHighlightTheme], openSearch, true),
        leftLiteCompartment.of(createLiteVariableExtensions(leftLite)),
        createSideListener('left'),
        swallowEditorFileDrop,
      ],
    },
    b: {
      doc: workspace.rightDoc,
      extensions: [
        ...createEditableJsonExtensions([mergeHighlightTheme], openSearch, true),
        rightLiteCompartment.of(createLiteVariableExtensions(rightLite)),
        createSideListener('right'),
        swallowEditorFileDrop,
      ],
    },
    revertControls: 'a-to-b',
    renderRevertControl,
    highlightChanges: true,
    gutter: true,
    diffConfig: mergeViewDiffConfig,
    // 大文件自动开折叠可能已先把 model 设为 true；构造时必须读当前值
    collapseUnchanged: collapseUnchanged.value ? MERGE_COLLAPSE_UNCHANGED : undefined,
  })
  // 构造期间若 model 已变、或 watch 曾因 mergeView 未就绪而跳过，再对齐一次
  applyCollapseUnchanged(collapseUnchanged.value)
  syncEditorChrome(true)
  mergeView.dom.addEventListener('scroll', onMergeScroll, { passive: true })
  mergeView.a.scrollDOM.addEventListener('scroll', onLeftHScroll, { passive: true })
  mergeView.b.scrollDOM.addEventListener('scroll', onRightHScroll, { passive: true })
  window.addEventListener('resize', onWindowResize)
})

watch(collapseUnchanged, (enabled) => {
  applyCollapseUnchanged(enabled)
})

/** store 因导入/清空变化时，只替换该侧文档，保留另一侧 Undo 历史 */
watch(
  () => workspace.leftDoc,
  (next) => {
    applyStoreDoc('left', next)
  },
)

watch(
  () => workspace.rightDoc,
  (next) => {
    applyStoreDoc('right', next)
  },
)

onBeforeUnmount(() => {
  directoryMeasureEpoch += 1
  cancelDirectoryMeasureTimer()
  minimapDragging = false
  minimapDrag.end()
  mergeView?.dom.removeEventListener('scroll', onMergeScroll)
  mergeView?.a.scrollDOM.removeEventListener('scroll', onLeftHScroll)
  mergeView?.b.scrollDOM.removeEventListener('scroll', onRightHScroll)
  window.removeEventListener('resize', onWindowResize)
  mergeView?.destroy()
  mergeView = null
})
</script>

<template>
  <div class="two-way-merge-editor">
    <div class="two-way-merge-stage">
      <div class="two-way-merge-main">
        <div class="two-way-merge-labels">
          <div class="two-way-merge-labels__side">
            <span class="ui-label-test">参考配置</span>
            <div class="two-way-merge-file-slot">
              <UiTooltip :text="workspace.leftFileName || '导入 JSON 文件'">
                <button
                  type="button"
                  class="two-way-merge-file"
                  aria-label="导入参考配置"
                  @click="openFilePicker('left')"
                >
                  {{ workspace.leftFileName || '未导入' }}
                </button>
              </UiTooltip>
            </div>
            <div class="two-way-merge-labels__actions">
              <UiTooltip text="导入">
                <button
                  type="button"
                  class="ui-btn ui-btn-icon"
                  aria-label="导入参考配置"
                  @click="openFilePicker('left')"
                >
                  <span class="i-lucide-file-up" aria-hidden="true" />
                </button>
              </UiTooltip>
              <UiTooltip text="粘贴全文">
                <button
                  type="button"
                  class="ui-btn ui-btn-icon"
                  aria-label="粘贴为参考配置全文"
                  @click="pasteAsFullSide('left')"
                >
                  <span class="i-lucide-clipboard" aria-hidden="true" />
                </button>
              </UiTooltip>
              <UiTooltip text="格式化">
                <button
                  type="button"
                  class="ui-btn ui-btn-icon"
                  aria-label="格式化参考配置"
                  :disabled="isFormatDisabled('left')"
                  @click="formatSide('left')"
                >
                  <span class="i-lucide-align-left" aria-hidden="true" />
                </button>
              </UiTooltip>
              <UiTooltip text="清空">
                <button
                  type="button"
                  class="ui-btn ui-btn-icon ui-btn-danger"
                  aria-label="清空参考配置"
                  :disabled="isClearDisabled('left')"
                  @click="clearSide('left')"
                >
                  <span class="i-lucide-trash-2" aria-hidden="true" />
                </button>
              </UiTooltip>
            </div>
            <input
              ref="leftFileInput"
              type="file"
              accept=".json,application/json,text/plain"
              class="hidden"
              @change="onFileSelected('left', $event)"
            />
          </div>
          <div class="two-way-merge-labels__revert">
            <span class="i-lucide-move-right" aria-hidden="true" />
          </div>
          <div class="two-way-merge-labels__side">
            <span class="ui-label-prod">目标配置</span>
            <div class="two-way-merge-file-slot">
              <UiTooltip :text="workspace.rightFileName || '导入 JSON 文件'">
                <button
                  type="button"
                  class="two-way-merge-file"
                  aria-label="导入目标配置"
                  @click="openFilePicker('right')"
                >
                  {{ workspace.rightFileName || '未导入' }}
                </button>
              </UiTooltip>
            </div>
            <div class="two-way-merge-labels__actions">
              <UiTooltip text="导入">
                <button
                  type="button"
                  class="ui-btn ui-btn-icon"
                  aria-label="导入目标配置"
                  @click="openFilePicker('right')"
                >
                  <span class="i-lucide-file-up" aria-hidden="true" />
                </button>
              </UiTooltip>
              <UiTooltip text="粘贴全文">
                <button
                  type="button"
                  class="ui-btn ui-btn-icon"
                  aria-label="粘贴为目标配置全文"
                  @click="pasteAsFullSide('right')"
                >
                  <span class="i-lucide-clipboard" aria-hidden="true" />
                </button>
              </UiTooltip>
              <UiTooltip text="格式化">
                <button
                  type="button"
                  class="ui-btn ui-btn-icon"
                  aria-label="格式化目标配置"
                  :disabled="isFormatDisabled('right')"
                  @click="formatSide('right')"
                >
                  <span class="i-lucide-align-left" aria-hidden="true" />
                </button>
              </UiTooltip>
              <UiTooltip text="清空">
                <button
                  type="button"
                  class="ui-btn ui-btn-icon ui-btn-danger"
                  aria-label="清空目标配置"
                  :disabled="isClearDisabled('right')"
                  @click="clearSide('right')"
                >
                  <span class="i-lucide-trash-2" aria-hidden="true" />
                </button>
              </UiTooltip>
            </div>
            <input
              ref="rightFileInput"
              type="file"
              accept=".json,application/json,text/plain"
              class="hidden"
              @change="onFileSelected('right', $event)"
            />
          </div>
        </div>
        <p
          v-if="leftError || rightError"
          class="two-way-merge-status ui-status-invalid"
          role="status"
        >
          <span v-if="leftError">参考配置：{{ leftError }}</span>
          <span v-if="rightError">目标配置：{{ rightError }}</span>
        </p>
        <MergeSearchDock
          v-if="searchOpen"
          ref="searchDockRef"
          v-model:find="searchFind"
          v-model:replace="searchReplace"
          v-model:case-sensitive="searchCase"
          v-model:regexp="searchRegexp"
          v-model:whole-word="searchWord"
          v-model:side="searchSide"
          class="two-way-merge-search"
          @next="runSearch(findNext)"
          @prev="runSearch(findPrevious)"
          @all="runSearch(selectMatches)"
          @replace-one="runSearch(replaceNext)"
          @replace-all="runSearch(replaceAll)"
          @close="closeSearch"
        />
        <div class="two-way-merge-body" :class="{ 'is-empty': leftEmpty && rightEmpty }">
          <div
            class="two-way-merge-frame flex-1 min-h-0"
            :class="{
              'is-dragging-left': leftDragDepth > 0,
              'is-dragging-right': rightDragDepth > 0,
            }"
            @dragenter="onHostDragEnter"
            @dragover="onHostDragOver"
            @dragleave="onHostDragLeave"
            @drop="onHostDrop"
          >
            <div ref="hostRef" class="two-way-merge-host flex-1 min-h-0" />
            <div v-if="leftEmpty" class="two-way-merge-empty two-way-merge-empty--left">
              <MergePaneEmptyState
                select-aria-label="选择参考配置文件"
                :drag-over="leftDragDepth > 0"
                :show-sample="leftEmpty && rightEmpty"
                @paste="pasteAsFullSide('left')"
                @sample="fillSampleDocs"
                @select="openFilePicker('left')"
              />
            </div>
            <div v-if="rightEmpty" class="two-way-merge-empty two-way-merge-empty--right">
              <MergePaneEmptyState
                select-aria-label="选择目标配置文件"
                :drag-over="rightDragDepth > 0"
                :show-sample="leftEmpty && rightEmpty"
                @paste="pasteAsFullSide('right')"
                @sample="fillSampleDocs"
                @select="openFilePicker('right')"
              />
            </div>
          </div>
          <DiffMinimap
            v-if="showMinimap"
            :left-bands="leftBands"
            :right-bands="rightBands"
            :viewport="viewportBand"
            @jump="onMinimapJump"
            @drag-end="onMinimapDragEnd"
          />
        </div>
      </div>
      <template v-if="DIRECTORY_TREE_ENABLED && showMinimap">
        <div
          class="two-way-merge-directory"
          :class="{ 'is-open': directoryOpen }"
          :style="{ width: directoryDrawerWidth(directoryOpen) }"
          :aria-hidden="!directoryOpen"
          :inert="!directoryOpen"
          @transitionend="onDirectoryTransitionEnd"
        >
          <ChunkJumpList
            class="two-way-merge-jump-list"
            :items="jumpItems"
            :groups="configItemGroups"
            :expanded-ids="expandedIds"
            :field-summary-text="fieldSummaryText"
            @jump="goToChunkAt"
            @jump-group="onJumpGroup"
            @jump-field="onJumpField"
            @toggle-group="onToggleGroup"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.two-way-merge-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
}

/* 与 MergeView 三列对齐：左右均分剩余宽度，中间 2.4em revert 槽 */
.two-way-merge-labels {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-bottom: 0.375rem;
  gap: 0;
}

.two-way-merge-labels__side {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1 1 0;
  min-width: 0;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.two-way-merge-file-slot {
  flex: 1 1 auto;
  min-width: 0;
}

.two-way-merge-file-slot :deep(.ui-tooltip-host),
.two-way-merge-file {
  width: 100%;
}

.two-way-merge-file {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.75rem;
  font-family: var(--mono);
  text-align: left;
  cursor: pointer;
}

.two-way-merge-file:hover {
  color: var(--text-h);
}

.two-way-merge-labels__actions {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
}

.two-way-merge-labels__revert {
  display: flex;
  flex: 0 0 2.4em;
  align-items: center;
  justify-content: center;
  width: 2.4em;
  height: 2.4em;
  color: var(--text-h);
}

.two-way-merge-labels__revert .i-lucide-move-right {
  width: 1.15em;
  height: 1.15em;
}

.two-way-merge-status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  line-height: 1.35;
}

.two-way-merge-frame {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.two-way-merge-host {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--code-bg);
}

.two-way-merge-empty {
  position: absolute;
  top: 0.1rem;
  bottom: 0.1rem;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 1.5rem 2.5rem;
  border-radius: var(--radius-md);
  background: var(--code-bg);
  pointer-events: none;
}

.two-way-merge-empty--left {
  left: 0.1rem;
  width: calc((100% - 2.4em) / 2 - 0.1rem);
}

.two-way-merge-empty--right {
  right: 0.1rem;
  width: calc((100% - 2.4em) / 2 - 0.1rem);
}

.two-way-merge-frame.is-dragging-left .two-way-merge-empty--left :deep(.merge-pane-empty__title),
.two-way-merge-frame.is-dragging-left .two-way-merge-empty--left :deep(.merge-pane-empty__sub),
.two-way-merge-frame.is-dragging-right .two-way-merge-empty--right :deep(.merge-pane-empty__title),
.two-way-merge-frame.is-dragging-right .two-way-merge-empty--right :deep(.merge-pane-empty__sub) {
  color: var(--accent);
}

.two-way-merge-stage {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  gap: 0.35rem;
}

.two-way-merge-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.two-way-merge-body {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  gap: 0.35rem;
}

.two-way-merge-body.is-empty {
  flex: 0 0 auto;
  align-self: stretch;
  width: 100%;
}

.two-way-merge-body.is-empty .two-way-merge-frame,
.two-way-merge-body.is-empty .two-way-merge-host {
  flex: 1 1 auto;
  width: 100%;
  min-height: 22rem;
}

.two-way-merge-body.is-empty .two-way-merge-host {
  background: var(--surface);
}

.two-way-merge-directory {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  align-self: stretch;
  width: 16rem;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  transition: width 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.two-way-merge-jump-list {
  flex: 1 1 auto;
  width: 16rem;
  min-width: 16rem;
  min-height: 0;
}

.two-way-merge-search {
  flex-shrink: 0;
  margin-bottom: 0.375rem;
}

:deep(.cm-search-ghost),
:deep(.cm-panels) {
  display: none !important;
}

.two-way-merge-frame.is-dragging-left :deep(.cm-merge-a),
.two-way-merge-frame.is-dragging-right :deep(.cm-merge-b) {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

:deep(.cm-mergeView) {
  width: 100%;
  height: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

:deep(.cm-mergeViewEditors) {
  display: flex;
  flex-direction: row;
  min-width: 0;
  min-height: 100%;
}

:deep(.cm-mergeViewEditor) {
  flex: 1 1 0;
  min-width: 0;
  min-height: 100%;
}

:deep(.cm-editor),
:deep(.cm-scroller) {
  min-width: 0;
  min-height: 100%;
}

:deep(.cm-scroller) {
  overflow-x: auto;
  overflow-y: hidden;
}

:deep(.cm-merge-revert) {
  position: relative;
  z-index: 1;
  flex: 0 0 2.4em;
  width: 2.4em;
  min-width: 2.4em;
  min-height: 100%;
  background: color-mix(in srgb, var(--border-subtle) 70%, var(--code-bg));
}

:deep(.cm-merge-revert button) {
  color: var(--accent);
}

:deep(.cm-merge-revert button[data-chunk-kind='added']) {
  color: var(--diff-added);
}

:deep(.cm-merge-revert button[data-chunk-kind='added']:hover) {
  color: color-mix(in srgb, var(--diff-added) 78%, white);
}

:deep(.cm-merge-revert button[data-chunk-kind='removed']) {
  color: var(--diff-removed);
}

:deep(.cm-merge-revert button[data-chunk-kind='removed']:hover) {
  color: color-mix(in srgb, var(--diff-removed) 78%, white);
}

:deep(.cm-merge-revert button[data-chunk-kind='modified']) {
  color: var(--diff-modified);
}

:deep(.cm-merge-revert button[data-chunk-kind='modified']:hover) {
  color: color-mix(in srgb, var(--diff-modified) 78%, white);
}

:deep(.cm-merge-revert button.is-current) {
  background: var(--accent-muted);
  box-shadow: inset 0 0 0 1.5px var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  .two-way-merge-directory {
    transition: none;
  }

  :deep(.cm-merge-revert button.is-current) {
    animation: none;
  }
}
</style>
