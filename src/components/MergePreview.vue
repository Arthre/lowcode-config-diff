<script setup lang="ts" name="MergePreview">
import {
  buildMergeAnnotations,
  buildSideMarksFromAnnotations,
  locateJsonPathRange,
  type MergeAnnotation,
} from '@/composables/mergeAnnotations'
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

const codeViewerRef = ref<{
  scrollToRange: (from: number, to: number) => boolean
} | null>(null)

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

const annotations = computed(() => {
  if (!session.active) return []
  return buildMergeAnnotations(session.leaves)
})

const sideMarks = computed(() => {
  if (props.viewMode !== 'formatted' || !previewText.value) return []
  return buildSideMarksFromAnnotations(previewText.value, annotations.value)
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

/**
 * 按合并来源定位结果预览：先滚到结果区，keep 且能定位时滚到对应片段。
 * drop 或不在结果中的路径仅滚到结果区。
 */
function scrollToAnnotation(item: MergeAnnotation) {
  const resultSection = document.getElementById('section-result')
  resultSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

  if (!previewText.value || item.effect === 'drop') return false

  const range = locateJsonPathRange(previewText.value, item.path)
  if (!range) return false

  // 下一帧再滚编辑器，避免与外层 scrollIntoView 抢滚动
  requestAnimationFrame(() => {
    codeViewerRef.value?.scrollToRange(range.from, range.to)
  })
  return true
}

defineExpose({
  download,
  copy,
  scrollToAnnotation,
})
</script>

<template>
  <div class="merge-preview flex flex-col gap-3.5 text-left w-full min-w-0 min-h-0 flex-1">
    <div v-if="!session.active" class="ui-empty-slot">
      <p>开始 Diff 并完成选边后，此处显示合并结果预览。</p>
    </div>

    <JsonCodeViewer
      v-else-if="previewText"
      ref="codeViewerRef"
      class="min-w-0 w-full min-h-0 flex-1"
      :doc="previewText"
      :side-marks="sideMarks"
      max-height="100%"
    />
  </div>
</template>
