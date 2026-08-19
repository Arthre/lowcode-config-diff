<script setup lang="ts" name="DownloadMenu">
import UiTooltip from '@/components/UiTooltip.vue'

const emit = defineEmits<{
  pretty: []
  compressed: []
}>()

const open = ref(false)
const wrapRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

function place() {
  const el = wrapRef.value
  if (!el) return
  const box = el.getBoundingClientRect()
  menuStyle.value = {
    top: `${box.bottom + 6}px`,
    left: `${box.right}px`,
    transform: 'translateX(-100%)',
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) place()
}

function pick(kind: 'pretty' | 'compressed') {
  open.value = false
  if (kind === 'pretty') emit('pretty')
  else emit('compressed')
}

function onDocPointer(event: PointerEvent) {
  if (!open.value) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (wrapRef.value?.contains(target) || panelRef.value?.contains(target)) return
  open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
})
</script>

<template>
  <div ref="wrapRef" class="download-menu">
    <UiTooltip text="下载" placement="top" :disabled="open">
      <button
        type="button"
        class="ui-btn ui-btn-primary ui-btn-icon"
        aria-label="下载"
        aria-haspopup="menu"
        :aria-expanded="open"
        @click="toggle"
      >
        <span class="i-lucide-download" aria-hidden="true" />
      </button>
    </UiTooltip>
    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="download-menu__panel"
        role="menu"
        aria-label="下载结果"
        :style="menuStyle"
      >
        <button type="button" role="menuitem" @click="pick('pretty')">下载 config.json</button>
        <button type="button" role="menuitem" @click="pick('compressed')">压缩并下载</button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.download-menu {
  display: inline-flex;
}
</style>

<style lang="scss">
.download-menu__panel {
  position: fixed;
  z-index: 80;
  display: flex;
  flex-direction: column;
  min-width: 10.5rem;
  padding: 0.28rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  box-shadow: var(--shadow-lg);
}

.download-menu__panel button {
  padding: 0.4rem 0.65rem;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-h);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.download-menu__panel button:hover,
.download-menu__panel button:focus-visible {
  background: var(--accent-muted);
  color: var(--accent);
}
</style>
