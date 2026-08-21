<script setup lang="ts" name="ChunkJumpList">
import ChunkJumpTreeNode from '@/components/ChunkJumpTreeNode.vue'
import { chunkKindMarker, chunkKindShortName, type ChunkKind } from '@/composables/chunkKind'
import { type ConfigItemGroup } from '@/composables/configItemDiff'
import {
  directoryKindFilterEmptyText,
  filterConfigItemGroups,
  filterJumpItems,
  type DirectoryKindFilter,
} from '@/composables/directoryKindFilter'
import { foldDirectoryGroups } from '@/composables/directoryPathTree'
import type { JsonPathSeg } from '@/composables/jsonPathOffset'

const props = withDefaults(
  defineProps<{
    items: { kind: ChunkKind; preview: string; index: number }[]
    groups?: ConfigItemGroup[]
    expandedIds?: readonly string[]
    fieldSummaryText?: string
  }>(),
  {
    groups: () => [],
    expandedIds: () => [],
    fieldSummaryText: '',
  },
)

const emit = defineEmits<{
  jump: [index: number]
  jumpGroup: [id: string]
  jumpField: [path: JsonPathSeg[]]
  toggleGroup: [id: string]
}>()

const showGrouped = computed(() => (props.groups?.length ?? 0) > 0)
const kindFilter = ref<DirectoryKindFilter>('all')
const visibleGroups = computed(() => filterConfigItemGroups(props.groups, kindFilter.value))
const visibleTree = computed(() => foldDirectoryGroups(visibleGroups.value))
const visibleItems = computed(() => filterJumpItems(props.items, kindFilter.value))

watch([() => props.groups, () => props.items], () => {
  kindFilter.value = 'all'
})
</script>

<template>
  <nav class="chunk-jump-list" aria-label="差异块目录">
    <div class="chunk-jump-list__filters" role="group" aria-labelledby="chunk-jump-filter-label">
      <span id="chunk-jump-filter-label" class="chunk-jump-list__filters-label">
        <span class="i-lucide-list-filter" aria-hidden="true" />
        筛选
      </span>
      <button
        type="button"
        class="chunk-jump-list__filter"
        :class="{ 'is-active': kindFilter === 'all' }"
        aria-label="显示全部差异"
        :aria-pressed="kindFilter === 'all'"
        @click="kindFilter = 'all'"
      >
        全部
      </button>
      <button
        v-for="kind in ['added', 'removed', 'modified'] as const"
        :key="kind"
        type="button"
        class="chunk-jump-list__filter"
        :class="{ 'is-active': kindFilter === kind }"
        :data-kind="kind"
        :aria-label="`只看${chunkKindShortName[kind]}`"
        :aria-pressed="kindFilter === kind"
        @click="kindFilter = kind"
      >
        <span class="chunk-jump-list__kind" :data-kind="kind" aria-hidden="true">{{
          chunkKindMarker[kind]
        }}</span>
        {{ chunkKindShortName[kind] }}
      </button>
    </div>
    <template v-if="showGrouped">
      <p v-if="fieldSummaryText" class="chunk-jump-list__summary">{{ fieldSummaryText }}</p>
      <ChunkJumpTreeNode
        v-for="node in visibleTree"
        :key="node.id"
        :node="node"
        :depth="0"
        :expanded-ids="expandedIds"
        @jump-group="emit('jumpGroup', $event)"
        @jump-field="emit('jumpField', $event)"
        @toggle-group="emit('toggleGroup', $event)"
      />
      <div v-if="visibleTree.length === 0" class="chunk-jump-list__empty">
        <p>{{ directoryKindFilterEmptyText(kindFilter) }}</p>
        <button
          v-if="kindFilter !== 'all'"
          type="button"
          class="chunk-jump-list__show-all"
          @click="kindFilter = 'all'"
        >
          显示全部
        </button>
      </div>
    </template>
    <template v-else>
      <button
        v-for="item in visibleItems"
        :key="item.index"
        type="button"
        class="chunk-jump-list__row"
        @click="emit('jump', item.index)"
      >
        <span
          class="chunk-jump-list__kind"
          :data-kind="item.kind"
          :title="chunkKindShortName[item.kind]"
          >{{ chunkKindMarker[item.kind] }}</span
        >
        <span class="chunk-jump-list__preview" :title="item.preview">{{ item.preview }}</span>
      </button>
      <div v-if="visibleItems.length === 0" class="chunk-jump-list__empty">
        <p>{{ directoryKindFilterEmptyText(kindFilter) }}</p>
        <button
          v-if="kindFilter !== 'all'"
          type="button"
          class="chunk-jump-list__show-all"
          @click="kindFilter = 'all'"
        >
          显示全部
        </button>
      </div>
    </template>
  </nav>
</template>

<style scoped lang="scss">
.chunk-jump-list {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
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
  padding: 0.35rem 0.45rem;
  color: var(--muted);
  font-size: 0.75rem;
  line-height: 1.35;
}

.chunk-jump-list__empty p {
  margin: 0;
}

.chunk-jump-list__filters {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem;
  padding: 0.32rem 0.4rem 0.36rem;
  border-bottom: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--code-bg) 88%, var(--surface));
}

.chunk-jump-list__filters-label {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  width: 100%;
  margin-bottom: 0.04rem;
  color: var(--text-h);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.3;
}

.chunk-jump-list__filters-label [class^='i-lucide-'] {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
}

.chunk-jump-list__filter,
.chunk-jump-list__show-all {
  margin: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xs);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.chunk-jump-list__filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.18rem;
  min-width: 0;
  padding: 0.16rem 0.38rem;
  font-size: 0.72rem;
  line-height: 1.3;
  white-space: nowrap;
}

.chunk-jump-list__filter:hover,
.chunk-jump-list__show-all:hover {
  background: color-mix(in srgb, var(--border-subtle) 65%, transparent);
}

.chunk-jump-list__filter.is-active {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border-subtle));
  background: var(--accent-muted);
  color: var(--text-h);
}

.chunk-jump-list__filter:focus-visible,
.chunk-jump-list__show-all:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.chunk-jump-list__show-all {
  margin-top: 0.28rem;
  padding: 0.12rem 0.28rem;
  color: var(--accent);
  font-size: 0.72rem;
}

.chunk-jump-list__summary {
  margin: 0;
  padding: 0.28rem 0.45rem 0.22rem;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.35;
}

.chunk-jump-list__row {
  margin: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  width: 100%;
  padding: 0.18rem 0.4rem;
}

.chunk-jump-list__row:hover {
  background: color-mix(in srgb, var(--border-subtle) 65%, transparent);
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
