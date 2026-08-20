<script setup lang="ts" name="ChunkJumpList">
import type { ChunkKind } from '@/composables/chunkKind'

const chunkKindShortName: Record<ChunkKind, string> = {
  added: '新增',
  removed: '删除',
  modified: '修改',
}

const props = defineProps<{
  items: { kind: ChunkKind; preview: string; index: number }[]
  /** 0 起；无当前块为 -1 */
  activeIndex: number
}>()

const emit = defineEmits<{
  jump: [index: number]
}>()
</script>

<template>
  <nav class="chunk-jump-list" aria-label="差异块目录">
    <p v-if="props.items.length === 0" class="chunk-jump-list__empty">没有差异块</p>
    <button
      v-for="item in props.items"
      :key="item.index"
      type="button"
      class="chunk-jump-list__row"
      :class="{ 'is-current': item.index === props.activeIndex }"
      :aria-current="item.index === props.activeIndex ? true : undefined"
      @click="emit('jump', item.index)"
    >
      <span class="chunk-jump-list__kind" :data-kind="item.kind">{{
        chunkKindShortName[item.kind]
      }}</span>
      <span class="chunk-jump-list__preview">{{ item.preview }}</span>
    </button>
  </nav>
</template>

<style scoped lang="scss">
.chunk-jump-list {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-self: stretch;
  width: 13rem;
  min-width: 13rem;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--code-bg) 88%, var(--surface));
}

.chunk-jump-list__empty {
  margin: 0;
  padding: 0.35rem 0.45rem;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.35;
}

.chunk-jump-list__row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  width: 100%;
  margin: 0;
  padding: 0.18rem 0.4rem;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.chunk-jump-list__row:hover:not(.is-current) {
  background: color-mix(in srgb, var(--border-subtle) 65%, transparent);
}

.chunk-jump-list__row.is-current {
  background: var(--accent-muted);
}

.chunk-jump-list__row:focus-visible {
  z-index: 1;
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.chunk-jump-list__kind {
  flex-shrink: 0;
  font-size: 0.72rem;
  line-height: 1.3;
}

.chunk-jump-list__kind[data-kind='added'] {
  color: var(--diff-added);
}

.chunk-jump-list__kind[data-kind='removed'] {
  color: var(--diff-removed);
}

.chunk-jump-list__kind[data-kind='modified'] {
  color: var(--diff-modified);
}

.chunk-jump-list__preview {
  min-width: 0;
  overflow: hidden;
  color: var(--text);
  font-family: var(--mono);
  font-size: 0.75rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
