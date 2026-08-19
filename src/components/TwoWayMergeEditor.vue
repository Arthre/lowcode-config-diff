<script setup lang="ts" name="TwoWayMergeEditor">
import {
  MergeView,
  goToNextChunk as goToNextMergeChunk,
  goToPreviousChunk,
} from '@codemirror/merge'
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
import DiffMinimap from '@/components/DiffMinimap.vue'
import MergeSearchDock from '@/components/MergeSearchDock.vue'
import UiTooltip from '@/components/UiTooltip.vue'
import {
  scrollTopFromClick,
  viewportBandOf,
  type ChunkBand,
} from '@/composables/chunkMinimapLayout'
import { activeChunkIndexInViewport } from '@/composables/chunkNavAnchor'
import { changedLineFlags } from '@/composables/minimapSnapshot'
import { createEditableJsonExtensions, mergeHighlightTheme } from '@/composables/codemirrorTheme'
import { mergeViewDiffConfig } from '@/composables/diffByLine'
import { sideFromClientX } from '@/composables/sideFromClientX'
import { useMergeSideImport } from '@/composables/useMergeSideImport'
import { useMergeWorkspace, type MergeSide } from '@/stores/mergeWorkspace'

const workspace = useMergeWorkspace()
const emit = defineEmits<{ chunks: [count: number, current: number] }>()
const {
  leftDragDepth,
  rightDragDepth,
  leftError,
  rightError,
  onFileSelected,
  dropFiles,
  pasteAsFullSide,
  clearSide,
  isClearDisabled,
} = useMergeSideImport()

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
const leftChanged = ref<boolean[]>([])
const rightChanged = ref<boolean[]>([])
const viewportBand = ref<ChunkBand>({ start: 0, end: 1 })
let mergeView: MergeView | null = null
/** 上次已通知的差异块数量与当前下标；-1 保证挂载后必 emit 一次 */
let lastChunkCount = -1
let lastChunkCurrent = -1

const leftEmpty = computed(() => workspace.leftDoc.length === 0)
const rightEmpty = computed(() => workspace.rightDoc.length === 0)
const showMinimap = computed(() => !leftEmpty.value || !rightEmpty.value)

const revertToRightHint = '将此差异写入结果'

/** 只提供 a-to-b；← 暂时下线，控件必须是 button 以便库设置 top */
function renderRevertControl() {
  const toRight = document.createElement('button')
  toRight.type = 'button'
  toRight.textContent = '→'
  toRight.setAttribute('aria-label', revertToRightHint)
  toRight.title = revertToRightHint
  return toRight
}

/** 块数量或视口锚点变化时通知父组件 */
function emitChunksIfChanged() {
  if (!mergeView) return
  const count = mergeView.chunks.length
  const scroller = mergeView.dom
  const index = activeChunkIndexInViewport(
    chunkViewportBands(),
    scroller.scrollTop,
    scroller.scrollTop + scroller.clientHeight,
  )
  const current = count === 0 || index < 0 ? 0 : index + 1
  const countChanged = count !== lastChunkCount
  if (countChanged || current !== lastChunkCurrent) {
    lastChunkCount = count
    lastChunkCurrent = current
    emit('chunks', count, current)
  }
  refreshMinimap()
}

function chunkViewportBands() {
  if (!mergeView) return []
  const view = mergeView.b
  const docLength = view.state.doc.length
  return mergeView.chunks.map((chunk) => {
    const from = Math.min(chunk.fromB, docLength)
    const toPos = Math.min(Math.max(from, chunk.toB - 1), docLength)
    const startBlock = view.lineBlockAt(from)
    const endBlock = view.lineBlockAt(toPos)
    return { start: startBlock.top, end: Math.max(endBlock.bottom, startBlock.top) }
  })
}

function refreshMinimap() {
  if (!mergeView) return
  const scroller = mergeView.dom
  const leftText = mergeView.a.state.doc.toString()
  const rightText = mergeView.b.state.doc.toString()
  leftChanged.value = changedLineFlags(
    leftText,
    mergeView.chunks.map((chunk) => ({ from: chunk.fromA, to: chunk.toA })),
  )
  rightChanged.value = changedLineFlags(
    rightText,
    mergeView.chunks.map((chunk) => ({ from: chunk.fromB, to: chunk.toB })),
  )
  viewportBand.value = viewportBandOf(
    scroller.scrollTop,
    scroller.clientHeight,
    scroller.scrollHeight,
  )
}

function onMinimapJump(ratio: number) {
  if (!mergeView) return
  const scroller = mergeView.dom
  scroller.scrollTop = scrollTopFromClick(ratio, scroller.clientHeight, scroller.scrollHeight)
}

/** 键入 / → / Undo：仅字符串确有变化时回写 store，避免与 watch 形成环 */
function createSideListener(side: 'left' | 'right') {
  return EditorView.updateListener.of((update) => {
    if (update.view.hasFocus) searchSide.value = side
    if (update.docChanged) {
      const next = update.state.doc.toString()
      if (side === 'left') {
        if (next !== workspace.leftDoc) workspace.setLeftDoc(next)
      } else if (next !== workspace.rightDoc) {
        workspace.setRightDoc(next)
      }
    }
    emitChunksIfChanged()
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
  if (!mergeView) return
  goToNextMergeChunk(mergeView.b)
  requestAnimationFrame(() => emitChunksIfChanged())
}

function goToPrevChunk() {
  if (!mergeView) return
  goToPreviousChunk(mergeView.b)
  requestAnimationFrame(() => emitChunksIfChanged())
}

function openFilePicker(side: MergeSide) {
  const input = side === 'left' ? leftFileInput.value : rightFileInput.value
  input?.click()
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
  const next = event.relatedTarget
  if (next instanceof Node && frame?.contains(next)) return
  highlightDropSide(null)
}

function onHostDrop(event: DragEvent) {
  event.preventDefault()
  const side = sideFromPointer(event.clientX)
  highlightDropSide(null)
  if (side) dropFiles(side, event.dataTransfer?.files)
}

defineExpose({ goToPrevChunk, goToNextChunk, openSearch })

onMounted(() => {
  const hostEl = hostRef.value
  if (!hostEl) return

  // 仅挂载时创建；导入只 dispatch 变化侧，禁止 destroy 重建
  mergeView = new MergeView({
    parent: hostEl,
    a: {
      doc: workspace.leftDoc,
      extensions: [
        ...createEditableJsonExtensions([mergeHighlightTheme], openSearch),
        createSideListener('left'),
      ],
    },
    b: {
      doc: workspace.rightDoc,
      extensions: [
        ...createEditableJsonExtensions([mergeHighlightTheme], openSearch),
        createSideListener('right'),
      ],
    },
    revertControls: 'a-to-b',
    renderRevertControl,
    highlightChanges: true,
    gutter: true,
    diffConfig: mergeViewDiffConfig,
  })
  emitChunksIfChanged()
  mergeView.dom.addEventListener('scroll', emitChunksIfChanged, { passive: true })
  window.addEventListener('resize', emitChunksIfChanged)
})

/** store 因导入/清空变化时，只替换该侧文档，保留另一侧 Undo 历史 */
watch(
  () => workspace.leftDoc,
  (next) => {
    if (!mergeView) return
    if (mergeView.a.state.doc.toString() === next) return
    mergeView.a.dispatch({
      changes: { from: 0, to: mergeView.a.state.doc.length, insert: next },
    })
  },
)

watch(
  () => workspace.rightDoc,
  (next) => {
    if (!mergeView) return
    if (mergeView.b.state.doc.toString() === next) return
    mergeView.b.dispatch({
      changes: { from: 0, to: mergeView.b.state.doc.length, insert: next },
    })
  },
)

onBeforeUnmount(() => {
  mergeView?.dom.removeEventListener('scroll', emitChunksIfChanged)
  window.removeEventListener('resize', emitChunksIfChanged)
  mergeView?.destroy()
  mergeView = null
})
</script>

<template>
  <div class="two-way-merge-editor">
    <div class="two-way-merge-labels">
      <div class="two-way-merge-labels__side">
        <span class="ui-label-test">参考</span>
        <div class="two-way-merge-file-slot">
          <UiTooltip :text="workspace.leftFileName || '拖入或点选 JSON 文件'">
            <button
              type="button"
              class="two-way-merge-file"
              aria-label="导入参考 JSON 文件"
              @click="openFilePicker('left')"
            >
              {{ workspace.leftFileName || '拖入或点选 JSON' }}
            </button>
          </UiTooltip>
        </div>
        <div class="two-way-merge-labels__actions">
          <UiTooltip text="选择文件">
            <button
              type="button"
              class="ui-btn ui-btn-icon"
              aria-label="选择参考文件"
              @click="openFilePicker('left')"
            >
              <span class="i-lucide-upload" aria-hidden="true" />
            </button>
          </UiTooltip>
          <UiTooltip text="粘贴为该侧全文">
            <button
              type="button"
              class="ui-btn ui-btn-icon"
              aria-label="粘贴为参考全文"
              @click="pasteAsFullSide('left')"
            >
              <span class="i-lucide-clipboard" aria-hidden="true" />
            </button>
          </UiTooltip>
          <UiTooltip text="清空">
            <button
              type="button"
              class="ui-btn ui-btn-icon ui-btn-danger"
              aria-label="清空参考"
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
      <span class="two-way-merge-labels__revert" aria-hidden="true" />
      <div class="two-way-merge-labels__side">
        <span class="ui-label-prod">结果</span>
        <div class="two-way-merge-file-slot">
          <UiTooltip :text="workspace.rightFileName || '拖入或点选 JSON 文件'">
            <button
              type="button"
              class="two-way-merge-file"
              aria-label="导入结果 JSON 文件"
              @click="openFilePicker('right')"
            >
              {{ workspace.rightFileName || '拖入或点选 JSON' }}
            </button>
          </UiTooltip>
        </div>
        <div class="two-way-merge-labels__actions">
          <UiTooltip text="选择文件">
            <button
              type="button"
              class="ui-btn ui-btn-icon"
              aria-label="选择结果文件"
              @click="openFilePicker('right')"
            >
              <span class="i-lucide-upload" aria-hidden="true" />
            </button>
          </UiTooltip>
          <UiTooltip text="粘贴为该侧全文">
            <button
              type="button"
              class="ui-btn ui-btn-icon"
              aria-label="粘贴为结果全文"
              @click="pasteAsFullSide('right')"
            >
              <span class="i-lucide-clipboard" aria-hidden="true" />
            </button>
          </UiTooltip>
          <UiTooltip text="清空">
            <button
              type="button"
              class="ui-btn ui-btn-icon ui-btn-danger"
              aria-label="清空结果"
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
    <p v-if="leftError || rightError" class="two-way-merge-status ui-status-invalid" role="status">
      <span v-if="leftError">参考：{{ leftError }}</span>
      <span v-if="rightError">结果：{{ rightError }}</span>
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
    <div class="two-way-merge-stage">
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
          <div class="two-way-merge-empty__card">
            <span class="i-lucide-upload two-way-merge-empty__icon" aria-hidden="true" />
            <strong>还没有参考配置</strong>
            <p>把 JSON 拖到此栏，或用栏头上传 / 粘贴</p>
            <button type="button" class="ui-btn ui-btn-soft" @click="openFilePicker('left')">
              选择文件
            </button>
          </div>
        </div>
        <div v-if="rightEmpty" class="two-way-merge-empty two-way-merge-empty--right">
          <div class="two-way-merge-empty__card">
            <span class="i-lucide-upload two-way-merge-empty__icon" aria-hidden="true" />
            <strong>还没有结果配置</strong>
            <p>把 JSON 拖到此栏，或用栏头上传 / 粘贴</p>
            <button type="button" class="ui-btn ui-btn-soft" @click="openFilePicker('right')">
              选择文件
            </button>
          </div>
        </div>
      </div>
      <DiffMinimap
        v-if="showMinimap"
        :left-changed="leftChanged"
        :right-changed="rightChanged"
        :viewport="viewportBand"
        @jump="onMinimapJump"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.two-way-merge-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
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
  flex: 0 0 2.4em;
  width: 2.4em;
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
  min-height: 0;
}

.two-way-merge-host {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--code-bg);
}

.two-way-merge-empty {
  position: absolute;
  top: 0.55rem;
  bottom: 0.55rem;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.two-way-merge-empty--left {
  left: 0.5rem;
  width: calc((100% - 2.4em) / 2 - 0.75rem);
}

.two-way-merge-empty--right {
  right: 0.5rem;
  width: calc((100% - 2.4em) / 2 - 0.75rem);
}

.two-way-merge-empty__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  max-width: 18rem;
  padding: 1.25rem 1rem;
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--surface) 78%, transparent);
  color: var(--text);
  text-align: center;
}

.two-way-merge-empty__icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--accent);
}

.two-way-merge-empty__card strong {
  color: var(--text-h);
  font-size: 0.875rem;
  font-weight: 600;
}

.two-way-merge-empty__card p {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--muted);
}

.two-way-merge-empty__card .ui-btn {
  pointer-events: auto;
  margin-top: 0.25rem;
}

.two-way-merge-frame.is-dragging-left .two-way-merge-empty--left .two-way-merge-empty__card,
.two-way-merge-frame.is-dragging-right .two-way-merge-empty--right .two-way-merge-empty__card {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent-muted) 72%, var(--surface));
}

.two-way-merge-stage {
  position: relative;
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 0.35rem;
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
  height: 100%;
  overflow: auto;
}

:deep(.cm-mergeViewEditors) {
  display: flex;
  flex-direction: row;
  min-height: 100%;
}

:deep(.cm-mergeViewEditor) {
  flex: 1 1 0;
  min-width: 0;
  min-height: 100%;
}

:deep(.cm-editor),
:deep(.cm-scroller) {
  min-height: 100%;
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
</style>
