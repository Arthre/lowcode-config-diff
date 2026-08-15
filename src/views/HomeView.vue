<script setup lang="ts" name="HomeView">
import DiffTree from '@/components/DiffTree.vue'
import JsonInputArea from '@/components/JsonInputArea.vue'
import type { Config } from '@/core/types'
import { useAppStore } from '@/stores/app'
import { useDiffSession } from '@/stores/diffSession'

const appStore = useAppStore()
const diffSession = useDiffSession()

function onStartDiff(payload: { test: Config; prod: Config }) {
  diffSession.startSession(payload.test, payload.prod)
}
</script>

<template>
  <div class="w-full flex flex-col gap-6 p-6 text-left">
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold m-0">{{ appStore.title }}</h1>
      <p class="text-sm text-[var(--text)] m-0">
        粘贴或导入 TEST / PROD JSON，校验通过后开始对比。
      </p>
    </header>

    <JsonInputArea @start-diff="onStartDiff" />

    <section class="border border-[var(--border)] rounded p-4 text-left">
      <h2 class="text-lg font-medium m-0 mb-2">Diff</h2>
      <DiffTree />
    </section>

    <section class="border border-[var(--border)] rounded p-4 text-left">
      <h2 class="text-lg font-medium m-0 mb-2">Result</h2>
      <p class="text-sm text-[var(--text)] m-0">合并结果预览占位（本切片未实现）。</p>
    </section>
  </div>
</template>
