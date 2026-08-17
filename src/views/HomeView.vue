<script setup lang="ts" name="HomeView">
import DiffTree from '@/components/DiffTree.vue'
import JsonInputArea from '@/components/JsonInputArea.vue'
import MergePreview, { type MergePreviewViewMode } from '@/components/MergePreview.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { buildMergeAnnotations, type MergeAnnotation } from '@/composables/mergeAnnotations'
import {
  clampWorkspaceMainPct,
  useWorkspaceSplit,
  WORKSPACE_MAIN_PCT_MAX,
  WORKSPACE_MAIN_PCT_MIN,
} from '@/composables/useWorkspaceSplit'
import type { Config, DiffSide } from '@/core/types'
import { useAppStore } from '@/stores/app'
import { useDiffSession } from '@/stores/diffSession'
import { buildMergeSummaryText } from '@/utils/exportConfig'

const appStore = useAppStore()
const diffSession = useDiffSession()
const { mainPct, nudgeMainPct } = useWorkspaceSplit()

/** 开始 Diff 后默认收起输入，避免双列下把差异树挤出视口 */
const inputExpanded = ref(true)

const workspaceRef = ref<HTMLElement | null>(null)
const splitterDragging = ref(false)

const mergePreviewRef = ref<{
  download: () => void
  copy: () => Promise<'copied' | 'failed' | 'empty'>
  scrollToAnnotation: (item: MergeAnnotation) => boolean
} | null>(null)

const resultViewMode = ref<MergePreviewViewMode>('formatted')
const resultCopyFeedback = ref<'idle' | 'copied' | 'failed'>('idle')
let resultCopyFeedbackTimer: ReturnType<typeof setTimeout> | undefined

const flowStep = computed(() => {
  if (!diffSession.active) return 'input'
  return 'diff'
})

const sideCounts = computed(() =>
  diffSession.leaves.reduce(
    (counts, leaf) => {
      counts[leaf.side] += 1
      return counts
    },
    { test: 0, prod: 0 },
  ),
)

const mergeAnnotations = computed(() =>
  diffSession.active ? buildMergeAnnotations(diffSession.leaves) : [],
)

const resultSummary = computed(() =>
  diffSession.active ? buildMergeSummaryText(diffSession.leaves) : '',
)

/** 开始 Diff 后即可导出；与预览正文是否已挂载无关 */
const canExportResult = computed(() => diffSession.active)

const workspaceStyle = computed(() => ({
  '--workspace-main-pct': `${mainPct.value}%`,
}))

let splitRaf = 0
let pendingMainPct = mainPct.value

function applyMainPctCss(pct: number) {
  workspaceRef.value?.style.setProperty('--workspace-main-pct', `${pct}%`)
}

function pctFromPointer(clientX: number): number {
  const el = workspaceRef.value
  if (!el) return mainPct.value
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0) return mainPct.value
  return clampWorkspaceMainPct(((clientX - rect.left) / rect.width) * 100)
}

function onSplitterPointerDown(event: PointerEvent) {
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  event.preventDefault()
  target.setPointerCapture(event.pointerId)
  splitterDragging.value = true
  document.documentElement.classList.add('is-workspace-resizing')
  pendingMainPct = pctFromPointer(event.clientX)
  applyMainPctCss(pendingMainPct)
}

function onSplitterPointerMove(event: PointerEvent) {
  if (!splitterDragging.value) return
  pendingMainPct = pctFromPointer(event.clientX)
  if (splitRaf !== 0) return
  splitRaf = requestAnimationFrame(() => {
    splitRaf = 0
    applyMainPctCss(pendingMainPct)
  })
}

function endSplitterDrag(event: PointerEvent) {
  if (!splitterDragging.value) return
  const target = event.currentTarget
  if (target instanceof HTMLElement && target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  splitterDragging.value = false
  document.documentElement.classList.remove('is-workspace-resizing')
  if (splitRaf !== 0) {
    cancelAnimationFrame(splitRaf)
    splitRaf = 0
  }
  pendingMainPct = pctFromPointer(event.clientX)
  applyMainPctCss(pendingMainPct)
  // 仅松手时写 localStorage / 触发一次响应式，避免拖拽中重渲染 DiffTree
  mainPct.value = pendingMainPct
}

function onSplitterKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    nudgeMainPct(-2)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    nudgeMainPct(2)
  } else if (event.key === 'Home') {
    event.preventDefault()
    mainPct.value = WORKSPACE_MAIN_PCT_MIN
  } else if (event.key === 'End') {
    event.preventDefault()
    mainPct.value = WORKSPACE_MAIN_PCT_MAX
  }
}

function clearResultCopyFeedbackTimer() {
  if (resultCopyFeedbackTimer !== undefined) {
    clearTimeout(resultCopyFeedbackTimer)
    resultCopyFeedbackTimer = undefined
  }
}

function showResultCopyFeedback(state: 'copied' | 'failed') {
  clearResultCopyFeedbackTimer()
  resultCopyFeedback.value = state
  resultCopyFeedbackTimer = setTimeout(() => {
    resultCopyFeedback.value = 'idle'
    resultCopyFeedbackTimer = undefined
  }, 2000)
}

onBeforeUnmount(() => {
  if (splitRaf !== 0) cancelAnimationFrame(splitRaf)
  clearResultCopyFeedbackTimer()
  document.documentElement.classList.remove('is-workspace-resizing')
})

function onStartDiff(payload: { test: Config; prod: Config }) {
  diffSession.startSession(payload.test, payload.prod)
  inputExpanded.value = false
}

function onDownloadResult() {
  mergePreviewRef.value?.download()
}

async function onCopyResult() {
  const result = await mergePreviewRef.value?.copy()
  if (result === 'copied' || result === 'failed') showResultCopyFeedback(result)
}

function setResultViewMode(mode: MergePreviewViewMode) {
  resultViewMode.value = mode
}

function sideBadgeClass(side: DiffSide): string {
  return side === 'test' ? 'ui-badge ui-side-badge-test' : 'ui-badge ui-side-badge-prod'
}

function onShowUnchangedChange(event: Event) {
  const input = event.target as HTMLInputElement
  diffSession.setShowUnchanged(input.checked)
}

function onLocateAnnotation(item: MergeAnnotation) {
  mergePreviewRef.value?.scrollToAnnotation(item)
}
</script>

<template>
  <div class="ui-page">
    <header class="ui-page-header">
      <div class="ui-page-header-inner">
        <div class="ui-page-header-top">
          <div class="ui-page-header-brand">
            <div class="ui-brand-mark" aria-hidden="true">
              <span class="i-lucide-git-compare" />
            </div>
            <h1>{{ appStore.title }}</h1>
          </div>
          <ThemeToggle />
        </div>
        <div class="ui-page-header-meta">
          <ol class="ui-flow" aria-label="主流程">
            <li class="ui-flow-step" :aria-current="flowStep === 'input' ? 'step' : undefined">
              <span class="i-lucide-file-json" aria-hidden="true" />
              输入
            </li>
            <li class="ui-flow-sep" aria-hidden="true">
              <span class="i-lucide-chevron-right" />
            </li>
            <li class="ui-flow-step" :aria-current="flowStep === 'diff' ? 'step' : undefined">
              <span class="i-lucide-list-tree" aria-hidden="true" />
              差异
            </li>
            <li class="ui-flow-sep" aria-hidden="true">
              <span class="i-lucide-chevron-right" />
            </li>
            <li class="ui-flow-step" :aria-current="flowStep === 'diff' ? 'step' : undefined">
              <span class="i-lucide-file-output" aria-hidden="true" />
              结果
            </li>
          </ol>
          <span class="ui-privacy">
            <span class="i-lucide-shield-check text-[var(--accent)]" aria-hidden="true" />
            本地处理 · 不上传
          </span>
        </div>
      </div>
    </header>

    <div
      ref="workspaceRef"
      class="ui-workspace"
      :class="{
        'is-split': diffSession.active,
        'is-resizing': splitterDragging,
      }"
      :style="workspaceStyle"
    >
      <main class="ui-workspace-main" aria-label="输入与差异">
        <section
          id="section-input"
          class="ui-panel flex flex-col gap-4"
          :class="{ 'ui-input-collapsed': diffSession.active && !inputExpanded }"
          aria-labelledby="title-input"
        >
          <div class="ui-section-head">
            <div class="flex flex-col gap-1 min-w-0 flex-1">
              <h2 id="title-input" class="ui-section-title">
                <span class="i-lucide-file-json icon" aria-hidden="true" />
                输入
              </h2>
              <p class="ui-section-desc">
                {{
                  diffSession.active && !inputExpanded
                    ? '已开始 Diff；需要更换配置时可展开重新导入'
                    : '拖入或选择 TEST / PROD JSON，两侧合法后开始对比'
                }}
              </p>
            </div>
            <button
              v-if="diffSession.active"
              type="button"
              class="ui-btn !px-2.5 !py-1 text-xs"
              :aria-expanded="inputExpanded"
              @click="inputExpanded = !inputExpanded"
            >
              {{ inputExpanded ? '收起输入' : '展开输入' }}
            </button>
          </div>
          <JsonInputArea v-show="inputExpanded" @start-diff="onStartDiff" />
        </section>

        <section
          id="section-diff"
          class="ui-workspace-diff ui-panel--fill"
          :class="[diffSession.active ? 'ui-panel ui-fade-in' : 'ui-panel-muted']"
          aria-labelledby="title-diff"
        >
          <div class="ui-section-head ui-section-head--diff">
            <div class="flex flex-col gap-1 min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2.5">
                <h2 id="title-diff" class="ui-section-title ui-section-title--primary">
                  <span class="ui-section-title__icon">
                    <span class="i-lucide-list-tree" aria-hidden="true" />
                  </span>
                  差异
                </h2>
                <!-- <span v-if="diffSession.active" class="ui-diff-count">
                  <strong>{{ diffSession.leafCount }}</strong>
                  项差异
                </span> -->
              </div>
              <p class="ui-section-desc">
                {{
                  diffSession.active
                    ? '按叶选择 TEST 或 PROD；可批量与恢复默认'
                    : '开始 Diff 后在此选边'
                }}
              </p>
            </div>
            <div
              v-if="diffSession.active"
              class="ui-diff-toolbar"
              role="toolbar"
              aria-label="差异操作"
            >
              <label
                class="inline-flex items-center gap-2 text-sm text-[var(--text-h)] cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  class="accent-[var(--accent)] w-3.5 h-3.5"
                  :checked="diffSession.showUnchanged"
                  @change="onShowUnchangedChange"
                />
                显示无差异
              </label>
              <div class="ui-side-segment" role="group" aria-label="批量选边">
                <button
                  type="button"
                  class="ui-side-segment__btn ui-side-segment__btn--test"
                  @click="diffSession.setAllTest()"
                >
                  全部选 TEST
                </button>
                <button
                  type="button"
                  class="ui-side-segment__btn ui-side-segment__btn--prod"
                  @click="diffSession.setAllProd()"
                >
                  全部选 PROD
                </button>
              </div>
              <button type="button" class="ui-btn" @click="diffSession.resetDefaults()">
                恢复默认
              </button>
            </div>
          </div>
          <DiffTree />
        </section>
      </main>

      <div
        v-if="diffSession.active"
        class="ui-workspace-splitter"
        role="separator"
        aria-orientation="vertical"
        aria-label="调整左右栏宽度"
        :aria-valuenow="Math.round(mainPct)"
        :aria-valuemin="WORKSPACE_MAIN_PCT_MIN"
        :aria-valuemax="WORKSPACE_MAIN_PCT_MAX"
        tabindex="0"
        @pointerdown="onSplitterPointerDown"
        @pointermove="onSplitterPointerMove"
        @pointerup="endSplitterDrag"
        @pointercancel="endSplitterDrag"
        @keydown="onSplitterKeydown"
      >
        <span class="ui-workspace-splitter__grip" aria-hidden="true" />
      </div>

      <aside v-if="diffSession.active" class="ui-workspace-side" aria-label="统计与结果">
        <div class="ui-side-summary">
          <p class="ui-side-summary__label">选边统计</p>
          <div class="ui-side-summary__row">
            <div class="ui-side-summary__counts">
              <div class="ui-side-summary__stat ui-side-summary__stat--test">
                <span>TEST</span>
                <strong>{{ sideCounts.test }}</strong>
              </div>
              <div class="ui-side-summary__stat ui-side-summary__stat--prod">
                <span>PROD</span>
                <strong>{{ sideCounts.prod }}</strong>
              </div>
              <div class="ui-side-summary__stat">
                <span>合计</span>
                <strong>{{ diffSession.leafCount }}</strong>
              </div>
            </div>
            <div class="ui-side-summary__actions">
              <button
                type="button"
                class="ui-side-summary__side ui-side-summary__side--test"
                @click="diffSession.setAllTest"
              >
                全选 TEST
              </button>
              <button
                type="button"
                class="ui-side-summary__side ui-side-summary__side--prod"
                @click="diffSession.setAllProd"
              >
                全选 PROD
              </button>
              <button
                type="button"
                class="ui-side-summary__reset"
                @click="diffSession.resetDefaults"
              >
                恢复默认
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="mergeAnnotations.length > 0"
          class="ui-merge-sources"
          aria-labelledby="title-merge-sources"
        >
          <div class="ui-merge-sources__head">
            <p id="title-merge-sources" class="ui-side-summary__label">合并来源</p>
            <p class="ui-merge-sources__hint">对应左侧选边；点击可定位下方结果中的纳入片段。</p>
          </div>
          <ul class="ui-merge-sources__list">
            <li v-for="item in mergeAnnotations" :key="item.id">
              <button
                type="button"
                class="ui-merge-sources__item"
                :title="
                  item.effect === 'drop' ? '未纳入结果，点击跳到结果区' : '定位到结果中的对应片段'
                "
                @click="onLocateAnnotation(item)"
              >
                <span class="ui-merge-sources__path">{{ item.pathText }}</span>
                <span :class="sideBadgeClass(item.side)">{{
                  item.side === 'test' ? 'TEST' : 'PROD'
                }}</span>
                <span
                  class="ui-merge-sources__effect"
                  :class="item.effect === 'drop' ? 'ui-status-invalid' : ''"
                >
                  {{ item.label }}
                </span>
              </button>
            </li>
          </ul>
        </div>

        <section
          id="section-result"
          class="ui-workspace-result ui-panel ui-panel--fill ui-fade-in"
          aria-labelledby="title-result"
        >
          <div class="ui-section-head shrink-0">
            <div class="flex flex-col gap-1 min-w-0 flex-1">
              <h2 id="title-result" class="ui-section-title">
                <span class="i-lucide-file-output icon" aria-hidden="true" />
                结果
              </h2>
              <p v-if="resultSummary" class="ui-section-desc">{{ resultSummary }}</p>
            </div>
            <div class="ui-result-toolbar" role="toolbar" aria-label="结果操作">
              <div class="ui-side-segment" role="group" aria-label="结果展示格式">
                <button
                  type="button"
                  class="ui-side-segment__btn ui-side-segment__btn--icon"
                  :class="{ 'is-active': resultViewMode === 'formatted' }"
                  :aria-pressed="resultViewMode === 'formatted'"
                  title="格式化"
                  aria-label="格式化"
                  @click="setResultViewMode('formatted')"
                >
                  <span class="i-lucide-align-left" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="ui-side-segment__btn ui-side-segment__btn--icon"
                  :class="{ 'is-active': resultViewMode === 'compressed' }"
                  :aria-pressed="resultViewMode === 'compressed'"
                  title="压缩"
                  aria-label="压缩"
                  @click="setResultViewMode('compressed')"
                >
                  <span class="i-lucide-minimize-2" aria-hidden="true" />
                </button>
              </div>
              <button
                type="button"
                class="ui-btn ui-btn-icon"
                :disabled="!canExportResult"
                title="复制"
                aria-label="复制"
                @click="onCopyResult"
              >
                <span class="i-lucide-copy" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="ui-btn ui-btn-primary ui-btn-icon"
                :disabled="!canExportResult"
                title="下载 config.json"
                aria-label="下载 config.json"
                @click="onDownloadResult"
              >
                <span class="i-lucide-download" aria-hidden="true" />
              </button>
              <span
                v-if="resultCopyFeedback === 'copied'"
                class="text-xs font-medium ui-status-valid ui-fade-in"
                role="status"
              >
                已复制
              </span>
              <span
                v-else-if="resultCopyFeedback === 'failed'"
                class="text-xs font-medium ui-status-invalid"
                role="status"
              >
                复制失败
              </span>
            </div>
          </div>
          <div class="ui-panel-body">
            <MergePreview ref="mergePreviewRef" :view-mode="resultViewMode" />
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>
