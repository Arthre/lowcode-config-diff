<script setup lang="ts" name="DiffLeafViewer">
import type { DiffType } from '@/core/types'

const props = defineProps<{
  diffType: DiffType
  testDoc: string
  prodDoc: string
  hasTest: boolean
  hasProd: boolean
}>()

const useMerge = computed(() => props.diffType === 'modified' && props.hasTest && props.hasProd)
</script>

<template>
  <div class="min-w-0">
    <JsonMergeViewer v-if="useMerge" :left-doc="testDoc" :right-doc="prodDoc" />
    <div v-else class="grid gap-3 grid-cols-1 md:grid-cols-2">
      <div class="min-w-0 flex flex-col gap-1.5">
        <div class="ui-label-test text-xs font-semibold">TEST</div>
        <JsonCodeViewer v-if="hasTest" :doc="testDoc" tone="added" focus-scroll />
        <div
          v-else
          class="flex flex-1 items-center justify-center min-h-40 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--code-bg)] px-3 text-sm text-[var(--muted)] text-center"
        >
          TEST 无此配置
        </div>
      </div>
      <div class="min-w-0 flex flex-col gap-1.5">
        <div class="ui-label-prod text-xs font-semibold">PROD</div>
        <JsonCodeViewer v-if="hasProd" :doc="prodDoc" tone="removed" focus-scroll />
        <div
          v-else
          class="flex flex-1 items-center justify-center min-h-40 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--code-bg)] px-3 text-sm text-[var(--muted)] text-center"
        >
          PROD 无此配置
        </div>
      </div>
    </div>
  </div>
</template>
