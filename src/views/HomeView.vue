<script setup lang="ts" name="HomeView">
import DiffTree from '@/components/DiffTree.vue'
import JsonInputArea from '@/components/JsonInputArea.vue'
import MergePreview from '@/components/MergePreview.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import type { Config } from '@/core/types'
import { useAppStore } from '@/stores/app'
import { useDiffSession } from '@/stores/diffSession'

const appStore = useAppStore()
const diffSession = useDiffSession()

const flowStep = computed(() => {
  if (!diffSession.active) return 'input'
  return 'diff'
})

function onStartDiff(payload: { test: Config; prod: Config }) {
  diffSession.startSession(payload.test, payload.prod)
}
</script>

<template>
  <div class="w-full flex flex-col gap-7 px-5 py-7 md:px-8 md:py-9 text-left">
    <header class="flex flex-col gap-3">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3.5 min-w-0 max-w-3xl">
          <div class="ui-brand-mark" aria-hidden="true">
            <span class="i-lucide-git-compare" />
          </div>
          <div class="flex flex-col gap-2 min-w-0">
            <h1>{{ appStore.title }}</h1>
            <p class="text-[0.9375rem] text-[var(--text)] m-0 leading-relaxed">
              粘贴或导入 TEST / PROD JSON，校验通过后对比差异、按叶选边，并导出合并结果。
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
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
        <span class="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium">
          <span class="i-lucide-shield-check text-[var(--accent)]" aria-hidden="true" />
          本地处理 · 不上传
        </span>
      </div>
    </header>

    <section class="ui-panel flex flex-col gap-4" aria-labelledby="section-input">
      <div class="ui-section-head">
        <div class="flex flex-col gap-1">
          <h2 id="section-input" class="ui-section-title">
            <span class="i-lucide-file-json icon" aria-hidden="true" />
            输入
          </h2>
          <p class="ui-section-desc">双栏 JSON，两侧均 Valid 后开始对比</p>
        </div>
      </div>
      <JsonInputArea @start-diff="onStartDiff" />
    </section>

    <section
      class="flex flex-col gap-4"
      :class="[diffSession.active ? 'ui-panel ui-fade-in' : 'ui-panel-muted']"
      aria-labelledby="section-diff"
    >
      <div class="ui-section-head">
        <div class="flex flex-col gap-1">
          <h2 id="section-diff" class="ui-section-title">
            <span class="i-lucide-list-tree icon" aria-hidden="true" />
            差异
          </h2>
          <p class="ui-section-desc">
            {{
              diffSession.active
                ? '按叶选择 TEST 或 PROD；可批量与恢复默认'
                : '开始 Diff 后在此选边'
            }}
          </p>
        </div>
        <span v-if="diffSession.active" class="text-xs text-[var(--muted)] font-medium">
          {{ diffSession.leafCount }} 项差异叶子
        </span>
      </div>
      <DiffTree />
    </section>

    <section
      class="flex flex-col gap-4"
      :class="[diffSession.active ? 'ui-panel ui-fade-in' : 'ui-panel-muted']"
      aria-labelledby="section-result"
    >
      <div class="ui-section-head">
        <div class="flex flex-col gap-1">
          <h2 id="section-result" class="ui-section-title">
            <span class="i-lucide-file-output icon" aria-hidden="true" />
            结果
          </h2>
          <p class="ui-section-desc">
            {{ diffSession.active ? '按当前选边实时合并，可复制或下载' : '选边后在此预览与导出' }}
          </p>
        </div>
      </div>
      <MergePreview />
    </section>
  </div>
</template>
