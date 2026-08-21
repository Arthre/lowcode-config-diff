<script setup lang="ts" name="ChunkJumpList">
import { chunkKindMarker, chunkKindShortName, type ChunkKind } from '@/composables/chunkKind'
import { type ConfigFieldChange, type ConfigItemGroup } from '@/composables/configItemDiff'
import {
  directoryKindFilterEmptyText,
  filterConfigItemGroups,
  filterJumpItems,
  type DirectoryKindFilter,
} from '@/composables/directoryKindFilter'
import {
  firstDirectoryLeafId,
  foldDirectoryGroups,
  type DirectoryTreeNode,
} from '@/composables/directoryPathTree'
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

function isGroupExpanded(id: string): boolean {
  return props.expandedIds.includes(id)
}

function onNodeTitleClick(node: DirectoryTreeNode) {
  const leafId = firstDirectoryLeafId(node)
  if (leafId !== '') emit('jumpGroup', leafId)
}

function fieldValueText(field: ConfigFieldChange): string {
  if (field.kind === 'added') return field.rightText
  if (field.kind === 'removed') return field.leftText
  return `${field.leftText} → ${field.rightText}`
}
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
      <div v-for="node in visibleTree" :key="node.id" class="chunk-jump-list__group">
        <div class="chunk-jump-list__group-head">
          <button
            type="button"
            class="chunk-jump-list__toggle"
            :aria-expanded="isGroupExpanded(node.id)"
            :aria-label="isGroupExpanded(node.id) ? `折叠 ${node.label}` : `展开 ${node.label}`"
            @click.stop="emit('toggleGroup', node.id)"
          >
            <span
              class="i-lucide-chevron-right chunk-jump-list__chevron"
              :class="{ 'is-open': isGroupExpanded(node.id) }"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            class="chunk-jump-list__group-title"
            @click="onNodeTitleClick(node)"
          >
            <span
              class="chunk-jump-list__kind"
              :data-kind="node.kind"
              :title="chunkKindShortName[node.kind]"
              >{{ chunkKindMarker[node.kind] }}</span
            >
            <span class="chunk-jump-list__id" :title="node.label">{{ node.label }}</span>
            <span class="chunk-jump-list__count">{{ node.changeCount }}</span>
          </button>
        </div>
        <template v-if="isGroupExpanded(node.id)">
          <div
            v-for="child in node.children"
            :key="child.id"
            class="chunk-jump-list__group chunk-jump-list__group--nested"
          >
            <div class="chunk-jump-list__group-head">
              <button
                type="button"
                class="chunk-jump-list__toggle"
                :aria-expanded="isGroupExpanded(child.id)"
                :aria-label="
                  isGroupExpanded(child.id) ? `折叠 ${child.label}` : `展开 ${child.label}`
                "
                @click.stop="emit('toggleGroup', child.id)"
              >
                <span
                  class="i-lucide-chevron-right chunk-jump-list__chevron"
                  :class="{ 'is-open': isGroupExpanded(child.id) }"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                class="chunk-jump-list__group-title"
                @click="onNodeTitleClick(child)"
              >
                <span
                  class="chunk-jump-list__kind"
                  :data-kind="child.kind"
                  :title="chunkKindShortName[child.kind]"
                  >{{ chunkKindMarker[child.kind] }}</span
                >
                <span class="chunk-jump-list__id" :title="child.label">{{ child.label }}</span>
                <span class="chunk-jump-list__count">{{ child.changeCount }}</span>
              </button>
            </div>
            <div v-if="isGroupExpanded(child.id) && child.group" class="chunk-jump-list__fields">
              <button
                v-for="(field, fieldIndex) in child.group.fields"
                :key="`${child.id}:${fieldIndex}`"
                type="button"
                class="chunk-jump-list__field chunk-jump-list__field--nested"
                :aria-label="`${chunkKindShortName[field.kind]} ${field.relativeLabel}`"
                @click="emit('jumpField', field.path)"
              >
                <span
                  class="chunk-jump-list__kind"
                  :data-kind="field.kind"
                  :title="chunkKindShortName[field.kind]"
                  >{{ chunkKindMarker[field.kind] }}</span
                >
                <span class="chunk-jump-list__field-label" :title="field.relativeLabel">{{
                  field.relativeLabel
                }}</span>
                <span
                  class="chunk-jump-list__field-value"
                  :data-kind="field.kind"
                  :title="fieldValueText(field)"
                  >{{ fieldValueText(field) }}</span
                >
              </button>
            </div>
          </div>
          <div v-if="node.group" class="chunk-jump-list__fields">
            <button
              v-for="(field, fieldIndex) in node.group.fields"
              :key="`${node.id}:${fieldIndex}`"
              type="button"
              class="chunk-jump-list__field"
              :aria-label="`${chunkKindShortName[field.kind]} ${field.relativeLabel}`"
              @click="emit('jumpField', field.path)"
            >
              <span
                class="chunk-jump-list__kind"
                :data-kind="field.kind"
                :title="chunkKindShortName[field.kind]"
                >{{ chunkKindMarker[field.kind] }}</span
              >
              <span class="chunk-jump-list__field-label" :title="field.relativeLabel">{{
                field.relativeLabel
              }}</span>
              <span
                class="chunk-jump-list__field-value"
                :data-kind="field.kind"
                :title="fieldValueText(field)"
                >{{ fieldValueText(field) }}</span
              >
            </button>
          </div>
        </template>
      </div>
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

.chunk-jump-list__row:hover,
.chunk-jump-list__group-head .chunk-jump-list__group-title:hover,
.chunk-jump-list__field:hover,
.chunk-jump-list__toggle:hover {
  background: color-mix(in srgb, var(--border-subtle) 65%, transparent);
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
  align-items: baseline;
  gap: 0 0.28rem;
  min-width: 0;
  padding: 0.16rem 0.4rem 0.16rem 0.05rem;
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
  flex-shrink: 0;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.3;
}

.chunk-jump-list__group--nested {
  padding-left: 0.7rem;
}

.chunk-jump-list__field {
  display: flex;
  align-items: baseline;
  gap: 0.28rem;
  width: 100%;
  padding: 0.14rem 0.4rem 0.14rem 1.25rem;
}

.chunk-jump-list__field--nested {
  padding-left: 1.85rem;
}

.chunk-jump-list__field-label {
  flex-shrink: 0;
  max-width: 7rem;
  overflow: hidden;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
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
