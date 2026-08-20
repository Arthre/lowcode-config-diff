<script setup lang="ts" name="HomeView">
import DownloadMenu from '@/components/DownloadMenu.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import TwoWayMergeEditor from '@/components/TwoWayMergeEditor.vue'
import UiTooltip from '@/components/UiTooltip.vue'
import { chunkKindSummaryText, type ChunkKindCounts } from '@/composables/chunkKind'
import { chunkAnchorText } from '@/composables/chunkNavAnchor'
import {
  describeRightDocExport,
  type RightDocExportHint,
} from '@/composables/describeRightDocExport'
import { packRightDocDownload } from '@/composables/packRightDocDownload'
import { useAppStore } from '@/stores/app'
import { useMergeWorkspace } from '@/stores/mergeWorkspace'
import { copyText, downloadJsonFile } from '@/utils/exportConfig'

const appStore = useAppStore()
const workspace = useMergeWorkspace()

const mergeEditorRef = ref<{
  goToPrevChunk: () => void
  goToNextChunk: () => void
  openSearch: () => boolean
} | null>(null)
const chunkCount = ref(0)
const chunkCurrent = ref(0)
const chunkKinds = ref<ChunkKindCounts>({ added: 0, removed: 0, modified: 0 })
const statusText = ref('')
const chunkAnchor = computed(() => chunkAnchorText(chunkCurrent.value, chunkCount.value))

let statusClearTimer: ReturnType<typeof setTimeout> | undefined

function onChunks(count: number, current: number, kinds: ChunkKindCounts) {
  chunkCount.value = count
  chunkCurrent.value = current
  chunkKinds.value = kinds
}

function exportHintText(hint: RightDocExportHint): string | null {
  if (hint.kind === 'empty') return '目标配置为空，仍已导出'
  if (hint.kind === 'invalid') return hint.message
  return null
}

function clearStatusLater() {
  if (statusClearTimer !== undefined) {
    clearTimeout(statusClearTimer)
  }
  statusClearTimer = setTimeout(() => {
    statusText.value = ''
    statusClearTimer = undefined
  }, 2000)
}

async function onCopy() {
  const hint = describeRightDocExport(workspace.rightDoc)
  try {
    await copyText(workspace.rightDoc)
    statusText.value = exportHintText(hint) ?? '已复制'
  } catch {
    statusText.value = '复制失败'
  }
  clearStatusLater()
}

function onDownload(compressed: boolean) {
  const packed = packRightDocDownload(workspace.rightDoc, compressed)
  downloadJsonFile(packed.content, packed.filename)
  statusText.value = exportHintText(packed.hint) ?? (compressed ? '已压缩并导出' : '已导出')
  clearStatusLater()
}

onBeforeUnmount(() => {
  if (statusClearTimer !== undefined) {
    clearTimeout(statusClearTimer)
    statusClearTimer = undefined
  }
})
</script>

<template>
  <div class="ui-page">
    <header class="ui-page-header">
      <div class="ui-page-header-inner">
        <div class="ui-page-header-top">
          <div class="ui-page-header-brand">
            <div class="ui-brand-mark" aria-hidden="true">
              <span class="i-lucide-git-compare" />
            </div>
            <h1>{{ appStore.title }}</h1>
          </div>
          <div class="ui-page-header-end">
            <UiTooltip text="所有 JSON 均在浏览器本地处理，不会上传到服务器。">
              <span
                class="ui-privacy"
                tabindex="0"
                aria-label="所有 JSON 均在浏览器本地处理，不会上传到服务器。"
              >
                <span class="i-lucide-shield-check text-[var(--accent)]" aria-hidden="true" />
                本地处理
              </span>
            </UiTooltip>
            <ThemeToggle />
          </div>
        </div>
        <div class="ui-page-header-meta">
          <div class="ui-result-toolbar" role="toolbar" aria-label="差异导航与导出">
            <div class="ui-toolbar-cluster">
              <div class="ui-diff-anchor">
                <span
                  class="ui-diff-badge"
                  :class="chunkCount === 0 ? 'is-clean' : 'is-open'"
                  aria-live="polite"
                >
                  <span v-if="chunkCount === 0" class="i-lucide-check" aria-hidden="true" />
                  <span v-else class="ui-diff-badge__dot" aria-hidden="true" />
                  {{ chunkAnchor }}
                </span>
                <span
                  v-if="chunkCount > 0"
                  class="ui-diff-kind-row"
                  role="status"
                  :aria-label="chunkKindSummaryText(chunkKinds)"
                >
                  <span class="ui-diff-kind is-added">新增 {{ chunkKinds.added }}</span>
                  <span class="ui-diff-kind-sep" aria-hidden="true"> · </span>
                  <span class="ui-diff-kind is-removed">删除 {{ chunkKinds.removed }}</span>
                  <span class="ui-diff-kind-sep" aria-hidden="true"> · </span>
                  <span class="ui-diff-kind is-modified">修改 {{ chunkKinds.modified }}</span>
                </span>
              </div>
              <button
                type="button"
                class="ui-btn"
                :disabled="chunkCount === 0"
                @click="mergeEditorRef?.goToPrevChunk()"
              >
                上一个差异
              </button>
              <button
                type="button"
                class="ui-btn"
                :disabled="chunkCount === 0"
                @click="mergeEditorRef?.goToNextChunk()"
              >
                下一个差异
              </button>
            </div>
            <div class="ui-toolbar-cluster">
              <UiTooltip text="搜索 Ctrl+F">
                <button
                  type="button"
                  class="ui-btn ui-btn-icon"
                  aria-label="搜索"
                  @click="mergeEditorRef?.openSearch()"
                >
                  <span class="i-lucide-search" aria-hidden="true" />
                </button>
              </UiTooltip>
              <UiTooltip text="复制目标配置">
                <button type="button" class="ui-btn ui-btn-icon" aria-label="复制" @click="onCopy">
                  <span class="i-lucide-copy" aria-hidden="true" />
                </button>
              </UiTooltip>
              <DownloadMenu @pretty="onDownload(false)" @compressed="onDownload(true)" />
              <span v-if="statusText" class="text-xs font-medium" role="status">{{
                statusText
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="ui-workspace">
      <TwoWayMergeEditor ref="mergeEditorRef" class="flex-1 min-h-0" @chunks="onChunks" />
    </div>
  </div>
</template>
