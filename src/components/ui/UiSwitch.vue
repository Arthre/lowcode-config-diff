<script setup lang="ts" name="UiSwitch">
const checked = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    label: string
    disabled?: boolean
  }>(),
  { disabled: false },
)

function onToggle() {
  if (props.disabled) return
  checked.value = !checked.value
}
</script>

<template>
  <button
    type="button"
    class="ui-switch"
    role="switch"
    :aria-checked="checked"
    :aria-label="label"
    :disabled="disabled"
    @click="onToggle"
  >
    <span class="ui-switch__label">{{ label }}</span>
    <span class="ui-switch__control" aria-hidden="true">
      <svg viewBox="0 0 212.4992 84.4688" overflow="visible">
        <path
          pathLength="360"
          fill="none"
          stroke="currentColor"
          d="M 42.2496 0 A 42.24 42.24 90 0 0 0 42.2496 A 42.24 42.24 90 0 0 42.2496 84.4688 A 42.24 42.24 90 0 0 84.4992 42.2496 A 42.24 42.24 90 0 0 42.2496 0 A 42.24 42.24 90 0 0 0 42.2496 A 42.24 42.24 90 0 0 42.2496 84.4688 L 170.2496 84.4688 A 42.24 42.24 90 0 0 212.4992 42.2496 A 42.24 42.24 90 0 0 170.2496 0 A 42.24 42.24 90 0 0 128 42.2496 A 42.24 42.24 90 0 0 170.2496 84.4688 A 42.24 42.24 90 0 0 212.4992 42.2496 A 42.24 42.24 90 0 0 170.2496 0 L 42.2496 0"
        />
      </svg>
    </span>
  </button>
</template>

<style scoped lang="scss">
.ui-switch {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  border: 0;
  background: transparent;
  color: var(--text-h);
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
}

.ui-switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ui-switch:focus {
  outline: none;
}

.ui-switch:focus-visible .ui-switch__control {
  outline: 2px solid var(--accent);
  outline-offset: 0.7em;
}

.ui-switch__control {
  --ui-switch-duration: 0.5s ease-out;
  --ui-switch-fill: color-mix(in srgb, var(--muted) 62%, var(--border));
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  height: 1.2em;
  font-size: 0.5rem;
  border-radius: 2em;
  aspect-ratio: 212.4992 / 84.4688;
  background-color: var(--ui-switch-fill);
  box-shadow: 0 0 0 0.66em var(--ui-switch-fill);
  transition:
    background-color var(--ui-switch-duration),
    box-shadow var(--ui-switch-duration);
}

.ui-switch[aria-checked='true'] .ui-switch__control {
  --ui-switch-fill: var(--accent);
}

.ui-switch:hover:not(:disabled)[aria-checked='true'] .ui-switch__control {
  --ui-switch-fill: var(--accent-hover);
}

.ui-switch__control svg {
  height: 100%;
}

.ui-switch__control svg path {
  color: #fff;
  stroke-width: 16;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 136 224;
  transition:
    all var(--ui-switch-duration),
    0s transform;
  transform-origin: center;
}

.ui-switch[aria-checked='true'] .ui-switch__control svg path {
  stroke-dashoffset: 180;
  transform: scaleY(-1);
}

html.dark .ui-switch__control svg path {
  color: var(--canvas);
}

@media (prefers-reduced-motion: reduce) {
  .ui-switch__control,
  .ui-switch__control svg path {
    transition: none;
  }
}
</style>
