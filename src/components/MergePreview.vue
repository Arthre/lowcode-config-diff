<script setup lang="ts" name="MergePreview">
import { compressConfig, formatConfig } from '@/core/format'
import { mergeConfig } from '@/core/merge'
import { useDiffSession } from '@/stores/diffSession'
import { copyText, downloadJsonFile } from '@/utils/exportConfig'

export type MergePreviewViewMode = 'formatted' | 'compressed'

const props = withDefaults(
  defineProps<{
    viewMode?: MergePreviewViewMode
  }>(),
  {
    viewMode: 'formatted',
  },
)

const session = useDiffSession()

const mergedConfig = computed(() => {
  if (!session.active || session.testConfig == null || session.prodConfig == null) {
    return null
  }
  return mergeConfig(session.testConfig, session.prodConfig, session.leaves)
})

const previewText = computed(() => {
  if (mergedConfig.value == null) return ''
  return props.viewMode === 'compressed'
    ? compressConfig(mergedConfig.value)
    : formatConfig(mergedConfig.value)
})

async function copy(): Promise<'copied' | 'failed' | 'empty'> {
  if (!previewText.value) return 'empty'
  try {
    await copyText(previewText.value)
    return 'copied'
  } catch {
    return 'failed'
  }
}

function download() {
  if (!previewText.value) return
  downloadJsonFile(previewText.value)
}

defineExpose({
  download,
  copy,
})
</script>

<template>
  <div class="merge-preview flex flex-col gap-3.5 text-left w-full min-w-0 min-h-0 flex-1">
    <div v-if="!session.active" class="ui-empty-slot">
      <p>开始 Diff 并完成选边后，此处显示合并结果预览。</p>
    </div>

    <JsonCodeViewer
      v-else-if="previewText"
      class="min-w-0 w-full min-h-0 flex-1"
      :doc="previewText"
      max-height="100%"
    />
  </div>
</template>
