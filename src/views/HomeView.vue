<script setup lang="ts" name="HomeView">
import DownloadMenu from '@/components/DownloadMenu.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import TwoWayMergeEditor from '@/components/TwoWayMergeEditor.vue'
import UiTooltip from '@/components/UiTooltip.vue'
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
const statusText = ref('')

let statusClearTimer: ReturnType<typeof setTimeout> | undefined

function onChunks(n: number) {
  chunkCount.value = n
}

function exportHintText(hint: RightDocExportHint): string | null {
  if (hint.kind === 'empty') return '结果为空，仍已导出'
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
  statusText.value = exportHintText(packed.hint) ?? (compressed ? '已压缩并下载' : '已下载')
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
          <ThemeToggle />
        </div>
        <div class="ui-page-header-meta">
          <span class="ui-privacy">
            <span class="i-lucide-shield-check text-[var(--accent)]" aria-hidden="true" />
            本地处理 · 不上传
          </span>
          <div class="ui-result-toolbar" role="toolbar" aria-label="差异导航与导出">
            <span class="text-sm text-[var(--text-h)] tabular-nums">{{ chunkCount }} 个差异块</span>
            <button type="button" class="ui-btn" @click="mergeEditorRef?.goToPrevChunk()">
              上一条
            </button>
            <button type="button" class="ui-btn" @click="mergeEditorRef?.goToNextChunk()">
              下一条
            </button>
            <UiTooltip text="查找">
              <button
                type="button"
                class="ui-btn ui-btn-icon"
                aria-label="查找"
                @click="mergeEditorRef?.openSearch()"
              >
                <span class="i-lucide-search" aria-hidden="true" />
              </button>
            </UiTooltip>
            <UiTooltip text="复制结果">
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
    </header>

    <div class="ui-workspace">
      <TwoWayMergeEditor ref="mergeEditorRef" class="flex-1 min-h-0" @chunks="onChunks" />
    </div>
  </div>
</template>
