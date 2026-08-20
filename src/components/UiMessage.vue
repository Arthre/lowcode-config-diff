<script setup lang="ts" name="UiMessage">
import type { StatusMessageTone } from '@/composables/statusMessage'

const props = withDefaults(
  defineProps<{
    text: string
    tone?: StatusMessageTone
    /** 同一文案再次弹出时递增，以便重播入场 */
    nonce?: number
  }>(),
  { tone: 'success', nonce: 0 },
)

const emit = defineEmits<{
  dismiss: []
}>()

const iconClass = computed(() => {
  if (props.tone === 'error') return 'i-lucide-circle-alert'
  if (props.tone === 'warning') return 'i-lucide-triangle-alert'
  return 'i-lucide-check'
})
</script>

<template>
  <Teleport to="body">
    <div class="ui-message-host" aria-live="polite">
      <Transition name="ui-message">
        <div v-if="text" :key="nonce" class="ui-message" :class="`is-${tone}`" role="status">
          <span :class="iconClass" class="ui-message__icon" aria-hidden="true" />
          <span class="ui-message__text">{{ text }}</span>
          <button
            v-if="tone === 'error'"
            type="button"
            class="ui-message__dismiss"
            aria-label="关闭"
            @click="emit('dismiss')"
          >
            <span class="i-lucide-x" aria-hidden="true" />
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style lang="scss">
.ui-message-host {
  position: fixed;
  top: 1.1rem;
  left: 50%;
  z-index: 90;
  transform: translateX(-50%);
  pointer-events: none;
}

.ui-message {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: min(28rem, calc(100vw - 2rem));
  padding: 0.48rem 0.72rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
  color: var(--text-h);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.35;
  box-shadow: var(--shadow-md);
  pointer-events: auto;
}

.ui-message.is-success {
  border-color: color-mix(in srgb, var(--success) 34%, var(--border));
  background: color-mix(in srgb, var(--surface-raised) 86%, var(--diff-added-bg));
}

.ui-message.is-warning {
  border-color: color-mix(in srgb, var(--diff-modified) 38%, var(--border));
  background: color-mix(in srgb, var(--surface-raised) 86%, var(--diff-modified-bg));
}

.ui-message.is-error {
  border-color: color-mix(in srgb, var(--danger) 38%, var(--border));
  background: color-mix(in srgb, var(--danger) 9%, var(--surface-raised));
}

.ui-message__icon {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
}

.ui-message.is-success .ui-message__icon {
  color: var(--success);
}

.ui-message.is-warning .ui-message__icon {
  color: var(--diff-modified);
}

.ui-message.is-error .ui-message__icon {
  color: var(--danger);
}

.ui-message__text {
  min-width: 0;
}

.ui-message__dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  margin-inline-start: 0.1rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-h);
  cursor: pointer;
}

.ui-message__dismiss .i-lucide-x {
  width: 0.85rem;
  height: 0.85rem;
}

.ui-message__dismiss:hover {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
}

.ui-message__dismiss:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.ui-message-enter-active {
  transition:
    opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.ui-message-leave-active {
  transition:
    opacity 0.16s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.16s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.16s cubic-bezier(0.16, 1, 0.3, 1);
}

.ui-message-enter-from,
.ui-message-leave-to {
  opacity: 0;
  transform: translateY(-0.4rem);
  filter: blur(4px);
}

@media (prefers-reduced-motion: reduce) {
  .ui-message-enter-active,
  .ui-message-leave-active {
    transition: opacity 0.12s ease;
  }

  .ui-message-enter-from,
  .ui-message-leave-to {
    transform: none;
    filter: none;
  }
}
</style>
