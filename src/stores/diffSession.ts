import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import {
  withAllSides,
  withDefaultSides,
  withDescendantSides,
  withSide,
} from '@/composables/diffTreeModel'
import { diffConfig } from '@/core/diff'
import type { Config, DiffItem, DiffSide } from '@/core/types'

export const useDiffSession = defineStore('diffSession', () => {
  // Config / DiffItem 含深层 JsonValue；用 shallowRef 避免 ref 递归展开触发 TS2589
  const testConfig = shallowRef<Config | null>(null)
  const prodConfig = shallowRef<Config | null>(null)
  const leaves = shallowRef<DiffItem[]>([])
  const showUnchanged = ref(false)
  const active = ref(false)

  const hasSession = computed(() => active.value)
  const leafCount = computed(() => leaves.value.length)

  function startSession(test: Config, prod: Config) {
    testConfig.value = test
    prodConfig.value = prod
    leaves.value = diffConfig(test, prod).map((item) => ({ ...item }))
    showUnchanged.value = false
    active.value = true
  }

  function setShowUnchanged(value: boolean) {
    showUnchanged.value = value
  }

  function setLeafSide(id: string, side: DiffSide) {
    leaves.value = withSide(leaves.value, id, side)
  }

  function setAllTest() {
    leaves.value = withAllSides(leaves.value, 'test')
  }

  function setAllProd() {
    leaves.value = withAllSides(leaves.value, 'prod')
  }

  function resetDefaults() {
    leaves.value = withDefaultSides(leaves.value)
  }

  function setDescendantSides(prefix: string[], side: DiffSide) {
    leaves.value = withDescendantSides(leaves.value, prefix, side)
  }

  return {
    testConfig,
    prodConfig,
    leaves,
    showUnchanged,
    active,
    hasSession,
    leafCount,
    startSession,
    setShowUnchanged,
    setLeafSide,
    setAllTest,
    setAllProd,
    resetDefaults,
    setDescendantSides,
  }
})
