<script setup lang="ts" name="JsonEditor">
import { json } from '@codemirror/lang-json'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { Codemirror } from 'vue-codemirror'

defineProps<{
  modelValue: string
  label: string
  side?: 'test' | 'prod'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** Theme follows CSS variables so light/dark html.dark swaps stay in sync. */
const appEditorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--code-bg)',
    color: 'var(--text-h)',
  },
  '.cm-content': {
    fontFamily: 'var(--mono)',
    caretColor: 'var(--accent)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--accent)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 28%, transparent)',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--code-bg)',
    color: 'var(--muted)',
    borderRight: '1px solid var(--border-subtle)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
  },
})

const extensions = [basicSetup, json(), appEditorTheme]

function onChange(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex flex-col gap-2 min-h-0 flex-1">
    <div class="text-sm font-semibold" :class="side === 'prod' ? 'ui-label-prod' : 'ui-label-test'">
      {{ label }}
    </div>
    <Codemirror
      :model-value="modelValue"
      :extensions="extensions"
      :style="{ height: '360px', textAlign: 'left' }"
      class="overflow-hidden text-left rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--code-bg)]"
      @update:model-value="onChange"
    />
  </div>
</template>
