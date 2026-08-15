<script setup lang="ts" name="JsonInputArea">
import { watchDebounced } from '@vueuse/core'
import type { Config } from '@/core/types'
import {
  evaluateJsonDocument,
  formatJsonDocument,
  type JsonDocumentState,
} from '@/composables/useJsonDocument'
import JsonEditor from '@/components/JsonEditor.vue'

const emit = defineEmits<{
  'start-diff': [payload: { test: Config; prod: Config }]
}>()

const testText = ref('')
const prodText = ref('')
const testState = shallowRef<JsonDocumentState>(evaluateJsonDocument(''))
const prodState = shallowRef<JsonDocumentState>(evaluateJsonDocument(''))

const testFileInput = ref<HTMLInputElement | null>(null)
const prodFileInput = ref<HTMLInputElement | null>(null)

watchDebounced(
  testText,
  (text) => {
    testState.value = evaluateJsonDocument(text)
  },
  { debounce: 200, immediate: true },
)

watchDebounced(
  prodText,
  (text) => {
    prodState.value = evaluateJsonDocument(text)
  },
  { debounce: 200, immediate: true },
)

const canStartDiff = computed(
  () => testState.value.status === 'valid' && prodState.value.status === 'valid',
)

function statusLabel(state: JsonDocumentState): string {
  if (state.status === 'empty') return '空'
  if (state.status === 'valid') return '合法'
  return '非法'
}

function statusDetail(state: JsonDocumentState): string {
  if (state.status !== 'invalid' || !state.errorMessage) return ''
  const parts = [state.errorMessage]
  if (state.errorLine != null && state.errorColumn != null) {
    parts.push(`（行 ${state.errorLine}，列 ${state.errorColumn}）`)
  }
  return parts.join(' ')
}

function statusPillClass(state: JsonDocumentState): string {
  if (state.status === 'valid') return 'ui-status-pill is-valid'
  if (state.status === 'invalid') return 'ui-status-pill is-invalid'
  return 'ui-status-pill is-empty'
}

function clearSide(side: 'test' | 'prod') {
  if (side === 'test') {
    testText.value = ''
    testState.value = evaluateJsonDocument('')
  } else {
    prodText.value = ''
    prodState.value = evaluateJsonDocument('')
  }
}

function formatSide(side: 'test' | 'prod') {
  const current = side === 'test' ? testText.value : prodText.value
  const result = formatJsonDocument(current)
  if (result.ok) {
    if (side === 'test') {
      testText.value = result.text
      testState.value = evaluateJsonDocument(result.text)
    } else {
      prodText.value = result.text
      prodState.value = evaluateJsonDocument(result.text)
    }
    return
  }
  const evaluated = evaluateJsonDocument(current)
  const next: JsonDocumentState = {
    text: evaluated.text,
    status: 'invalid',
    errorMessage: result.message,
    errorLine: evaluated.errorLine,
    errorColumn: evaluated.errorColumn,
  }
  if (side === 'test') {
    testState.value = next
  } else {
    prodState.value = next
  }
}

function importSide(side: 'test' | 'prod') {
  const input = side === 'test' ? testFileInput.value : prodFileInput.value
  input?.click()
}

function onFileSelected(side: 'test' | 'prod', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const content = typeof reader.result === 'string' ? reader.result : ''
    if (side === 'test') {
      testText.value = content
      testState.value = evaluateJsonDocument(content)
    } else {
      prodText.value = content
      prodState.value = evaluateJsonDocument(content)
    }
    input.value = ''
  }
  reader.readAsText(file)
}

function onStartDiff() {
  const nextTest = evaluateJsonDocument(testText.value)
  const nextProd = evaluateJsonDocument(prodText.value)
  testState.value = nextTest
  prodState.value = nextProd

  if (nextTest.status !== 'valid' || nextProd.status !== 'valid') return
  if (nextTest.config === undefined || nextProd.config === undefined) return
  emit('start-diff', { test: nextTest.config, prod: nextProd.config })
}
</script>

<template>
  <div class="flex flex-col gap-5 text-left w-full">
    <div class="grid gap-5 md:grid-cols-2">
      <section class="ui-editor-dock flex flex-col gap-2.5 min-w-0">
        <div class="ui-toolbar">
          <div class="ui-toolbar-actions">
            <button type="button" class="ui-btn ui-btn-soft" @click="importSide('test')">
              <span class="i-lucide-upload" aria-hidden="true" />
              导入
            </button>
            <button type="button" class="ui-btn" @click="formatSide('test')">
              <span class="i-lucide-align-left" aria-hidden="true" />
              格式化
            </button>
            <button type="button" class="ui-btn ui-btn-danger" @click="clearSide('test')">
              <span class="i-lucide-trash-2" aria-hidden="true" />
              清空
            </button>
          </div>
          <span class="ml-auto" :class="statusPillClass(testState)" role="status">
            {{ statusLabel(testState) }}
          </span>
        </div>
        <p v-if="statusDetail(testState)" class="text-xs ui-status-invalid m-0" role="status">
          {{ statusDetail(testState) }}
        </p>
        <input
          ref="testFileInput"
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="onFileSelected('test', $event)"
        />
        <JsonEditor v-model="testText" label="TEST" side="test" />
      </section>

      <section class="ui-editor-dock flex flex-col gap-2.5 min-w-0">
        <div class="ui-toolbar">
          <div class="ui-toolbar-actions">
            <button type="button" class="ui-btn ui-btn-soft" @click="importSide('prod')">
              <span class="i-lucide-upload" aria-hidden="true" />
              导入
            </button>
            <button type="button" class="ui-btn" @click="formatSide('prod')">
              <span class="i-lucide-align-left" aria-hidden="true" />
              格式化
            </button>
            <button type="button" class="ui-btn ui-btn-danger" @click="clearSide('prod')">
              <span class="i-lucide-trash-2" aria-hidden="true" />
              清空
            </button>
          </div>
          <span class="ml-auto" :class="statusPillClass(prodState)" role="status">
            {{ statusLabel(prodState) }}
          </span>
        </div>
        <p v-if="statusDetail(prodState)" class="text-xs ui-status-invalid m-0" role="status">
          {{ statusDetail(prodState) }}
        </p>
        <input
          ref="prodFileInput"
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="onFileSelected('prod', $event)"
        />
        <JsonEditor v-model="prodText" label="PROD" side="prod" />
      </section>
    </div>

    <div class="ui-cta-row">
      <button
        type="button"
        class="ui-btn ui-btn-primary min-w-44"
        :disabled="!canStartDiff"
        @click="onStartDiff"
      >
        <span class="i-lucide-play" aria-hidden="true" />
        开始 Diff
      </button>
      <p v-if="!canStartDiff" class="ui-cta-hint">两侧均合法后可开始</p>
    </div>
  </div>
</template>
