<script setup lang="ts" name="MergeSearchDock">
import type { MergeSide } from '@/stores/mergeWorkspace'

const findText = defineModel<string>('find', { default: '' })
const replaceText = defineModel<string>('replace', { default: '' })
const caseSensitive = defineModel<boolean>('caseSensitive', { default: false })
const regexp = defineModel<boolean>('regexp', { default: false })
const wholeWord = defineModel<boolean>('wholeWord', { default: false })
const side = defineModel<MergeSide>('side', { default: 'right' })

const emit = defineEmits<{
  next: []
  prev: []
  all: []
  replaceOne: []
  replaceAll: []
  close: []
}>()

const findInputRef = ref<HTMLInputElement | null>(null)

defineExpose({
  focusFind: () => findInputRef.value?.focus(),
})

function onFindKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (event.shiftKey) emit('prev')
    else emit('next')
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}
</script>

<template>
  <section class="merge-search-dock" role="search" aria-label="查找与替换">
    <div class="merge-search-dock__sides" role="group" aria-label="查找范围">
      <button
        type="button"
        class="merge-search-dock__side"
        :class="{ 'is-active': side === 'left' }"
        @click="side = 'left'"
      >
        参考
      </button>
      <button
        type="button"
        class="merge-search-dock__side"
        :class="{ 'is-active': side === 'right' }"
        @click="side = 'right'"
      >
        目标
      </button>
    </div>

    <label class="merge-search-dock__field">
      <span>查找</span>
      <input
        ref="findInputRef"
        v-model="findText"
        type="text"
        name="find"
        @keydown="onFindKeydown"
      />
    </label>
    <label class="merge-search-dock__field">
      <span>替换</span>
      <input v-model="replaceText" type="text" name="replace" @keydown="onFindKeydown" />
    </label>

    <div class="merge-search-dock__actions">
      <button type="button" class="ui-btn ui-btn-soft" @click="emit('next')">下一个</button>
      <button type="button" class="ui-btn" @click="emit('prev')">上一个</button>
      <button type="button" class="ui-btn" @click="emit('all')">全部</button>
      <button type="button" class="ui-btn" @click="emit('replaceOne')">替换</button>
      <button type="button" class="ui-btn" @click="emit('replaceAll')">全部替换</button>
    </div>

    <div class="merge-search-dock__flags">
      <label><input v-model="caseSensitive" type="checkbox" /> 区分大小写</label>
      <label><input v-model="regexp" type="checkbox" /> 正则</label>
      <label><input v-model="wholeWord" type="checkbox" /> 全词</label>
    </div>

    <button
      type="button"
      class="ui-btn ui-btn-icon merge-search-dock__close"
      aria-label="关闭查找"
      @click="emit('close')"
    >
      <span class="i-lucide-x" aria-hidden="true" />
    </button>
  </section>
</template>

<style scoped lang="scss">
.merge-search-dock {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.55rem;
  width: 100%;
  padding: 0.4rem 0.65rem;
  border: 0;
  background: transparent;
}

.merge-search-dock__sides {
  display: flex;
  padding: 0.12rem;
  border-radius: var(--radius-sm);
  background: var(--code-bg);
}

.merge-search-dock__side {
  padding: 0.15rem 0.45rem;
  border: 0;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.merge-search-dock__side.is-active {
  background: var(--surface);
  color: var(--text-h);
  box-shadow: var(--shadow-sm);
}

.merge-search-dock__field {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 11rem;
  flex: 1 1 11rem;
  font-size: 0.75rem;
  color: var(--muted);
}

.merge-search-dock__field input {
  min-width: 0;
  flex: 1;
  padding: 0.28rem 0.45rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--code-bg);
  color: var(--text-h);
  font: inherit;
  font-size: 0.8125rem;
}

.merge-search-dock__field input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.merge-search-dock__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.merge-search-dock__actions .ui-btn {
  padding: 0.28rem 0.5rem;
  font-size: 0.75rem;
}

.merge-search-dock__flags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.75rem;
  font-size: 0.75rem;
  color: var(--text);
}

.merge-search-dock__flags label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.merge-search-dock__close {
  margin-left: auto;
}
</style>
