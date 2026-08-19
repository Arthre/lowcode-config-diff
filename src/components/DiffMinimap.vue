<script setup lang="ts" name="DiffMinimap">
import type { ChunkBand } from '@/composables/chunkMinimapLayout'

const props = defineProps<{
  leftBands: readonly ChunkBand[]
  rightBands: readonly ChunkBand[]
  viewport: ChunkBand
}>()

const emit = defineEmits<{
  jump: [ratio: number]
}>()

const trackRef = ref<HTMLElement | null>(null)

function ratioFromEvent(event: PointerEvent): number {
  const track = trackRef.value
  if (!track) return 0
  const box = track.getBoundingClientRect()
  if (box.height <= 0) return 0
  return Math.min(1, Math.max(0, (event.clientY - box.top) / box.height))
}

function onPointerDown(event: PointerEvent) {
  event.preventDefault()
  trackRef.value?.setPointerCapture(event.pointerId)
  emit('jump', ratioFromEvent(event))
}

function onPointerMove(event: PointerEvent) {
  if (!event.buttons) return
  emit('jump', ratioFromEvent(event))
}
</script>

<template>
  <div
    ref="trackRef"
    class="diff-minimap"
    role="scrollbar"
    aria-label="冲突缩略图"
    aria-orientation="vertical"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
  >
    <span
      class="diff-minimap__viewport"
      :style="{
        top: `${props.viewport.start * 100}%`,
        height: `${Math.max((props.viewport.end - props.viewport.start) * 100, 4)}%`,
      }"
    />
    <span class="diff-minimap__col diff-minimap__col--left">
      <span
        v-for="(band, index) in props.leftBands"
        :key="`l-${index}`"
        class="diff-minimap__band diff-minimap__band--left"
        :style="{
          top: `${band.start * 100}%`,
          height: `${Math.max((band.end - band.start) * 100, 0.8)}%`,
        }"
      />
    </span>
    <span class="diff-minimap__col diff-minimap__col--right">
      <span
        v-for="(band, index) in props.rightBands"
        :key="`r-${index}`"
        class="diff-minimap__band diff-minimap__band--right"
        :style="{
          top: `${band.start * 100}%`,
          height: `${Math.max((band.end - band.start) * 100, 0.8)}%`,
        }"
      />
    </span>
  </div>
</template>

<style scoped lang="scss">
.diff-minimap {
  position: relative;
  flex: 0 0 0.9rem;
  width: 0.9rem;
  min-height: 0;
  align-self: stretch;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--code-bg) 88%, var(--surface));
  cursor: pointer;
}

.diff-minimap__viewport {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 0;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  pointer-events: none;
}

.diff-minimap__col {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  width: 42%;
  pointer-events: none;
}

.diff-minimap__col--left {
  left: 8%;
}

.diff-minimap__col--right {
  right: 8%;
}

.diff-minimap__band {
  position: absolute;
  right: 0;
  left: 0;
  border-radius: 1px;
}

.diff-minimap__band--left {
  background: color-mix(in srgb, var(--diff-removed) 82%, var(--diff-modified));
}

.diff-minimap__band--right {
  background: color-mix(in srgb, var(--diff-added) 82%, var(--diff-modified));
}
</style>
