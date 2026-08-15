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
  if (state.status === 'valid') return 'Valid'
  return 'Invalid'
}

function statusDetail(state: JsonDocumentState): string {
  if (state.status !== 'invalid' || !state.errorMessage) return ''
  const parts = [state.errorMessage]
  if (state.errorLine != null && state.errorColumn != null) {
    parts.push(`（行 ${state.errorLine}，列 ${state.errorColumn}）`)
  }
  return parts.join(' ')
}

function statusClass(state: JsonDocumentState): string {
  if (state.status === 'valid') return 'text-green-600 dark:text-green-400'
  if (state.status === 'invalid') return 'text-red-600 dark:text-red-400'
  return 'text-[var(--text)]'
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
  // 格式化失败：保持原文，立即显示 Invalid
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
  // 点击时强制同步校验，避免 debounce 窗口内改坏 JSON 仍 emit 旧 Config
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
  <div class="flex flex-col gap-4 text-left w-full">
    <div class="grid gap-4 md:grid-cols-2">
      <!-- TEST -->
      <section class="flex flex-col gap-2 min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] hover:bg-[var(--code-bg)]"
            @click="importSide('test')"
          >
            导入
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] hover:bg-[var(--code-bg)]"
            @click="formatSide('test')"
          >
            格式化
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] hover:bg-[var(--code-bg)]"
            @click="clearSide('test')"
          >
            清空
          </button>
          <span class="text-sm font-medium" :class="statusClass(testState)">
            {{ statusLabel(testState) }}
          </span>
        </div>
        <p v-if="statusDetail(testState)" class="text-xs text-red-600 dark:text-red-400 m-0">
          {{ statusDetail(testState) }}
        </p>
        <input
          ref="testFileInput"
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="onFileSelected('test', $event)"
        />
        <JsonEditor v-model="testText" label="TEST" />
      </section>

      <!-- PROD -->
      <section class="flex flex-col gap-2 min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] hover:bg-[var(--code-bg)]"
            @click="importSide('prod')"
          >
            导入
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] hover:bg-[var(--code-bg)]"
            @click="formatSide('prod')"
          >
            格式化
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] hover:bg-[var(--code-bg)]"
            @click="clearSide('prod')"
          >
            清空
          </button>
          <span class="text-sm font-medium" :class="statusClass(prodState)">
            {{ statusLabel(prodState) }}
          </span>
        </div>
        <p v-if="statusDetail(prodState)" class="text-xs text-red-600 dark:text-red-400 m-0">
          {{ statusDetail(prodState) }}
        </p>
        <input
          ref="prodFileInput"
          type="file"
          accept=".json,application/json"
          class="hidden"
          @change="onFileSelected('prod', $event)"
        />
        <JsonEditor v-model="prodText" label="PROD" />
      </section>
    </div>

    <div class="flex justify-center">
      <button
        type="button"
        class="px-5 py-2 text-sm rounded font-medium transition-opacity"
        :class="
          canStartDiff
            ? 'bg-[var(--accent)] text-white hover:opacity-90'
            : 'bg-[var(--border)] text-[var(--text)] opacity-60 cursor-not-allowed'
        "
        :disabled="!canStartDiff"
        @click="onStartDiff"
      >
        开始 Diff
      </button>
    </div>
  </div>
</template>
