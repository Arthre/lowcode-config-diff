<script setup lang="ts" name="JsonCodeViewer">
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  createReadonlyJsonExtensions,
  setSideMarksEffect,
  sideMarksField,
  type SideMarkSpec,
} from '@/composables/codemirrorTheme'

const props = withDefaults(
  defineProps<{
    doc: string
    maxHeight?: string
    tone?: 'default' | 'added' | 'removed'
    label?: string
    labelSide?: 'test' | 'prod'
    sideMarks?: SideMarkSpec[]
    /** 差异区：点入后才允许内部滚动；结果区保持 false */
    focusScroll?: boolean
  }>(),
  {
    maxHeight: '320px',
    tone: 'default',
    sideMarks: () => [],
    focusScroll: false,
  },
)

const autoHeight = computed(() => props.maxHeight === 'auto' || props.maxHeight === 'none')

const hostRef = ref<HTMLElement | null>(null)
let view: EditorView | null = null

function minimalDocumentChange(current: string, next: string) {
  let from = 0
  const sharedLength = Math.min(current.length, next.length)
  while (from < sharedLength && current.charCodeAt(from) === next.charCodeAt(from)) {
    from += 1
  }

  let currentTo = current.length
  let nextTo = next.length
  while (
    currentTo > from &&
    nextTo > from &&
    current.charCodeAt(currentTo - 1) === next.charCodeAt(nextTo - 1)
  ) {
    currentTo -= 1
    nextTo -= 1
  }

  return { from, to: currentTo, insert: next.slice(from, nextTo) }
}

function mountView() {
  if (!hostRef.value) return
  view?.destroy()
  const useAutoHeight = autoHeight.value
  view = new EditorView({
    parent: hostRef.value,
    state: EditorState.create({
      doc: props.doc,
      extensions: createReadonlyJsonExtensions(
        [
          sideMarksField,
          EditorView.theme(
            useAutoHeight
              ? {
                  '&': { height: 'auto' },
                  '.cm-scroller': { overflowX: 'auto', overflowY: 'hidden' },
                  '.cm-content': { minHeight: 'auto' },
                }
              : props.maxHeight === '100%'
                ? {
                    '&': { height: '100%', maxHeight: '100%' },
                    '.cm-scroller': { maxHeight: '100%' },
                  }
                : {
                    // 随内容增高，超出 maxHeight 后内部滚动
                    '&': { height: 'auto', maxHeight: props.maxHeight },
                    '.cm-scroller': { maxHeight: props.maxHeight, overflow: 'auto' },
                    '.cm-content': { minHeight: 'auto' },
                  },
          ),
        ],
        { focusScroll: props.focusScroll },
      ),
    }),
  })
  applySideMarks(props.sideMarks)
}

function applySideMarks(marks: SideMarkSpec[]) {
  if (!view) return
  view.dispatch({
    effects: setSideMarksEffect.of(marks),
  })
}

/** 将编辑器滚动到 [from, to)，并短暂选中以便扫读 */
function scrollToRange(from: number, to: number) {
  if (!view) return false
  const docLen = view.state.doc.length
  const start = Math.max(0, Math.min(from, docLen))
  const end = Math.max(start, Math.min(to, docLen))
  view.dispatch({
    selection: { anchor: start, head: end },
    effects: EditorView.scrollIntoView(start, { y: 'center' }),
  })
  view.focus()
  return true
}

defineExpose({
  scrollToRange,
})

onMounted(() => {
  mountView()
})

watch(
  () => [props.doc, props.sideMarks] as const,
  ([doc, marks]) => {
    if (!view) return
    const current = view.state.doc.toString()
    if (current === doc) {
      applySideMarks(marks)
      return
    }
    view.dispatch({
      changes: minimalDocumentChange(current, doc),
      effects: setSideMarksEffect.of(marks),
    })
  },
)

watch(
  () => [props.focusScroll, props.maxHeight] as const,
  () => {
    mountView()
  },
)

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})
</script>

<template>
  <div
    class="json-code-viewer-root flex flex-col gap-1.5 min-w-0"
    :class="{ 'min-h-0 flex-1': !autoHeight }"
  >
    <div
      v-if="label"
      class="text-xs font-semibold shrink-0"
      :class="labelSide === 'prod' ? 'ui-label-prod' : labelSide === 'test' ? 'ui-label-test' : ''"
    >
      {{ label }}
    </div>
    <div
      ref="hostRef"
      class="json-code-viewer overflow-hidden text-left rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--code-bg)]"
      :class="{
        'json-code-viewer--added': tone === 'added',
        'json-code-viewer--removed': tone === 'removed',
        'json-code-viewer--auto': autoHeight,
        'json-code-viewer--fill': maxHeight === '100%',
        'min-h-0 flex-1': !autoHeight,
      }"
      :style="
        autoHeight
          ? { height: 'auto', maxHeight: 'none' }
          : maxHeight === '100%'
            ? { maxHeight: '100%', height: '100%' }
            : { height: 'auto', maxHeight }
      "
    />
  </div>
</template>

<style scoped lang="scss">
.json-code-viewer--added {
  box-shadow: inset 3px 0 0 var(--diff-added);
}

.json-code-viewer--removed {
  box-shadow: inset 3px 0 0 var(--diff-removed);
}

.json-code-viewer--fill :deep(.cm-editor) {
  height: 100%;
}

.json-code-viewer:not(.json-code-viewer--fill) :deep(.cm-editor) {
  height: auto;
  max-height: inherit;
  max-width: 100%;
}

.json-code-viewer :deep(.cm-scroller) {
  max-width: 100%;
}

.json-code-viewer {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
</style>
