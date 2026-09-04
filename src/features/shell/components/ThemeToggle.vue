<script setup lang="ts" name="ThemeToggle">
import UiTooltip from '@/components/ui/UiTooltip.vue'
import { useThemeToggle } from '@/features/shell/composables/useThemeToggle'

const { isDark, toggleWithViewTransition } = useThemeToggle()

const label = computed(() => (isDark.value ? '切换到亮色主题' : '切换到暗色主题'))
</script>

<template>
  <UiTooltip :text="label">
    <button
      type="button"
      class="ui-theme-toggle inline-flex items-center justify-center"
      :aria-label="label"
      @click="toggleWithViewTransition($event)"
    >
      <span v-if="isDark" class="i-lucide-sun icon" aria-hidden="true" />
      <span v-else class="i-lucide-moon icon" aria-hidden="true" />
    </button>
  </UiTooltip>
</template>
