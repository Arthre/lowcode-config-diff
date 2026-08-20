<script setup lang="ts" name="HomeView">
import DownloadMenu from '@/components/DownloadMenu.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import TwoWayMergeEditor from '@/components/TwoWayMergeEditor.vue'
import UiMessage from '@/components/UiMessage.vue'
import UiTooltip from '@/components/UiTooltip.vue'
import { chunkKindSummaryText, type ChunkKindCounts } from '@/composables/chunkKind'
import {
  chunkAnchorText,
  chunkNavAriaLabel,
  chunkNavVisibleLabel,
} from '@/composables/chunkNavAnchor'
import {
  describeRightDocExport,
  type RightDocExportHint,
} from '@/composables/describeRightDocExport'
import { guardRightDocDownload } from '@/composables/packRightDocDownload'
import {
  statusDismissMs,
  toneFromExportHint,
  type StatusMessageTone,
} from '@/composables/statusMessage'
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
const statusTone = ref<StatusMessageTone>('success')
const statusNonce = ref(0)
const chunkAnchor = computed(() => chunkAnchorText(chunkCurrent.value, chunkCount.value))
const kindRowAriaLabel = computed(() => chunkKindSummaryText(chunkKinds.value))

let statusClearTimer: ReturnType<typeof setTimeout> | undefined

function onChunks(count: number, current: number, kinds: ChunkKindCounts) {
  chunkCount.value = count
  chunkCurrent.value = current
  chunkKinds.value = kinds
}

function copyHintText(hint: RightDocExportHint): string | null {
  if (hint.kind === 'empty') return '目标配置为空，仍已复制'
  if (hint.kind === 'invalid') return hint.message
  return null
}

function dismissStatus() {
  if (statusClearTimer !== undefined) {
    clearTimeout(statusClearTimer)
    statusClearTimer = undefined
  }
  statusText.value = ''
}

function showStatus(text: string, tone: StatusMessageTone) {
  if (statusClearTimer !== undefined) {
    clearTimeout(statusClearTimer)
    statusClearTimer = undefined
  }
  statusText.value = text
  statusTone.value = tone
  statusNonce.value += 1
  statusClearTimer = setTimeout(() => {
    statusText.value = ''
    statusClearTimer = undefined
  }, statusDismissMs(tone))
}

async function onCopy() {
  const hint = describeRightDocExport(workspace.rightDoc)
  try {
    await copyText(workspace.rightDoc)
    showStatus(copyHintText(hint) ?? '已复制', toneFromExportHint(hint.kind))
  } catch {
    showStatus('复制失败', 'error')
  }
}

function onDownload(compressed: boolean) {
  const guarded = guardRightDocDownload(workspace.rightDoc, compressed)
  if (!guarded.allow) {
    showStatus(guarded.message, guarded.tone)
    return
  }
  downloadJsonFile(guarded.content, guarded.filename)
  showStatus(guarded.message, guarded.tone)
}

onBeforeUnmount(dismissStatus)
</script>

<template>
  <div class="ui-page">
    <header class="ui-page-header">
      <div class="ui-page-header-inner">
        <div class="ui-page-header-brand">
          <div class="ui-brand-mark" aria-hidden="true">
            <span class="i-lucide-git-compare" />
          </div>
          <h1>{{ appStore.title }}</h1>
        </div>
        <div class="ui-toolbar-cluster" role="toolbar" aria-label="差异导航">
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
              :aria-label="kindRowAriaLabel"
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
            class="ui-btn ui-diff-nav"
            :disabled="chunkCount === 0"
            :aria-label="chunkNavAriaLabel('prev')"
            @click="mergeEditorRef?.goToPrevChunk()"
          >
            <span class="i-lucide-chevron-up" aria-hidden="true" />
            {{ chunkNavVisibleLabel('prev') }}
          </button>
          <button
            type="button"
            class="ui-btn ui-btn-soft ui-diff-nav"
            :disabled="chunkCount === 0"
            :aria-label="chunkNavAriaLabel('next')"
            @click="mergeEditorRef?.goToNextChunk()"
          >
            {{ chunkNavVisibleLabel('next') }}
            <span class="i-lucide-chevron-down" aria-hidden="true" />
          </button>
        </div>
        <div
          class="ui-toolbar-cluster ui-page-header-end"
          role="toolbar"
          aria-label="本地处理与导出"
        >
          <UiTooltip text="所有 JSON 均在浏览器本地处理，不会上传到服务器。" placement="bottom">
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
        </div>
      </div>
    </header>

    <div class="ui-workspace">
      <TwoWayMergeEditor ref="mergeEditorRef" class="flex-1 min-h-0" @chunks="onChunks" />
    </div>

    <UiMessage
      :text="statusText"
      :tone="statusTone"
      :nonce="statusNonce"
      @dismiss="dismissStatus"
    />
  </div>
</template>
