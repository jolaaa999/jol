<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCascadingPanels } from '@/composables/useCascadingPanels'
import type { CascadeItem, CascadePanel } from '@/types/cascade'

/**
 * 级联堆叠面板。
 *
 * 每次进入下一级，就在左侧基准处推出一个新面板；
 * 上一层右移并让出一条窄条（`--cascade-peek`），
 * 既保留导航路径，也可点击回退。
 */
const props = defineProps<{
  /** 一级面板 */
  root: CascadePanel
}>()

const emit = defineEmits<{
  /** 请求跳转（站内路径或锚点） */
  navigate: [href: string]
}>()

/** 面板舞台根元素 */
const stageRef = ref<HTMLElement | null>(null)
/** 当前栈：stack[0] 为一级面板，末尾为栈顶 */
const stack = ref<CascadePanel[]>([props.root])
/** 栈顶索引 */
const topIndex = computed(() => stack.value.length - 1)

/** 是否处于减少动效偏好 */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const { isSliding, applyLayout, play, dispose } = useCascadingPanels({
  rootRef: stageRef,
  topIndex,
  prefersReducedMotion,
})

/** 由条目构造子面板 */
function panelFromItem(item: CascadeItem): CascadePanel {
  return { id: item.id, title: item.label, items: item.children ?? [] }
}

/** 进入下一级（点击 kind === 'panel' 的条目） */
function enter(item: CascadeItem): void {
  if (isSliding.value) return
  if (item.kind === 'panel') {
    stack.value = [...stack.value, panelFromItem(item)]
    return
  }
  if (item.kind === 'external' && item.href) {
    window.open(item.href, '_blank', 'noopener,noreferrer')
    return
  }
  if (item.href) emit('navigate', item.href)
}

/** 回退到指定层级（点击父层窄条或返回按钮） */
function backTo(index: number): void {
  if (isSliding.value || index >= topIndex.value) return
  stack.value = stack.value.slice(0, index + 1)
}

/** 回退一级 */
function back(): void {
  backTo(topIndex.value - 1)
}

/** 重置到一级面板（菜单打开/关闭时调用） */
function reset(): void {
  stack.value = [props.root]
}

/**
 * 栈变化后播放推进/回退过渡。
 *
 * 用 flush: 'post' 而不是额外的 requestAnimationFrame：
 * watch 默认在 DOM 更新前触发，此时新层的节点尚未挂载、取不到尺寸；
 * 而若再推到下一帧，新层会先以「最终布局」被浏览器绘制一帧，
 * 表现为白色面板在正确位置闪一下再被拉回右侧重播动画（实测：点击后 17ms
 * 新层的 rect 已在终点且 opacity 为 1）。flush: 'post' 在 DOM 更新后、
 * 绘制前同步执行，gsap.set 因而能赶在本帧绘制之前把起点写好。
 */
let lastDepth = 0
watch(
  topIndex,
  (next) => {
    const direction = next > lastDepth ? 'forward' : 'back'
    lastDepth = next
    play(direction)
  },
  { flush: 'post' },
)

onMounted(() => {
  requestAnimationFrame(() => applyLayout())
})

onBeforeUnmount(() => {
  dispose()
})

/**
 * 处理 Esc：优先逐级回退。
 *
 * @returns 是否已消费该按键（true 表示仍在深层，不应关闭整个菜单）
 */
function handleEscape(): boolean {
  if (topIndex.value <= 0) return false
  back()
  return true
}

defineExpose({ reset, back, topIndex, handleEscape })

/** 面板头部显示的层级路径，如「菜单 / 作品 / 塔菲喵译」 */
function breadcrumbFor(index: number): string[] {
  return stack.value.slice(0, index + 1).map((p) => p.title)
}

</script>

<template>
  <div ref="stageRef" class="cascade" :class="{ 'cascade--sliding': isSliding }">
    <section
      v-for="(panel, index) in stack"
      :key="panel.id + '-' + index"
      :data-cascade-index="index"
      class="cascade__layer"
      :class="{ 'cascade__layer--peek': index < topIndex }"
    >
      <!-- 父层保留的窄条：垂直标题 + 点击回退 -->
      <button
        v-if="index < topIndex"
        type="button"
        class="cascade__peek"
        :aria-label="`返回 ${panel.title}`"
        @click="backTo(index)"
      >
        <span class="cascade__peek-text">{{ panel.title }}</span>
      </button>

      <!--
        非当前层的主体内容对辅助技术与指针都不可达；
        但 inert 不能加在 .cascade__layer 上，否则父层窄条也会一起失效而无法点击回退。
      -->
      <div
        class="cascade__body"
        :inert="index !== topIndex ? true : undefined"
        :aria-hidden="index !== topIndex"
      >
        <header class="cascade__head">
          <button
            v-if="index > 0"
            type="button"
            class="cascade__back"
            :aria-label="`返回 ${stack[index - 1]?.title}`"
            @click="backTo(index - 1)"
          >
            <span aria-hidden="true">←</span>
          </button>
          <span class="cascade__crumb">
            <template v-for="(crumb, ci) in breadcrumbFor(index)" :key="crumb + ci">
              <span v-if="ci > 0" class="cascade__crumb-sep" aria-hidden="true">/</span>
              <span class="cascade__crumb-text">{{ crumb }}</span>
            </template>
          </span>
        </header>

        <nav class="cascade__nav" :aria-label="panel.title">
          <button
            v-for="item in panel.items"
            :key="item.id"
            type="button"
            class="cascade__item"
            :class="`cascade__item--${item.kind}`"
            @click="enter(item)"
          >
            <span class="cascade__item-label">{{ item.label }}</span>
            <span v-if="item.meta" class="cascade__item-meta">{{ item.meta }}</span>
            <span v-if="item.kind === 'panel'" class="cascade__item-arrow" aria-hidden="true">›</span>
            <span v-else-if="item.kind === 'external'" class="cascade__item-arrow" aria-hidden="true">↗</span>
          </button>
        </nav>

        <!-- 根层专属的附加内容（如 Credits / Socials） -->
        <footer v-if="index === 0 && $slots.footer" class="cascade__footer">
          <slot name="footer" />
        </footer>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cascade {
  position: relative;
  width: 100%;
  height: 100%;
  /* 父层露出的窄条宽度；也用于布局递推（见 useCascadingPanels） */
  --cascade-peek: 2.75rem;
}

.cascade__layer {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: min(88vw, 21rem);
  display: flex;
  /* 窄条固定渲染在面板右端（与父层裁剪保留的一侧一致） */
  flex-direction: row-reverse;
  background: #fafafa;
  color: #0a0a0b;
  /* 面板左缘圆角（右侧与父层窄条相接） */
  border-radius: 14px 0 0 14px;
  overflow: hidden;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
  will-change: transform, opacity;
  backface-visibility: hidden;
}

/*
 * 父层：只渲染窄条本身。
 *
 * 早期尝试让父层保持全宽再右移，但它的矩形会盖住自己的窄条、
 * 或反过来被更深层遮住，导致窄条点不到（clip-path / z-index 两种修法
 * 都因为 scale 后的实际矩形与基准宽度不一致而不可靠）。
 *
 * 这里改用最直接的做法：父层收缩为「内容 = 仅窄条」，
 * 面板主体整体不渲染。于是父层矩形与窄条完全重合，
 * 既不遮挡栈顶内容，也必然可点击。
 */
.cascade__layer--peek {
  width: var(--cascade-peek);
  background: transparent;
  box-shadow: none;
  filter: saturate(0.82) brightness(0.94);
}

/* 父层隐藏面板主体，仅保留窄条 */
.cascade__layer--peek .cascade__body {
  display: none;
}

/* ── 父层窄条（点击回退）── */
.cascade__peek {
  flex: 0 0 var(--cascade-peek);
  width: var(--cascade-peek);
  height: 100%;
  padding: 0;
  border: none;
  background: #0a0e1a;
  color: #f2f4f8;
  cursor: pointer;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 1.5rem;
  /* 窄条位于面板右端，右侧为外缘 */
  border-radius: 0 12px 12px 0;
}

.cascade__peek-text {
  /* 竖排标题，节省横向空间 */
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
}

.cascade__peek:hover {
  background: #161c33;
}

/* ── 面板主体 ── */
.cascade__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 1.15rem 1.15rem 1.25rem;
  gap: 0.75rem;
}

/* 根层为浮动的 Close 按钮让出顶部空间 */
.cascade__layer:first-child .cascade__body {
  padding-top: 3.4rem;
}

/* 根层底部附加区（Credits / Socials） */
.cascade__footer {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.85rem;
  border-top: 1px solid rgba(0, 0, 0, 0.07);
}

.cascade__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 1.75rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
}

.cascade__back {
  flex: 0 0 auto;
  width: 1.75rem;
  height: 1.75rem;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  background: #fff;
  color: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background-color 0.2s var(--ease-mechanical, ease), transform 0.2s var(--ease-mechanical, ease);
}

.cascade__back:hover {
  background: #f0f1f4;
  transform: translateX(-2px);
}

.cascade__crumb {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(10, 10, 11, 0.55);
  overflow: hidden;
  white-space: nowrap;
}

.cascade__crumb-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.cascade__crumb-sep {
  opacity: 0.45;
}

/* ── 条目列表 ── */
.cascade__nav {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  /* 细滚动条，避免破坏极简观感 */
  scrollbar-width: thin;
}

.cascade__item {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  width: 100%;
  padding: 0.7rem 0.6rem;
  border: none;
  border-radius: 8px;
  background: none;
  color: inherit;
  text-align: left;
  font-family: var(--font-sans, system-ui, sans-serif);
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background-color 0.22s var(--ease-mechanical, ease), transform 0.22s var(--ease-mechanical, ease);
}

.cascade__item:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: translateX(3px);
}

.cascade__item:focus-visible {
  outline: 2px solid #1a52e8;
  outline-offset: 1px;
}

.cascade__item-label {
  flex: 1 1 auto;
  min-width: 0;
}

.cascade__item-meta {
  flex: 0 0 auto;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  font-weight: 400;
  color: rgba(10, 10, 11, 0.48);
}

.cascade__item-arrow {
  flex: 0 0 auto;
  font-size: 1rem;
  color: rgba(10, 10, 11, 0.35);
  transition: transform 0.22s var(--ease-mechanical, ease);
}

.cascade__item:hover .cascade__item-arrow {
  transform: translateX(2px);
  color: rgba(10, 10, 11, 0.7);
}

/* 减少动效偏好：去掉位移类过渡 */
@media (prefers-reduced-motion: reduce) {
  .cascade__item,
  .cascade__back,
  .cascade__item-arrow {
    transition: none;
  }
  .cascade__item:hover {
    transform: none;
  }
}
</style>
