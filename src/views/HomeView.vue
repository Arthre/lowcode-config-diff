<script setup lang="ts" name="HomeView">
import DownloadMenu from '@/features/merge/components/DownloadMenu.vue'
import ThemeToggle from '@/features/shell/components/ThemeToggle.vue'
import TwoWayMergeEditor from '@/features/merge/components/TwoWayMergeEditor.vue'
import UiMessage from '@/components/ui/UiMessage.vue'
import UiSwitch from '@/components/ui/UiSwitch.vue'
import UiTooltip from '@/components/ui/UiTooltip.vue'
import { chunkKindSummaryText, type ChunkKindCounts } from '@/features/merge/lib/chunk/kind'
import {
  chunkAnchorText,
  chunkNavAriaLabel,
  chunkNavVisibleLabel,
} from '@/features/merge/lib/chunk/navAnchor'
import {
  describeRightDocExport,
  type RightDocExportHint,
} from '@/features/merge/lib/export/describeRightDoc'
import { guardRightDocDownload } from '@/features/merge/lib/export/packDownload'
import {
  statusDismissMs,
  toneFromExportHint,
  type StatusMessageTone,
} from '@/features/merge/lib/policy/statusMessage'
import { createCollapseAutoOnce } from '@/features/merge/lib/editor/collapse'
import { isLargeDoc } from '@/features/merge/lib/policy/largeDoc'
import { useAppStore } from '@/stores/app'
import { useMergeWorkspace } from '@/stores/mergeWorkspace'
import { copyText, downloadJsonFile } from '@/utils/exportConfig'

const appStore = useAppStore()
const workspace = useMergeWorkspace()

const mergeEditorRef = ref<{
  goToPrevChunk: () => void
  goToNextChunk: () => void
  openSearch: () => boolean
  flushDocs: () => void
  getRightDoc: () => string
} | null>(null)
/** 折叠编辑器未改行；默认关，不写 localStorage。 */
const collapseUnchanged = ref(false)
const collapseSession = createCollapseAutoOnce()
/** 双侧都有配置后才谈差异状态（徽章/导航/仅显示差异）。 */
const bothConfigsReady = computed(
  () => workspace.leftDoc.length > 0 && workspace.rightDoc.length > 0,
)
const chunkCount = ref(0)
const chunkCurrent = ref(0)
const chunkKinds = ref<ChunkKindCounts>({ added: 0, removed: 0, modified: 0 })
const collapseToggleDisabled = computed(() => !bothConfigsReady.value || chunkCount.value === 0)
const statusText = ref('')
const statusTone = ref<StatusMessageTone>('success')
const statusNonce = ref(0)
const chunkAnchor = computed(() => chunkAnchorText(chunkCurrent.value, chunkCount.value))
const kindRowAriaLabel = computed(() => chunkKindSummaryText(chunkKinds.value))

let statusClearTimer: ReturnType<typeof setTimeout> | undefined

function clearDiffStatus() {
  chunkCount.value = 0
  chunkCurrent.value = 0
  chunkKinds.value = { added: 0, removed: 0, modified: 0 }
}

function onChunks(count: number, current: number, kinds: ChunkKindCounts) {
  if (!bothConfigsReady.value) {
    clearDiffStatus()
    return
  }
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

function onEditorNotice(notice: { text: string; tone: StatusMessageTone }) {
  showStatus(notice.text, notice.tone)
}

/** 用户切换「仅显示差异」；关掉才记本会话抑制。 */
function onCollapseUserChange(enabled: boolean) {
  collapseUnchanged.value = enabled
  if (!enabled) collapseSession.onUserSet(false)
}

watch(
  () => [workspace.leftDoc, workspace.rightDoc] as const,
  ([left, right]) => {
    const both = left.length > 0 && right.length > 0
    if (!both) {
      clearDiffStatus()
      // 缺一侧时关掉折叠，但不记用户抑制，便于双侧齐后再自动开
      collapseUnchanged.value = false
      return
    }
    const isLarge = isLargeDoc(left) || isLargeDoc(right)
    collapseUnchanged.value = collapseSession.nextEnabled(collapseUnchanged.value, isLarge)
  },
)

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

function rightDocForExport() {
  return mergeEditorRef.value?.getRightDoc() ?? workspace.rightDoc
}

async function onCopy() {
  const text = rightDocForExport()
  const hint = describeRightDocExport(text)
  try {
    await copyText(text)
    showStatus(copyHintText(hint) ?? '已复制', toneFromExportHint(hint.kind))
  } catch {
    showStatus('复制失败', 'error')
  }
}

function onDownload(compressed: boolean) {
  const guarded = guardRightDocDownload(rightDocForExport(), compressed)
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
          <UiTooltip text="折叠编辑器中未改动的行">
            <UiSwitch
              :model-value="collapseUnchanged"
              label="仅显示差异"
              :disabled="collapseToggleDisabled"
              @update:model-value="onCollapseUserChange"
            />
          </UiTooltip>
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
            <span class="i-lucide-chevron-left" aria-hidden="true" />
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
            <span class="i-lucide-chevron-right" aria-hidden="true" />
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
              class="ui-btn"
              aria-label="搜索"
              @click="mergeEditorRef?.openSearch()"
            >
              <span class="i-lucide-search" aria-hidden="true" />
              搜索
            </button>
          </UiTooltip>
          <UiTooltip text="复制目标配置">
            <button type="button" class="ui-btn" aria-label="复制" @click="onCopy">
              <span class="i-lucide-copy" aria-hidden="true" />
              复制
            </button>
          </UiTooltip>
          <DownloadMenu @pretty="onDownload(false)" @compressed="onDownload(true)" />
        </div>
      </div>
    </header>

    <div class="ui-workspace">
      <TwoWayMergeEditor
        ref="mergeEditorRef"
        v-model:collapse-unchanged="collapseUnchanged"
        class="flex-1 min-h-0"
        @chunks="onChunks"
        @notice="onEditorNotice"
      />
    </div>

    <UiMessage
      :text="statusText"
      :tone="statusTone"
      :nonce="statusNonce"
      @dismiss="dismissStatus"
    />
  </div>
</template>
