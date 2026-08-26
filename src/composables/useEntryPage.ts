import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import gsap from 'gsap'
import {
  playStaggeredMaskedTextHide,
  playStaggeredMaskedTextReveal,
  setMaskedTextHidden,
  STAGGERED_MASKED_TEXT_DEFAULTS,
} from '@/composables/useStaggeredMaskedTextReveal'

/** 菜单导航项 */
export interface EntryMenuItem {
  id: string
  label: string
  href: string
  index: string
}

/** 白色面板与色带统一用 scaleX 从右缘扫入 */
const MENU_LAYER_ORIGIN = 'right center'
/** 层间递进间隔（秒）— 黑 → 青 → 面板 */
const LAYER_STAGGER = 0.11
/** 单层展开时长 */
const LAYER_DURATION = 0.58
/** 菜单开合缓动：起步利落、收尾丝滑 */
const MENU_LAYER_EASE = 'power4.out'
const MENU_PANEL_EASE = 'power3.inOut'
const MENU_BACKDROP_EASE = 'power2.out'

/** 入口页 GSAP 编排：Hero 错落入场 + 工业风侧栏 + 页面退场 */
export function useEntryPage(rootRef: Ref<HTMLElement | null>) {
  const menuOpen = ref(false)
  const isAnimating = ref(false)
  const isExiting = ref(false)

  let ctx: gsap.Context | null = null
  let menuTimeline: gsap.core.Timeline | null = null

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /** Hero 区入场：面板与文字从下方错落升起 */
  function playHeroEntrance(): void {
    if (!rootRef.value) return

    const panels = rootRef.value.querySelectorAll('[data-hero-panel]')
    const lines = rootRef.value.querySelectorAll('[data-hero-line]')
    const blocks = rootRef.value.querySelectorAll('[data-hero-block]')

    if (prefersReducedMotion()) {
      gsap.set([...panels, ...lines, ...blocks], { y: 0, opacity: 1 })
      return
    }

    gsap.set(panels, { y: 28, opacity: 0, force3D: true })
    gsap.set(lines, { scaleX: 0, transformOrigin: 'left center', force3D: true })
    gsap.set(blocks, { y: 18, opacity: 0, force3D: true })

    gsap
      .timeline({ defaults: { ease: 'power4.out' } })
      .to(panels, {
        y: 0,
        opacity: 1,
        duration: 0.82,
        stagger: 0.12,
        force3D: true,
      })
      .to(
        lines,
        {
          scaleX: 1,
          duration: 0.72,
          stagger: 0.08,
          ease: 'expo.out',
          force3D: true,
        },
        '-=0.52',
      )
      .to(
        blocks,
        {
          y: 0,
          opacity: 1,
          duration: 0.68,
          stagger: 0.07,
          ease: 'power3.out',
          force3D: true,
        },
        '-=0.48',
      )
  }

  /** 页面退场：内容收拢后执行导航回调 */
  function playPageExit(onComplete: () => void): void {
    if (!rootRef.value || isExiting.value) return

    isExiting.value = true

    if (prefersReducedMotion()) {
      onComplete()
      return
    }

    const shell = rootRef.value.querySelector('[data-entry-shell]')
    const header = rootRef.value.querySelector('[data-entry-header]')
    const veil = rootRef.value.querySelector('[data-exit-veil]')

    gsap
      .timeline({
        defaults: { ease: 'power3.inOut' },
        onComplete,
      })
      .to(shell, { y: -18, opacity: 0, duration: 0.48, force3D: true }, 0)
      .to(header, { y: -10, opacity: 0, duration: 0.38, force3D: true }, 0.04)
      .to(veil, { opacity: 1, duration: 0.55, ease: 'power2.in' }, 0.12)
  }

  /** 获取菜单三层 DOM 与文本遮罩节点 */
  function getMenuLayers(root: HTMLElement) {
    return {
      layer1: root.querySelector('[data-menu-layer="1"]'),
      layer2: root.querySelector('[data-menu-layer="2"]'),
      panel: root.querySelector('[data-menu-panel]'),
      backdrop: root.querySelector('[data-menu-backdrop]'),
      navTextEls: root.querySelectorAll('[data-menu-nav-text]'),
      menuTextEls: root.querySelectorAll('[data-menu-text-inner]'),
    }
  }

  function resetMenuTextHidden(root: HTMLElement): void {
    const { navTextEls, menuTextEls } = getMenuLayers(root)
    setMaskedTextHidden(navTextEls)
    setMaskedTextHidden(menuTextEls)
  }

  function initMenuClosed(): void {
    if (!rootRef.value) return

    const { layer1, layer2, panel, backdrop } = getMenuLayers(rootRef.value)

    gsap.set([layer1, layer2, panel], {
      scaleX: 0,
      transformOrigin: MENU_LAYER_ORIGIN,
      force3D: true,
    })
    gsap.set(backdrop, { opacity: 0 })
    resetMenuTextHidden(rootRef.value)
  }

  function playLayerReveal(
    timeline: gsap.core.Timeline,
    layer1: Element | null,
    layer2: Element | null,
    panel: Element | null,
    position = 0,
  ): void {
    const layerProps = {
      scaleX: 1,
      transformOrigin: MENU_LAYER_ORIGIN,
      force3D: true,
    }

    timeline
      .to(layer1, { ...layerProps, duration: LAYER_DURATION, ease: MENU_LAYER_EASE }, position)
      .to(
        layer2,
        { ...layerProps, duration: LAYER_DURATION + 0.04, ease: MENU_PANEL_EASE },
        position + LAYER_STAGGER,
      )
      .to(
        panel,
        { ...layerProps, duration: LAYER_DURATION + 0.08, ease: MENU_PANEL_EASE },
        position + LAYER_STAGGER * 2,
      )
  }

  function playLayerHide(
    timeline: gsap.core.Timeline,
    layer1: Element | null,
    layer2: Element | null,
    panel: Element | null,
    position = 0,
  ): void {
    const layerProps = {
      scaleX: 0,
      transformOrigin: MENU_LAYER_ORIGIN,
      force3D: true,
    }

    timeline
      .to(panel, { ...layerProps, duration: 0.48, ease: MENU_PANEL_EASE }, position)
      .to(layer2, { ...layerProps, duration: 0.46, ease: MENU_PANEL_EASE }, position + 0.1)
      .to(layer1, { ...layerProps, duration: 0.44, ease: MENU_LAYER_EASE }, position + 0.2)
  }

  function openMenu(): void {
    if (!rootRef.value || menuOpen.value || isAnimating.value) return

    const reduced = prefersReducedMotion()
    const { layer1, layer2, panel, backdrop, navTextEls, menuTextEls } = getMenuLayers(rootRef.value)

    menuTimeline?.kill()

    gsap.set([layer1, layer2, panel], {
      scaleX: 0,
      transformOrigin: MENU_LAYER_ORIGIN,
      force3D: true,
    })
    gsap.set(backdrop, { opacity: 0 })
    resetMenuTextHidden(rootRef.value)

    menuOpen.value = true
    isAnimating.value = true
    document.body.style.overflow = 'hidden'

    menuTimeline = gsap.timeline({
      onComplete: () => {
        isAnimating.value = false
      },
    })

    if (reduced) {
      gsap.set([layer1, layer2, panel], { scaleX: 1, transformOrigin: MENU_LAYER_ORIGIN })
      gsap.set(backdrop, { opacity: 1 })
      gsap.set([...navTextEls, ...menuTextEls], { yPercent: 0 })
      isAnimating.value = false
      return
    }

    menuTimeline.to(
      backdrop,
      { opacity: 1, duration: 0.75, ease: MENU_BACKDROP_EASE },
      0,
    )

    playLayerReveal(menuTimeline, layer1, layer2, panel, 0)

    const textRevealAt = LAYER_STAGGER * 2 + LAYER_DURATION * 0.42
    playStaggeredMaskedTextReveal(menuTimeline, navTextEls, {
      position: textRevealAt,
      stagger: STAGGERED_MASKED_TEXT_DEFAULTS.stagger,
      duration: STAGGERED_MASKED_TEXT_DEFAULTS.duration,
      ease: STAGGERED_MASKED_TEXT_DEFAULTS.ease,
    })
    playStaggeredMaskedTextReveal(menuTimeline, menuTextEls, {
      position: textRevealAt + 0.1,
      stagger: 0.07,
      duration: 0.64,
      ease: 'expo.out',
    })
  }

  function closeMenu(): void {
    if (!rootRef.value || !menuOpen.value || isAnimating.value) return

    isAnimating.value = true

    const reduced = prefersReducedMotion()
    const { layer1, layer2, panel, backdrop, navTextEls, menuTextEls } = getMenuLayers(rootRef.value)

    menuTimeline?.kill()

    if (reduced) {
      menuOpen.value = false
      document.body.style.overflow = ''
      isAnimating.value = false
      initMenuClosed()
      return
    }

    const allMenuTextEls = [...navTextEls, ...menuTextEls]

    menuTimeline = gsap.timeline({
      onComplete: () => {
        menuOpen.value = false
        document.body.style.overflow = ''
        isAnimating.value = false
        initMenuClosed()
      },
    })

    playStaggeredMaskedTextHide(menuTimeline, allMenuTextEls, { position: 0 })
    playLayerHide(menuTimeline, layer1, layer2, panel, 0.12)
    menuTimeline.to(
      backdrop,
      { opacity: 0, duration: 0.5, ease: 'power2.in' },
      0.2,
    )
  }

  function toggleMenu(): void {
    if (menuOpen.value) closeMenu()
    else openMenu()
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && menuOpen.value) closeMenu()
  }

  onMounted(() => {
    if (!rootRef.value) return
    ctx = gsap.context(() => {
      initMenuClosed()
      playHeroEntrance()
    }, rootRef.value)
    window.addEventListener('keydown', onKeydown)
  })

  onUnmounted(() => {
    menuTimeline?.kill()
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
    ctx?.revert()
  })

  return {
    menuOpen,
    isExiting,
    toggleMenu,
    openMenu,
    closeMenu,
    playPageExit,
  }
}
