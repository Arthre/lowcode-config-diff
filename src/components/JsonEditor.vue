<script setup lang="ts" name="JsonEditor">
import { json } from '@codemirror/lang-json'
import { basicSetup } from 'codemirror'
import { Codemirror } from 'vue-codemirror'

defineProps<{
  modelValue: string
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const extensions = [basicSetup, json()]

function onChange(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="flex flex-col gap-2 min-h-0 flex-1 text-left">
    <div class="text-sm font-medium text-[var(--text-h)]">{{ label }}</div>
    <Codemirror
      :model-value="modelValue"
      :extensions="extensions"
      :style="{ height: '360px', textAlign: 'left' }"
      class="border border-[var(--border)] rounded overflow-hidden text-left"
      @update:model-value="onChange"
    />
  </div>
</template>
