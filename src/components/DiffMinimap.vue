<script setup lang="ts" name="DiffMinimap">
import type { ChunkBand } from '@/composables/chunkMinimapLayout'
import { paintMinimapSnapshot, type MinimapPalette } from '@/composables/minimapSnapshot'

const props = defineProps<{
  leftText: string
  rightText: string
  leftChanged: readonly boolean[]
  rightChanged: readonly boolean[]
  viewport: ChunkBand
}>()

const emit = defineEmits<{
  jump: [ratio: number]
}>()

const trackRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

function cssVar(name: string, fallback: string): string {
  const el = trackRef.value
  if (!el) return fallback
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback
}

function palette(): MinimapPalette {
  const removed = cssVar('--diff-removed', '#b91c1c')
  const added = cssVar('--diff-added', '#047857')
  return {
    bg: cssVar('--code-bg', '#f1f4f7'),
    text: cssVar('--text-h', '#0f1720'),
    string: cssVar('--accent', '#0f766e'),
    number: cssVar('--side-prod', '#b45309'),
    punct: cssVar('--muted', '#7b8794'),
    changedLeft: `color-mix(in srgb, ${removed} 30%, transparent)`,
    changedRight: `color-mix(in srgb, ${added} 30%, transparent)`,
  }
}

function paint() {
  const canvas = canvasRef.value
  const track = trackRef.value
  if (!canvas || !track) return
  const box = track.getBoundingClientRect()
  const width = Math.max(1, Math.round(box.width))
  const height = Math.max(1, Math.round(box.height))
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  paintMinimapSnapshot(ctx, {
    leftText: props.leftText,
    rightText: props.rightText,
    leftChanged: props.leftChanged,
    rightChanged: props.rightChanged,
    width,
    height,
    colors: palette(),
  })
}

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

let frame = 0
let resizeObserver: ResizeObserver | undefined
let themeObserver: MutationObserver | undefined

function schedulePaint() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    paint()
  })
}

watch(() => [props.leftText, props.rightText, props.leftChanged, props.rightChanged], schedulePaint)

onMounted(() => {
  paint()
  const track = trackRef.value
  if (!track) return
  resizeObserver = new ResizeObserver(schedulePaint)
  resizeObserver.observe(track)
  themeObserver = new MutationObserver(schedulePaint)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
  if (frame) cancelAnimationFrame(frame)
})
</script>

<template>
  <div
    ref="trackRef"
    class="diff-minimap"
    role="scrollbar"
    aria-label="代码缩略图"
    aria-orientation="vertical"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
  >
    <canvas ref="canvasRef" class="diff-minimap__canvas" aria-hidden="true" />
    <span
      class="diff-minimap__viewport"
      :style="{
        top: `${props.viewport.start * 100}%`,
        height: `${Math.max((props.viewport.end - props.viewport.start) * 100, 4)}%`,
      }"
    />
  </div>
</template>

<style scoped lang="scss">
.diff-minimap {
  position: relative;
  flex: 0 0 7.25rem;
  width: 7.25rem;
  min-height: 0;
  align-self: stretch;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--code-bg);
  cursor: pointer;
}

.diff-minimap__canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.diff-minimap__viewport {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 1;
  border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  pointer-events: none;
}
</style>
