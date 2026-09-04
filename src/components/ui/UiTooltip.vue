<script setup lang="ts" name="UiTooltip">
import { resolveTooltipPlacement, type TooltipPlacement } from '@/components/ui/placeTooltip'

const props = withDefaults(
  defineProps<{
    text: string
    placement?: TooltipPlacement
    /** 菜单已展开等场景下不显示气泡 */
    disabled?: boolean
  }>(),
  { placement: 'top', disabled: false },
)

const open = ref(false)
const placed = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const tipRef = ref<HTMLElement | null>(null)
const tipStyle = ref<Record<string, string>>({})

/** 未量到尺寸前停在视口外，避免 fixed 无坐标时按静态位置量到 0×0。 */
const measureStyle = { top: '-9999px', left: '0px' }

function place() {
  const trigger = triggerRef.value
  const tip = tipRef.value
  if (!trigger || !tip) return
  const box = trigger.getBoundingClientRect()
  const size = tip.getBoundingClientRect()
  if (size.width < 1 || size.height < 1) return
  const next = resolveTooltipPlacement(
    box,
    { width: size.width, height: size.height },
    props.placement,
    { width: window.innerWidth, height: window.innerHeight },
  )
  tipStyle.value = {
    top: `${next.top}px`,
    left: `${next.left}px`,
  }
  placed.value = true
}

async function show() {
  if (props.disabled) return
  placed.value = false
  open.value = true
  await nextTick()
  place()
  if (!placed.value) {
    await nextTick()
    requestAnimationFrame(() => {
      place()
    })
  }
}

function hide() {
  open.value = false
  placed.value = false
}

function onReposition() {
  if (open.value && !props.disabled) place()
}

useEventListener(window, 'resize', onReposition)
useEventListener(window, 'scroll', onReposition, { capture: true })

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) hide()
  },
)
</script>

<template>
  <span
    ref="triggerRef"
    class="ui-tooltip-host"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
  </span>
  <Teleport to="body">
    <div
      v-show="open && text && !disabled"
      ref="tipRef"
      class="ui-tooltip"
      role="tooltip"
      :style="{
        ...(placed ? tipStyle : measureStyle),
        visibility: placed ? 'visible' : 'hidden',
      }"
    >
      {{ text }}
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.ui-tooltip-host {
  display: inline-flex;
  max-width: 100%;
}
</style>

<style lang="scss">
.ui-tooltip {
  position: fixed;
  z-index: 80;
  box-sizing: border-box;
  width: max-content;
  max-width: min(16rem, calc(100vw - 16px));
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-raised);
  color: var(--text-h);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.35;
  box-shadow: var(--shadow-md);
  pointer-events: none;
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
