<script setup lang="ts" name="DiffTree">
import {
  buildDiffTree,
  pathKey,
  sideStateForPrefix,
  type DiffTreeNode,
} from '@/composables/diffTreeModel'
import { formatPath } from '@/core/path'
import type { DiffSide, DiffType, JsonValue } from '@/core/types'
import { useDiffSession } from '@/stores/diffSession'

const session = useDiffSession()

const [DefineTreeNode, TreeNode] = createReusableTemplate<{
  node: DiffTreeNode
}>()

const treeNodes = computed(() => {
  if (!session.active || session.testConfig == null || session.prodConfig == null) {
    return []
  }
  return buildDiffTree({
    leaves: session.leaves,
    testConfig: session.testConfig,
    prodConfig: session.prodConfig,
    showUnchanged: session.showUnchanged,
  })
})

const sideById = computed(() => {
  const map = new Map<string, DiffSide>()
  for (const leaf of session.leaves) {
    map.set(leaf.id, leaf.side)
  }
  return map
})

const collapsedKeys = ref(new Set<string>())

watch(
  () => [session.testConfig, session.prodConfig, session.active] as const,
  () => {
    collapsedKeys.value = new Set()
  },
)

function isExpanded(path: string[]): boolean {
  return !collapsedKeys.value.has(pathKey(path))
}

function toggleExpand(path: string[]) {
  const key = pathKey(path)
  const next = new Set(collapsedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  collapsedKeys.value = next
}

function typeLabel(type: DiffType): string {
  if (type === 'added') return '新增'
  if (type === 'removed') return '删除'
  return '修改'
}

function typeBadgeClass(type: DiffType): string {
  if (type === 'removed') return 'ui-badge ui-badge-removed'
  if (type === 'added') return 'ui-badge ui-badge-added'
  return 'ui-badge ui-badge-modified'
}

function mixedLabel(path: string[]): string {
  const state = sideStateForPrefix(session.leaves, path)
  if (state === 'mixed') return '混合'
  if (state === 'test') return '全 TEST'
  if (state === 'prod') return '全 PROD'
  return ''
}

function isComplexValue(value: JsonValue | undefined): boolean {
  return value !== undefined && typeof value === 'object' && value !== null
}

function summarizeValue(value: JsonValue | undefined): string {
  if (value === undefined) return '（无）'
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `Array(${value.length})`
  return `Object(${Object.keys(value).length})`
}

function stringifyValue(value: JsonValue | undefined): string {
  if (value === undefined) return '（无）'
  return JSON.stringify(value, null, 2)
}

function onShowUnchangedChange(event: Event) {
  const input = event.target as HTMLInputElement
  session.setShowUnchanged(input.checked)
}
</script>

<template>
  <div class="flex flex-col gap-3.5 text-left w-full">
    <div v-if="!session.active" class="ui-empty-slot">
      <p>两侧 JSON 均 Valid 并点击「开始 Diff」后，此处显示差异树。</p>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center gap-2.5">
        <label
          class="inline-flex items-center gap-2 text-sm text-[var(--text-h)] cursor-pointer select-none"
        >
          <input
            type="checkbox"
            class="accent-[var(--accent)] w-3.5 h-3.5"
            :checked="session.showUnchanged"
            @change="onShowUnchangedChange"
          />
          显示无差异
        </label>
        <button type="button" class="ui-btn" @click="session.setAllTest()">全部选 TEST</button>
        <button type="button" class="ui-btn" @click="session.setAllProd()">全部选 PROD</button>
        <button type="button" class="ui-btn" @click="session.resetDefaults()">恢复默认</button>
      </div>

      <p v-if="treeNodes.length === 0" class="text-sm text-[var(--muted)] m-0">
        {{ session.showUnchanged ? '无节点可展示。' : '两侧配置无差异。' }}
      </p>

      <DefineTreeNode v-slot="{ node }">
        <li
          v-if="node.kind === 'container'"
          class="list-none m-0"
          :data-path="formatPath(node.path)"
        >
          <div
            class="flex flex-wrap items-center gap-2 py-1.5 px-2 rounded-[var(--radius-sm)] transition-colors duration-150 hover:bg-[var(--code-bg)]"
          >
            <button
              type="button"
              class="ui-btn !px-1.5 !py-0.5 text-xs"
              :aria-expanded="isExpanded(node.path)"
              @click="toggleExpand(node.path)"
            >
              {{ isExpanded(node.path) ? '▼' : '▶' }}
            </button>
            <span class="font-mono text-sm text-[var(--text-h)]">{{ node.segment }}</span>
            <span
              v-if="mixedLabel(node.path)"
              class="text-xs px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--code-bg)] text-[var(--muted)]"
            >
              {{ mixedLabel(node.path) }}
            </span>
            <button
              type="button"
              class="ui-btn !px-2 !py-0.5 text-xs ui-side-test"
              @click="session.setDescendantSides(node.path, 'test')"
            >
              设为 TEST
            </button>
            <button
              type="button"
              class="ui-btn !px-2 !py-0.5 text-xs ui-side-prod"
              @click="session.setDescendantSides(node.path, 'prod')"
            >
              设为 PROD
            </button>
          </div>
          <ul
            v-show="isExpanded(node.path)"
            class="m-0 pl-3.5 border-l border-[var(--border-subtle)]"
          >
            <TreeNode v-for="child in node.children" :key="pathKey(child.path)" :node="child" />
          </ul>
        </li>

        <li
          v-else-if="node.kind === 'diff-leaf' && node.leafId && node.diffType"
          class="list-none m-0 py-2.5 px-2.5 my-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] transition-colors duration-150"
          :data-path="formatPath(node.path)"
        >
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span :class="typeBadgeClass(node.diffType)">
              {{ typeLabel(node.diffType) }}
            </span>
            <span class="font-mono text-sm text-[var(--text-h)]">{{ formatPath(node.path) }}</span>
          </div>

          <div class="flex flex-wrap items-center gap-4 mb-2.5 text-sm font-medium">
            <label class="inline-flex items-center gap-1.5 cursor-pointer ui-side-test">
              <input
                type="radio"
                class="accent-[var(--side-test)]"
                :name="`side-${node.leafId}`"
                value="test"
                :checked="sideById.get(node.leafId) === 'test'"
                @change="session.setLeafSide(node.leafId, 'test')"
              />
              TEST
            </label>
            <label class="inline-flex items-center gap-1.5 cursor-pointer ui-side-prod">
              <input
                type="radio"
                class="accent-[var(--side-prod)]"
                :name="`side-${node.leafId}`"
                value="prod"
                :checked="sideById.get(node.leafId) === 'prod'"
                @change="session.setLeafSide(node.leafId, 'prod')"
              />
              PROD
            </label>
          </div>

          <div class="grid gap-2 md:grid-cols-2 text-xs">
            <div class="min-w-0">
              <div class="ui-label-test mb-1">TEST</div>
              <details
                v-if="isComplexValue(node.testValue)"
                class="bg-[var(--code-bg)] rounded-[var(--radius-sm)] p-2"
              >
                <summary class="cursor-pointer text-[var(--text-h)]">
                  {{ summarizeValue(node.testValue) }}
                </summary>
                <pre
                  class="m-0 mt-1 overflow-auto whitespace-pre-wrap break-all font-mono text-[var(--text-h)]"
                  >{{ stringifyValue(node.testValue) }}</pre>
              </details>
              <pre
                v-else
                class="m-0 bg-[var(--code-bg)] rounded-[var(--radius-sm)] p-2 overflow-auto whitespace-pre-wrap break-all font-mono text-[var(--text-h)]"
                >{{ summarizeValue(node.testValue) }}</pre>
            </div>
            <div class="min-w-0">
              <div class="ui-label-prod mb-1">PROD</div>
              <details
                v-if="isComplexValue(node.prodValue)"
                class="bg-[var(--code-bg)] rounded-[var(--radius-sm)] p-2"
              >
                <summary class="cursor-pointer text-[var(--text-h)]">
                  {{ summarizeValue(node.prodValue) }}
                </summary>
                <pre
                  class="m-0 mt-1 overflow-auto whitespace-pre-wrap break-all font-mono text-[var(--text-h)]"
                  >{{ stringifyValue(node.prodValue) }}</pre>
              </details>
              <pre
                v-else
                class="m-0 bg-[var(--code-bg)] rounded-[var(--radius-sm)] p-2 overflow-auto whitespace-pre-wrap break-all font-mono text-[var(--text-h)]"
                >{{ summarizeValue(node.prodValue) }}</pre>
            </div>
          </div>
        </li>

        <li
          v-else
          class="list-none m-0 py-1.5 px-2 my-0.5 rounded-[var(--radius-sm)] text-[var(--muted)]"
          :data-path="formatPath(node.path)"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="ui-badge bg-[var(--code-bg)] text-[var(--muted)]">相同</span>
            <span class="font-mono text-sm">{{ node.segment }}</span>
            <span class="text-xs font-mono truncate max-w-full">{{
              summarizeValue(node.equalValue)
            }}</span>
          </div>
        </li>
      </DefineTreeNode>

      <ul v-if="treeNodes.length > 0" class="m-0 p-0 flex flex-col gap-0.5">
        <TreeNode v-for="node in treeNodes" :key="pathKey(node.path)" :node="node" />
      </ul>
    </template>
  </div>
</template>
