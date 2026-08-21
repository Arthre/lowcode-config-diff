<script setup lang="ts" name="MergePaneEmptyState">
import { DotLottieVue, type DotLottieVueInstance } from '@lottiefiles/dotlottie-vue'

const props = withDefaults(
  defineProps<{
    /** 选择文件按钮的无障碍名称；默认与可见文案一致 */
    selectAriaLabel?: string
    /** 该窗格正处于文件拖入高亮（宿主 dragenter/dragover，不是 drop） */
    dragOver?: boolean
    /** 双侧文档都为空时显示示例入口 */
    showSample?: boolean
  }>(),
  { selectAriaLabel: '选择文件', dragOver: false, showSample: false },
)

const emit = defineEmits<{
  select: []
  paste: []
  sample: []
}>()

const reduceMotion = usePreferredReducedMotion()
const playAnimation = computed(() => reduceMotion.value !== 'reduce')
const animationSrc = `${import.meta.env.BASE_URL}lottie/empty-import.json`
const playerRef = ref<DotLottieVueInstance | null>(null)

function playerInstance() {
  return playerRef.value?.getDotLottieInstance?.() ?? null
}

/** empty-import.json 位移/透明度关键帧只到约第 30 帧，之后静止。 */
const motionEndFrame = 30
let holdFrameListener: ((event: { currentFrame: number }) => void) | undefined

function detachHoldFrame() {
  if (!holdFrameListener) return
  playerInstance()?.removeEventListener('frame', holdFrameListener)
  holdFrameListener = undefined
}

function playInDirection(over: boolean) {
  const instance = playerInstance()
  if (!instance?.isLoaded) {
    requestAnimationFrame(() => {
      const again = playerInstance()
      if (again?.isLoaded) applyPlayback(again, over)
    })
    return
  }
  applyPlayback(instance, over)
}

function applyPlayback(instance: NonNullable<ReturnType<typeof playerInstance>>, over: boolean) {
  detachHoldFrame()
  const lastFrame = instance.totalFrames - 1
  if (lastFrame < 0) return
  if (over) {
    const fromFrame = Math.min(motionEndFrame, lastFrame)
    let passedPeak = instance.currentFrame > 1
    holdFrameListener = (event) => {
      if (event.currentFrame > 1) {
        passedPeak = true
        return
      }
      if (!passedPeak) return
      instance.pause()
      instance.setFrame(0)
      detachHoldFrame()
    }
    instance.addEventListener('frame', holdFrameListener)
    instance.setMode('reverse')
    instance.setFrame(fromFrame)
    instance.play()
  } else {
    instance.setMode('forward')
    instance.play()
  }
}

function onPlayerLoad() {
  if (props.dragOver) playInDirection(true)
}

onMounted(() => {
  void nextTick(() => {
    const instance = playerInstance()
    if (!instance) return
    instance.addEventListener('load', onPlayerLoad)
    if (instance.isLoaded) onPlayerLoad()
  })
})

watch(
  () => props.dragOver,
  (over) => {
    if (!playAnimation.value) return
    void nextTick(() => playInDirection(over))
  },
)

onBeforeUnmount(() => {
  detachHoldFrame()
  playerInstance()?.removeEventListener('load', onPlayerLoad)
})
</script>

<template>
  <div class="merge-pane-empty">
    <DotLottieVue
      v-if="playAnimation"
      ref="playerRef"
      class="merge-pane-empty__player"
      aria-hidden="true"
      autoplay
      :mode="dragOver ? 'reverse' : 'forward'"
      :src="animationSrc"
    />
    <span v-else class="merge-pane-empty__icon i-lucide-package" aria-hidden="true" />
    <p class="merge-pane-empty__title">拖入 JSON 文件或粘贴内容</p>
    <p class="merge-pane-empty__sub">支持 .json 文件</p>
    <div class="merge-pane-empty__actions">
      <button
        type="button"
        class="ui-btn ui-btn-soft merge-pane-empty__cta"
        :aria-label="props.selectAriaLabel"
        @click="emit('select')"
      >
        选择文件
      </button>
      <button type="button" class="ui-btn merge-pane-empty__cta" @click="emit('paste')">
        粘贴全文
      </button>
      <button
        v-if="showSample"
        type="button"
        class="merge-pane-empty__sample"
        @click="emit('sample')"
      >
        填入示例配置
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.merge-pane-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  width: max-content;
  max-width: 12.5rem;
  padding: 0;
  text-align: center;
}

.merge-pane-empty__player {
  display: block;
  width: 3.5rem;
  height: 3.5rem;
  margin-bottom: 0.1rem;
  pointer-events: none;
}

.merge-pane-empty__icon {
  width: 1.75rem;
  height: 1.75rem;
  margin-bottom: 0.2rem;
  color: var(--accent);
}

.merge-pane-empty__title {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--text);
}

.merge-pane-empty__sub {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.3;
  color: var(--muted);
}

.merge-pane-empty__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem;
  margin-top: 0.4rem;
}

.merge-pane-empty__cta {
  padding: 0.35rem 0.7rem;
  font-size: 0.8125rem;
}

.merge-pane-empty__sample {
  padding: 0.35rem 0.25rem;
  border: 0;
  background: transparent;
  color: var(--accent);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}

.merge-pane-empty__cta,
.merge-pane-empty__sample {
  pointer-events: auto;
}
</style>
