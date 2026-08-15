<script setup lang="ts" name="MergePreview">
import { formatConfig } from '@/core/format'
import { mergeConfig } from '@/core/merge'
import { useDiffSession } from '@/stores/diffSession'
import { buildMergeSummaryText, copyText, downloadJsonFile } from '@/utils/exportConfig'

const session = useDiffSession()

const previewText = computed(() => {
  if (!session.active || session.testConfig == null || session.prodConfig == null) {
    return ''
  }
  const merged = mergeConfig(session.testConfig, session.prodConfig, session.leaves)
  return formatConfig(merged)
})

const summaryText = computed(() => {
  if (!session.active) return ''
  return buildMergeSummaryText(session.leaves)
})

const copyFeedback = ref<'idle' | 'copied' | 'failed'>('idle')
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined

function clearCopyFeedbackTimer() {
  if (copyFeedbackTimer !== undefined) {
    clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = undefined
  }
}

function showCopyFeedback(state: 'copied' | 'failed') {
  clearCopyFeedbackTimer()
  copyFeedback.value = state
  copyFeedbackTimer = setTimeout(() => {
    copyFeedback.value = 'idle'
    copyFeedbackTimer = undefined
  }, 2000)
}

onBeforeUnmount(() => {
  clearCopyFeedbackTimer()
})

async function onCopy() {
  if (!previewText.value) return
  try {
    await copyText(previewText.value)
    showCopyFeedback('copied')
  } catch {
    showCopyFeedback('failed')
  }
}

function onDownload() {
  if (!previewText.value) return
  downloadJsonFile(previewText.value)
}
</script>

<template>
  <div class="flex flex-col gap-3.5 text-left w-full">
    <div v-if="!session.active" class="ui-empty-slot">
      <p>开始 Diff 并完成选边后，此处显示合并结果预览。</p>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center gap-2.5">
        <p class="text-sm text-[var(--text-h)] m-0 font-medium flex-1 min-w-40">
          {{ summaryText }}
        </p>
        <button type="button" class="ui-btn" :disabled="!previewText" @click="onCopy">
          <span class="i-lucide-copy" aria-hidden="true" />
          复制
        </button>
        <button
          type="button"
          class="ui-btn ui-btn-primary"
          :disabled="!previewText"
          @click="onDownload"
        >
          <span class="i-lucide-download" aria-hidden="true" />
          下载 config.json
        </button>
        <span
          v-if="copyFeedback === 'copied'"
          class="text-xs font-medium ui-status-valid ui-fade-in"
          role="status"
        >
          已复制
        </span>
        <span
          v-else-if="copyFeedback === 'failed'"
          class="text-xs font-medium ui-status-invalid"
          role="status"
        >
          复制失败，请手动选择文本复制
        </span>
      </div>

      <pre
        class="m-0 max-h-96 overflow-auto rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--code-bg)] p-3.5 text-sm font-mono text-[var(--text-h)] whitespace-pre-wrap break-words"
        >{{ previewText }}</pre>
    </template>
  </div>
</template>
