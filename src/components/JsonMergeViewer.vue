<script setup lang="ts" name="JsonMergeViewer">
import { MergeView } from '@codemirror/merge'
import { createReadonlyJsonExtensions, mergeHighlightTheme } from '@/composables/codemirrorTheme'

const props = withDefaults(
  defineProps<{
    leftDoc: string
    rightDoc: string
    leftLabel?: string
    rightLabel?: string
    maxHeight?: string
  }>(),
  {
    leftLabel: 'TEST',
    rightLabel: 'PROD',
    maxHeight: '360px',
  },
)

const hostRef = ref<HTMLElement | null>(null)
/** 点入对比区后才允许内部滚动，避免抢走差异面板滚轮 */
const scrollArmed = ref(false)
let mergeView: MergeView | null = null

function editorExtensions() {
  // MergeView 要求两侧 scroller 为 height:auto + overflow:visible，由外层 .cm-mergeView 统一滚动以保持同步
  return createReadonlyJsonExtensions([mergeHighlightTheme], { focusScroll: false })
}

function mountView() {
  if (!hostRef.value) return
  mergeView?.destroy()
  scrollArmed.value = false
  mergeView = new MergeView({
    parent: hostRef.value,
    a: {
      doc: props.leftDoc,
      extensions: editorExtensions(),
    },
    b: {
      doc: props.rightDoc,
      extensions: editorExtensions(),
    },
    highlightChanges: true,
    gutter: true,
    // 不启用 collapseUnchanged：折叠块像 tab/手风琴且展开卡顿；始终完整两列并排
    diffConfig: { scanLimit: 800, timeout: 250 },
  })
}

function onHostPointerDown() {
  scrollArmed.value = true
}

function onDocPointerDown(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node) || !hostRef.value?.contains(target)) {
    scrollArmed.value = false
  }
}

onMounted(() => {
  mountView()
  document.addEventListener('pointerdown', onDocPointerDown, true)
})

watch(
  () => [props.leftDoc, props.rightDoc] as const,
  ([left, right]) => {
    if (!mergeView) return
    const a = mergeView.a.state.doc.toString()
    const b = mergeView.b.state.doc.toString()
    if (a === left && b === right) return
    // 文档整体替换时重建，避免双端 dispatch 与 chunk 不同步
    mountView()
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  mergeView?.destroy()
  mergeView = null
})
</script>

<template>
  <div class="flex flex-col gap-1.5 min-w-0">
    <div class="grid grid-cols-2 gap-2 text-xs font-semibold">
      <span class="ui-label-test">{{ leftLabel }}</span>
      <span class="ui-label-prod">{{ rightLabel }}</span>
    </div>
    <div
      ref="hostRef"
      class="json-merge-viewer overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--code-bg)]"
      :class="{ 'is-scroll-armed': scrollArmed }"
      :style="{ maxHeight, height: maxHeight }"
      @pointerdown="onHostPointerDown"
    />
  </div>
</template>

<style scoped lang="scss">
/*
 * @codemirror/merge：两侧编辑器不各自滚动，由 .cm-mergeView 统一 overflow 滚动，
 * 才能保持行对齐与左右同步。勿再给 .cm-scroller 设独立 overflow:auto。
 */
.json-merge-viewer :deep(.cm-mergeView) {
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}

.json-merge-viewer.is-scroll-armed :deep(.cm-mergeView) {
  overflow: auto;
}

.json-merge-viewer :deep(.cm-mergeViewEditors) {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.json-merge-viewer :deep(.cm-mergeViewEditor) {
  flex: 1 1 50%;
  min-width: 0;
  width: 50%;
}
</style>
