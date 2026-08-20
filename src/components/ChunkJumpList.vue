<script setup lang="ts" name="ChunkJumpList">
import type { ChunkKind } from '@/composables/chunkKind'
import type { ConfigFieldChange, ConfigItemGroup } from '@/composables/configItemDiff'
import type { JsonPathSeg } from '@/composables/jsonPathOffset'

const chunkKindShortName: Record<ChunkKind, string> = {
  added: '新增',
  removed: '删除',
  modified: '修改',
}

const props = withDefaults(
  defineProps<{
    items: { kind: ChunkKind; preview: string; index: number }[]
    /** 0 起；无当前块为 -1 */
    activeIndex: number
    groups?: ConfigItemGroup[]
    activeGroupId?: string
    expandedIds?: readonly string[]
  }>(),
  {
    groups: () => [],
    activeGroupId: '',
    expandedIds: () => [],
  },
)

const emit = defineEmits<{
  jump: [index: number]
  jumpGroup: [id: string]
  jumpField: [path: JsonPathSeg[]]
  toggleGroup: [id: string]
}>()

const showGrouped = computed(() => (props.groups?.length ?? 0) > 0)

function isGroupExpanded(id: string): boolean {
  return props.expandedIds.includes(id)
}

function fieldValueText(field: ConfigFieldChange): string {
  if (field.kind === 'added') return field.rightText
  if (field.kind === 'removed') return field.leftText
  return `${field.leftText} → ${field.rightText}`
}
</script>

<template>
  <nav class="chunk-jump-list" aria-label="差异块目录">
    <template v-if="showGrouped">
      <div v-for="group in props.groups" :key="group.id" class="chunk-jump-list__group">
        <div
          class="chunk-jump-list__group-head"
          :class="{ 'is-current': group.id === props.activeGroupId }"
        >
          <button
            type="button"
            class="chunk-jump-list__toggle"
            :aria-expanded="isGroupExpanded(group.id)"
            :aria-label="isGroupExpanded(group.id) ? `折叠 ${group.id}` : `展开 ${group.id}`"
            @click.stop="emit('toggleGroup', group.id)"
          >
            <span
              class="i-lucide-chevron-right chunk-jump-list__chevron"
              :class="{ 'is-open': isGroupExpanded(group.id) }"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            class="chunk-jump-list__group-title"
            :aria-current="group.id === props.activeGroupId ? true : undefined"
            @click="emit('jumpGroup', group.id)"
          >
            <span class="chunk-jump-list__kind" :data-kind="group.kind">{{
              chunkKindShortName[group.kind]
            }}</span>
            <span class="chunk-jump-list__dot" aria-hidden="true">·</span>
            <span class="chunk-jump-list__id">{{ group.id }}</span>
            <span class="chunk-jump-list__count">{{ group.changeCount }} 项变化</span>
          </button>
        </div>
        <div v-if="isGroupExpanded(group.id)" class="chunk-jump-list__fields">
          <button
            v-for="(field, fieldIndex) in group.fields"
            :key="`${group.id}:${fieldIndex}`"
            type="button"
            class="chunk-jump-list__field"
            @click="emit('jumpField', field.path)"
          >
            <span class="chunk-jump-list__field-label">{{ field.relativeLabel }}</span>
            <span class="chunk-jump-list__field-value" :data-kind="field.kind">{{
              fieldValueText(field)
            }}</span>
          </button>
        </div>
      </div>
    </template>
    <template v-else>
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
    </template>
  </nav>
</template>

<style scoped lang="scss">
.chunk-jump-list {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-self: stretch;
  width: 16rem;
  min-width: 16rem;
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

.chunk-jump-list__row,
.chunk-jump-list__toggle,
.chunk-jump-list__group-title,
.chunk-jump-list__field {
  margin: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.chunk-jump-list__row {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  width: 100%;
  padding: 0.18rem 0.4rem;
}

.chunk-jump-list__row:hover:not(.is-current),
.chunk-jump-list__group-head:not(.is-current) .chunk-jump-list__group-title:hover,
.chunk-jump-list__field:hover,
.chunk-jump-list__toggle:hover {
  background: color-mix(in srgb, var(--border-subtle) 65%, transparent);
}

.chunk-jump-list__row.is-current,
.chunk-jump-list__group-head.is-current {
  background: var(--accent-muted);
}

.chunk-jump-list__row:focus-visible,
.chunk-jump-list__toggle:focus-visible,
.chunk-jump-list__group-title:focus-visible,
.chunk-jump-list__field:focus-visible {
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

.chunk-jump-list__group-head {
  display: flex;
  align-items: flex-start;
  gap: 0.05rem;
}

.chunk-jump-list__toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.35rem;
  padding: 0;
  color: var(--muted);
}

.chunk-jump-list__chevron {
  width: 0.75rem;
  height: 0.75rem;
  transition: transform 150ms ease-out;
}

.chunk-jump-list__chevron.is-open {
  transform: rotate(90deg);
}

.chunk-jump-list__group-title {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.28rem;
  min-width: 0;
  padding: 0.16rem 0.4rem 0.16rem 0.05rem;
}

.chunk-jump-list__dot {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.3;
}

.chunk-jump-list__id {
  min-width: 0;
  overflow: hidden;
  color: var(--text);
  font-family: var(--mono);
  font-size: 0.75rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-jump-list__count {
  flex-basis: 100%;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.3;
}

.chunk-jump-list__field {
  display: flex;
  flex-direction: column;
  gap: 0.04rem;
  width: 100%;
  padding: 0.14rem 0.4rem 0.14rem 1.25rem;
}

.chunk-jump-list__field-label {
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.3;
}

.chunk-jump-list__field-value {
  min-width: 0;
  overflow: hidden;
  color: var(--text);
  font-family: var(--mono);
  font-size: 0.75rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-jump-list__field-value[data-kind='added'] {
  color: var(--diff-added);
}

.chunk-jump-list__field-value[data-kind='removed'] {
  color: var(--diff-removed);
}
</style>
