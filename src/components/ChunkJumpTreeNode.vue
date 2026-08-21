<script setup lang="ts" name="ChunkJumpTreeNode">
import { chunkKindMarker, chunkKindShortName } from '@/composables/chunkKind'
import { type ConfigFieldChange } from '@/composables/configItemDiff'
import { firstDirectoryLeafId, type DirectoryTreeNode } from '@/composables/directoryPathTree'
import type { JsonPathSeg } from '@/composables/jsonPathOffset'

const props = defineProps<{
  node: DirectoryTreeNode
  depth: number
  expandedIds: readonly string[]
}>()

const emit = defineEmits<{
  jumpGroup: [id: string]
  jumpField: [path: JsonPathSeg[]]
  toggleGroup: [id: string]
}>()

const expanded = computed(() => props.expandedIds.includes(props.node.id))

function onTitleClick() {
  const leafId = firstDirectoryLeafId(props.node)
  if (leafId !== '') emit('jumpGroup', leafId)
}

function fieldValueText(field: ConfigFieldChange): string {
  if (field.kind === 'added') return field.rightText
  if (field.kind === 'removed') return field.leftText
  return `${field.leftText} → ${field.rightText}`
}
</script>

<template>
  <div class="chunk-jump-tree-node" :class="{ 'chunk-jump-tree-node--nested': depth > 0 }">
    <div class="chunk-jump-tree-node__head">
      <button
        type="button"
        class="chunk-jump-tree-node__toggle"
        :aria-expanded="expanded"
        :aria-label="expanded ? `折叠 ${node.label}` : `展开 ${node.label}`"
        @click.stop="emit('toggleGroup', node.id)"
      >
        <span
          class="i-lucide-chevron-right chunk-jump-tree-node__chevron"
          :class="{ 'is-open': expanded }"
          aria-hidden="true"
        />
      </button>
      <button type="button" class="chunk-jump-tree-node__title" @click="onTitleClick">
        <span
          class="chunk-jump-tree-node__kind"
          :data-kind="node.kind"
          :title="chunkKindShortName[node.kind]"
          >{{ chunkKindMarker[node.kind] }}</span
        >
        <span class="chunk-jump-tree-node__id" :title="node.label">{{ node.label }}</span>
        <span class="chunk-jump-tree-node__count">{{ node.changeCount }}</span>
      </button>
    </div>
    <template v-if="expanded">
      <ChunkJumpTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :expanded-ids="expandedIds"
        @jump-group="emit('jumpGroup', $event)"
        @jump-field="emit('jumpField', $event)"
        @toggle-group="emit('toggleGroup', $event)"
      />
      <div v-if="node.group" class="chunk-jump-tree-node__fields">
        <button
          v-for="(field, fieldIndex) in node.group.fields"
          :key="`${node.id}:${fieldIndex}`"
          type="button"
          class="chunk-jump-tree-node__field"
          :aria-label="`${chunkKindShortName[field.kind]} ${field.relativeLabel}`"
          @click="emit('jumpField', field.path)"
        >
          <span
            class="chunk-jump-tree-node__kind"
            :data-kind="field.kind"
            :title="chunkKindShortName[field.kind]"
            >{{ chunkKindMarker[field.kind] }}</span
          >
          <span class="chunk-jump-tree-node__field-label" :title="field.relativeLabel">{{
            field.relativeLabel
          }}</span>
          <span
            class="chunk-jump-tree-node__field-value"
            :data-kind="field.kind"
            :title="fieldValueText(field)"
            >{{ fieldValueText(field) }}</span
          >
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.chunk-jump-tree-node--nested {
  padding-left: 0.7rem;
}

.chunk-jump-tree-node__head {
  display: flex;
  align-items: flex-start;
  gap: 0.05rem;
}

.chunk-jump-tree-node__toggle,
.chunk-jump-tree-node__title,
.chunk-jump-tree-node__field {
  margin: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.chunk-jump-tree-node__toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.35rem;
  padding: 0;
  color: var(--muted);
}

.chunk-jump-tree-node__chevron {
  width: 0.75rem;
  height: 0.75rem;
  transition: transform 150ms ease-out;
}

.chunk-jump-tree-node__chevron.is-open {
  transform: rotate(90deg);
}

.chunk-jump-tree-node__title {
  display: flex;
  flex: 1;
  align-items: baseline;
  gap: 0 0.28rem;
  min-width: 0;
  padding: 0.16rem 0.4rem 0.16rem 0.05rem;
}

.chunk-jump-tree-node__head .chunk-jump-tree-node__title:hover,
.chunk-jump-tree-node__field:hover,
.chunk-jump-tree-node__toggle:hover {
  background: color-mix(in srgb, var(--border-subtle) 65%, transparent);
}

.chunk-jump-tree-node__toggle:focus-visible,
.chunk-jump-tree-node__title:focus-visible,
.chunk-jump-tree-node__field:focus-visible {
  z-index: 1;
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.chunk-jump-tree-node__kind {
  flex-shrink: 0;
  font-size: 0.72rem;
  line-height: 1.3;
}

.chunk-jump-tree-node__kind[data-kind='added'] {
  color: var(--diff-added);
}

.chunk-jump-tree-node__kind[data-kind='removed'] {
  color: var(--diff-removed);
}

.chunk-jump-tree-node__kind[data-kind='modified'] {
  color: var(--diff-modified);
}

.chunk-jump-tree-node__id {
  min-width: 0;
  overflow: hidden;
  color: var(--text);
  font-family: var(--mono);
  font-size: 0.75rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-jump-tree-node__count {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.3;
}

.chunk-jump-tree-node__field {
  display: flex;
  align-items: baseline;
  gap: 0.28rem;
  width: 100%;
  padding: 0.14rem 0.4rem 0.14rem 1.25rem;
}

.chunk-jump-tree-node__field-label {
  flex-shrink: 0;
  max-width: 7rem;
  overflow: hidden;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-jump-tree-node__field-value {
  min-width: 0;
  overflow: hidden;
  color: var(--text);
  font-family: var(--mono);
  font-size: 0.75rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-jump-tree-node__field-value[data-kind='added'] {
  color: var(--diff-added);
}

.chunk-jump-tree-node__field-value[data-kind='removed'] {
  color: var(--diff-removed);
}
</style>
