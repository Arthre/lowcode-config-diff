<script setup lang="ts" name="JsonEditor">
import { json } from '@codemirror/lang-json'
import { openSearchPanel, search } from '@codemirror/search'
import { Prec } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { Codemirror } from 'vue-codemirror'
import { appEditorTheme, editorPhrases } from '@/composables/codemirrorTheme'

defineProps<{
  modelValue: string
  label: string
  side?: 'test' | 'prod'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** basicSetup 已含 searchKeymap；补中文、顶栏面板，并拦截浏览器 Ctrl/Cmd+F */
const extensions = [
  basicSetup,
  json(),
  appEditorTheme,
  editorPhrases,
  search({ top: true }),
  Prec.highest(
    keymap.of([
      { key: 'Mod-f', run: openSearchPanel, preventDefault: true },
      { key: 'Mod-h', run: openSearchPanel, preventDefault: true },
    ]),
  ),
]

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
