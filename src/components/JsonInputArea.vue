<script setup lang="ts" name="JsonInputArea">
import type { Config } from '@/core/types'
import { evaluateJsonDocument, type JsonDocumentState } from '@/composables/useJsonDocument'

const emit = defineEmits<{
  'start-diff': [payload: { test: Config; prod: Config }]
}>()

type Side = 'test' | 'prod'

const testText = ref('')
const prodText = ref('')
const testFileName = ref('')
const prodFileName = ref('')
const testState = shallowRef<JsonDocumentState>(evaluateJsonDocument(''))
const prodState = shallowRef<JsonDocumentState>(evaluateJsonDocument(''))

const testFileInput = ref<HTMLInputElement | null>(null)
const prodFileInput = ref<HTMLInputElement | null>(null)

/** 拖拽进入计数，避免子元素触发反复闪烁 */
const testDragDepth = ref(0)
const prodDragDepth = ref(0)

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

function applyContent(side: Side, content: string, fileName: string) {
  if (side === 'test') {
    testText.value = content
    testFileName.value = fileName
    testState.value = evaluateJsonDocument(content)
  } else {
    prodText.value = content
    prodFileName.value = fileName
    prodState.value = evaluateJsonDocument(content)
  }
}

function clearSide(side: Side) {
  applyContent(side, '', '')
}

function importSide(side: Side) {
  const input = side === 'test' ? testFileInput.value : prodFileInput.value
  input?.click()
}

function readFile(side: Side, file: File) {
  const reader = new FileReader()
  reader.onload = () => {
    const content = typeof reader.result === 'string' ? reader.result : ''
    applyContent(side, content, file.name)
  }
  reader.onerror = () => {
    const next: JsonDocumentState = {
      text: '',
      status: 'invalid',
      errorMessage: '读取文件失败，请重试',
    }
    if (side === 'test') {
      testText.value = ''
      testFileName.value = file.name
      testState.value = next
    } else {
      prodText.value = ''
      prodFileName.value = file.name
      prodState.value = next
    }
  }
  reader.readAsText(file)
}

function pickJsonFile(fileList: FileList | null | undefined): File | null {
  if (!fileList || fileList.length === 0) return null
  const files = Array.from(fileList)
  const jsonLike = files.find(
    (file) =>
      file.type === 'application/json' ||
      file.name.toLowerCase().endsWith('.json') ||
      file.type === '' ||
      file.type === 'text/plain',
  )
  return jsonLike ?? files[0] ?? null
}

function onFileSelected(side: Side, event: Event) {
  const input = event.target as HTMLInputElement
  const file = pickJsonFile(input.files)
  if (file) readFile(side, file)
  input.value = ''
}

function onDragEnter(side: Side, event: DragEvent) {
  event.preventDefault()
  if (side === 'test') testDragDepth.value += 1
  else prodDragDepth.value += 1
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function onDragLeave(side: Side, event: DragEvent) {
  event.preventDefault()
  if (side === 'test') testDragDepth.value = Math.max(0, testDragDepth.value - 1)
  else prodDragDepth.value = Math.max(0, prodDragDepth.value - 1)
}

function onDrop(side: Side, event: DragEvent) {
  event.preventDefault()
  if (side === 'test') testDragDepth.value = 0
  else prodDragDepth.value = 0

  const file = pickJsonFile(event.dataTransfer?.files)
  if (!file) {
    const hasContent = (side === 'test' ? testText.value : prodText.value).trim().length > 0
    if (!hasContent) {
      const next: JsonDocumentState = {
        text: '',
        status: 'invalid',
        errorMessage: '请拖入 JSON 文件',
      }
      if (side === 'test') testState.value = next
      else prodState.value = next
    }
    return
  }
  readFile(side, file)
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
  <div class="flex flex-col gap-4 text-left w-full">
    <div class="grid gap-4 md:grid-cols-2">
      <section
        class="ui-dropzone"
        :class="{
          'is-dragging': testDragDepth > 0,
          'is-valid': testState.status === 'valid',
          'is-invalid': testState.status === 'invalid',
        }"
        @dragenter="onDragEnter('test', $event)"
        @dragover="onDragOver"
        @dragleave="onDragLeave('test', $event)"
        @drop="onDrop('test', $event)"
      >
        <div class="ui-dropzone__head">
          <span class="ui-label-test">TEST</span>
          <span :class="statusPillClass(testState)" role="status">
            {{ statusLabel(testState) }}
          </span>
        </div>

        <button
          type="button"
          class="ui-dropzone__body"
          aria-label="导入 TEST JSON 文件"
          @click="importSide('test')"
        >
          <span class="i-lucide-upload-cloud ui-dropzone__icon" aria-hidden="true" />
          <template v-if="testFileName">
            <span class="ui-dropzone__file">{{ testFileName }}</span>
            <span class="ui-dropzone__hint">点击更换，或拖入新的 JSON 文件</span>
          </template>
          <template v-else>
            <span class="ui-dropzone__title">拖入 JSON 文件</span>
            <span class="ui-dropzone__hint">或点击选择 `.json` 文件</span>
          </template>
        </button>

        <p
          v-if="statusDetail(testState)"
          class="ui-dropzone__error ui-status-invalid"
          role="status"
        >
          {{ statusDetail(testState) }}
        </p>

        <div class="ui-dropzone__actions">
          <button type="button" class="ui-btn ui-btn-soft" @click="importSide('test')">
            <span class="i-lucide-upload" aria-hidden="true" />
            选择文件
          </button>
          <button
            type="button"
            class="ui-btn ui-btn-danger"
            :disabled="testState.status === 'empty' && !testFileName"
            @click="clearSide('test')"
          >
            <span class="i-lucide-trash-2" aria-hidden="true" />
            清空
          </button>
        </div>

        <input
          ref="testFileInput"
          type="file"
          accept=".json,application/json,text/plain"
          class="hidden"
          @change="onFileSelected('test', $event)"
        />
      </section>

      <section
        class="ui-dropzone"
        :class="{
          'is-dragging': prodDragDepth > 0,
          'is-valid': prodState.status === 'valid',
          'is-invalid': prodState.status === 'invalid',
        }"
        @dragenter="onDragEnter('prod', $event)"
        @dragover="onDragOver"
        @dragleave="onDragLeave('prod', $event)"
        @drop="onDrop('prod', $event)"
      >
        <div class="ui-dropzone__head">
          <span class="ui-label-prod">PROD</span>
          <span :class="statusPillClass(prodState)" role="status">
            {{ statusLabel(prodState) }}
          </span>
        </div>

        <button
          type="button"
          class="ui-dropzone__body"
          aria-label="导入 PROD JSON 文件"
          @click="importSide('prod')"
        >
          <span class="i-lucide-upload-cloud ui-dropzone__icon" aria-hidden="true" />
          <template v-if="prodFileName">
            <span class="ui-dropzone__file">{{ prodFileName }}</span>
            <span class="ui-dropzone__hint">点击更换，或拖入新的 JSON 文件</span>
          </template>
          <template v-else>
            <span class="ui-dropzone__title">拖入 JSON 文件</span>
            <span class="ui-dropzone__hint">或点击选择 `.json` 文件</span>
          </template>
        </button>

        <p
          v-if="statusDetail(prodState)"
          class="ui-dropzone__error ui-status-invalid"
          role="status"
        >
          {{ statusDetail(prodState) }}
        </p>

        <div class="ui-dropzone__actions">
          <button type="button" class="ui-btn ui-btn-soft" @click="importSide('prod')">
            <span class="i-lucide-upload" aria-hidden="true" />
            选择文件
          </button>
          <button
            type="button"
            class="ui-btn ui-btn-danger"
            :disabled="prodState.status === 'empty' && !prodFileName"
            @click="clearSide('prod')"
          >
            <span class="i-lucide-trash-2" aria-hidden="true" />
            清空
          </button>
        </div>

        <input
          ref="prodFileInput"
          type="file"
          accept=".json,application/json,text/plain"
          class="hidden"
          @change="onFileSelected('prod', $event)"
        />
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
      <p v-if="!canStartDiff" class="ui-cta-hint">两侧均导入合法 JSON 后可开始</p>
    </div>
  </div>
</template>
