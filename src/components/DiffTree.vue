<script setup lang="ts" name="DiffTree">
import { buildDiffTree, pathKey, type DiffTreeNode } from '@/composables/diffTreeModel'
import { formatPath } from '@/core/path'
import type { DiffSide, DiffType, JsonValue } from '@/core/types'
import { useDiffSession } from '@/stores/diffSession'

const session = useDiffSession()

const [DefineTreeNode, TreeNode] = createReusableTemplate<{
  node: DiffTreeNode
}>()

/** 不含 side：选边变化时不重建整树 */
const leafStructureKey = computed(() =>
  session.leaves.map((leaf) => `${leaf.id}\0${leaf.type}\0${leaf.path.join('\0')}`).join('\n'),
)

const treeNodes = shallowRef<DiffTreeNode[]>([])

function rebuildTreeNodes() {
  if (!session.active || session.testConfig == null || session.prodConfig == null) {
    treeNodes.value = []
    return
  }
  treeNodes.value = buildDiffTree({
    leaves: session.leaves,
    testConfig: session.testConfig,
    prodConfig: session.prodConfig,
    showUnchanged: session.showUnchanged,
  })
}

watch(
  () =>
    [
      session.active,
      session.showUnchanged,
      session.testConfig,
      session.prodConfig,
      leafStructureKey.value,
    ] as const,
  () => {
    rebuildTreeNodes()
  },
  { immediate: true },
)

const sideById = computed(() => {
  const map = new Map<string, DiffSide>()
  for (const leaf of session.leaves) {
    map.set(leaf.id, leaf.side)
  }
  return map
})

/** 单次汇总各容器选边态，避免渲染每个容器时重复扫描全部叶子。 */
const sideLabelByPath = computed(() => {
  const states = new Map<string, DiffSide | 'mixed'>()
  for (const leaf of session.leaves) {
    for (let depth = 0; depth < leaf.path.length; depth += 1) {
      const key = pathKey(leaf.path.slice(0, depth))
      const current = states.get(key)
      if (current === undefined) states.set(key, leaf.side)
      else if (current !== leaf.side) states.set(key, 'mixed')
    }
  }

  const labels = new Map<string, string>()
  for (const [key, state] of states) {
    labels.set(key, state === 'mixed' ? '混合' : state === 'test' ? '全 TEST' : '全 PROD')
  }
  return labels
})

const collapsedKeys = ref(new Set<string>())
/** 叶级展开：展开后才挂载对比/详情；默认全部展开 */
const expandedLeafIds = ref(new Set<string>())

const stringifyCache = new WeakMap<object, string>()

function isComplexValue(value: JsonValue | undefined): boolean {
  return value !== undefined && typeof value === 'object' && value !== null
}

function defaultExpandedLeafIds(): Set<string> {
  return new Set(session.leaves.map((leaf) => leaf.id))
}

watch(
  () => [session.testConfig, session.prodConfig, session.active] as const,
  () => {
    collapsedKeys.value = new Set()
    expandedLeafIds.value = session.active ? defaultExpandedLeafIds() : new Set()
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

function isLeafExpanded(leafId: string): boolean {
  return expandedLeafIds.value.has(leafId)
}

function toggleLeafExpand(leafId: string) {
  const next = new Set(expandedLeafIds.value)
  if (next.has(leafId)) next.delete(leafId)
  else next.add(leafId)
  expandedLeafIds.value = next
}

/** 收集容器与相同节点的 pathKey，供全部折叠使用 */
function collectCollapsibleKeys(nodes: DiffTreeNode[], out: string[] = []): string[] {
  for (const node of nodes) {
    if (node.kind === 'container') {
      out.push(pathKey(node.path))
      collectCollapsibleKeys(node.children, out)
    } else if (node.kind === 'equal') {
      out.push(pathKey(node.path))
    }
  }
  return out
}

function expandAll() {
  collapsedKeys.value = new Set()
  expandedLeafIds.value = defaultExpandedLeafIds()
}

function collapseAll() {
  collapsedKeys.value = new Set(collectCollapsibleKeys(treeNodes.value))
  expandedLeafIds.value = new Set()
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

function needsCompareExpand(node: DiffTreeNode): boolean {
  return isComplexValue(node.testValue) || isComplexValue(node.prodValue)
}

function summarizeValue(value: JsonValue | undefined): string {
  if (value === undefined) return '（无）'
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `数组(${value.length})`
  return `对象(${Object.keys(value).length})`
}

function stringifyValue(value: JsonValue | undefined): string {
  if (value === undefined) return '（无）'
  if (value !== null && typeof value === 'object') {
    const cached = stringifyCache.get(value)
    if (cached !== undefined) return cached
    const text = JSON.stringify(value, null, 2)
    stringifyCache.set(value, text)
    return text
  }
  return JSON.stringify(value, null, 2)
}
</script>

<template>
  <div class="diff-tree text-left w-full">
    <div v-if="!session.active" class="ui-empty-slot">
      <p>两侧 JSON 均合法并点击「开始 Diff」后，此处显示差异树。</p>
    </div>

    <template v-else>
      <div class="diff-tree__toolbar">
        <p class="diff-tree__hint m-0 text-sm text-[var(--muted)]">
          用单选选择合并采用哪一侧；节点均可展开折叠，展开对比可查看带行号的差异高亮。
        </p>
        <div class="diff-tree__expand-actions" role="group" aria-label="展开折叠">
          <button type="button" class="ui-btn !px-2.5 !py-1 text-xs" @click="expandAll">
            全部展开
          </button>
          <button type="button" class="ui-btn !px-2.5 !py-1 text-xs" @click="collapseAll">
            全部折叠
          </button>
        </div>
      </div>

      <div class="diff-tree__scroll">
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
              class="flex flex-wrap items-center gap-2 py-2 px-2.5 rounded-[var(--radius-sm)] transition-colors duration-150 hover:bg-[var(--code-bg)]"
            >
              <button
                type="button"
                class="ui-btn !px-1.5 !py-0.5 text-xs"
                :aria-expanded="isExpanded(node.path)"
                :aria-label="isExpanded(node.path) ? '折叠' : '展开'"
                @click="toggleExpand(node.path)"
              >
                {{ isExpanded(node.path) ? '▼' : '▶' }}
              </button>
              <span class="font-mono text-sm text-[var(--text-h)]">{{ node.segment }}</span>
              <span
                v-if="sideLabelByPath.get(pathKey(node.path))"
                class="text-xs px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--code-bg)] text-[var(--muted)]"
              >
                {{ sideLabelByPath.get(pathKey(node.path)) }}
              </span>
              <span class="flex-1 min-w-2" />
              <div class="ui-side-segment" role="group" :aria-label="`整支选边 ${node.segment}`">
                <button
                  type="button"
                  class="ui-side-segment__btn ui-side-segment__btn--test"
                  @click="session.setDescendantSides(node.path, 'test')"
                >
                  整支用 TEST
                </button>
                <button
                  type="button"
                  class="ui-side-segment__btn ui-side-segment__btn--prod"
                  @click="session.setDescendantSides(node.path, 'prod')"
                >
                  整支用 PROD
                </button>
              </div>
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
            class="ui-diff-leaf list-none m-0 my-1.5"
            :data-path="formatPath(node.path)"
          >
            <div class="ui-diff-leaf-head">
              <div class="ui-diff-leaf-head__title">
                <button
                  type="button"
                  class="ui-btn !px-1.5 !py-0.5 text-xs"
                  :aria-expanded="isLeafExpanded(node.leafId)"
                  :aria-label="isLeafExpanded(node.leafId) ? '折叠详情' : '展开详情'"
                  @click="toggleLeafExpand(node.leafId)"
                >
                  {{ isLeafExpanded(node.leafId) ? '▼' : '▶' }}
                </button>
                <span :class="[typeBadgeClass(node.diffType), 'ui-badge--lg']">
                  {{ typeLabel(node.diffType) }}
                </span>
                <span class="ui-diff-leaf-head__path">{{ formatPath(node.path) }}</span>
                <span
                  v-if="!isLeafExpanded(node.leafId)"
                  class="text-xs font-mono text-[var(--muted)] truncate max-w-48"
                >
                  {{
                    needsCompareExpand(node)
                      ? `TEST ${summarizeValue(node.testValue)} · PROD ${summarizeValue(node.prodValue)}`
                      : summarizeValue(
                          sideById.get(node.leafId) === 'prod' ? node.prodValue : node.testValue,
                        )
                  }}
                </span>
              </div>
              <div
                class="ui-side-segment"
                role="radiogroup"
                :aria-label="`选择 ${formatPath(node.path)} 的合并侧`"
              >
                <button
                  type="button"
                  class="ui-side-segment__btn ui-side-segment__btn--test"
                  :class="{ 'is-active': sideById.get(node.leafId) === 'test' }"
                  :aria-checked="sideById.get(node.leafId) === 'test'"
                  role="radio"
                  @click="session.setLeafSide(node.leafId, 'test')"
                >
                  TEST
                </button>
                <button
                  type="button"
                  class="ui-side-segment__btn ui-side-segment__btn--prod"
                  :class="{ 'is-active': sideById.get(node.leafId) === 'prod' }"
                  :aria-checked="sideById.get(node.leafId) === 'prod'"
                  role="radio"
                  @click="session.setLeafSide(node.leafId, 'prod')"
                >
                  PROD
                </button>
              </div>
            </div>

            <div v-if="isLeafExpanded(node.leafId)" class="ui-diff-leaf-body">
              <div v-if="!needsCompareExpand(node)" class="grid gap-3 md:grid-cols-2 text-sm">
                <div class="min-w-0">
                  <div class="ui-label-test mb-1">TEST</div>
                  <pre
                    class="m-0 bg-[var(--code-bg)] rounded-[var(--radius-sm)] p-2.5 overflow-auto whitespace-pre-wrap break-all font-mono text-[var(--text-h)]"
                    >{{ summarizeValue(node.testValue) }}</pre>
                </div>
                <div class="min-w-0">
                  <div class="ui-label-prod mb-1">PROD</div>
                  <pre
                    class="m-0 bg-[var(--code-bg)] rounded-[var(--radius-sm)] p-2.5 overflow-auto whitespace-pre-wrap break-all font-mono text-[var(--text-h)]"
                    >{{ summarizeValue(node.prodValue) }}</pre>
                </div>
              </div>

              <DiffLeafViewer
                v-else
                :diff-type="node.diffType"
                :test-doc="stringifyValue(node.testValue)"
                :prod-doc="stringifyValue(node.prodValue)"
                :has-test="node.testValue !== undefined"
                :has-prod="node.prodValue !== undefined"
              />
            </div>
          </li>

          <li
            v-else
            class="list-none m-0 my-0.5 rounded-[var(--radius-sm)] text-[var(--muted)]"
            :data-path="formatPath(node.path)"
          >
            <div
              class="flex flex-wrap items-center gap-2 py-2 px-2.5 rounded-[var(--radius-sm)] transition-colors duration-150 hover:bg-[var(--code-bg)]"
            >
              <button
                type="button"
                class="ui-btn !px-1.5 !py-0.5 text-xs"
                :aria-expanded="isExpanded(node.path)"
                :aria-label="isExpanded(node.path) ? '折叠' : '展开'"
                @click="toggleExpand(node.path)"
              >
                {{ isExpanded(node.path) ? '▼' : '▶' }}
              </button>
              <span class="ui-badge bg-[var(--code-bg)] text-[var(--muted)]">相同</span>
              <span class="font-mono text-sm text-[var(--text-h)]">{{ node.segment }}</span>
              <span v-if="!isExpanded(node.path)" class="text-xs font-mono truncate max-w-full">
                {{ summarizeValue(node.equalValue) }}
              </span>
            </div>
            <div
              v-show="isExpanded(node.path)"
              class="pl-8 pr-2.5 pb-2 text-xs font-mono text-[var(--text-h)] break-all"
            >
              {{ summarizeValue(node.equalValue) }}
            </div>
          </li>
        </DefineTreeNode>

        <ul v-if="treeNodes.length > 0" class="m-0 p-0 flex flex-col gap-0.5">
          <TreeNode v-for="node in treeNodes" :key="pathKey(node.path)" :node="node" />
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.diff-tree {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  min-width: 0;
  height: auto;
}

.diff-tree__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
}

.diff-tree__hint {
  flex: 1 1 14rem;
  min-width: 0;
}

.diff-tree__expand-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.diff-tree__scroll {
  min-width: 0;
}
</style>
