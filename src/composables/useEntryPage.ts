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
}

/** 色带变换原点：贴浏览器右缘向外展开 */
const MENU_ORIGIN = 'right center'
/** 层间递推间隔（秒）— 右缘黑 → 紫 → 白 */
const LAYER_STAGGER = 0.15
/** 单层展开时长 */
const LAYER_DURATION = 0.56
/** 开合缓动 */
const MENU_EASE = 'power3.inOut'
/** 白面板 clip：从左侧裁切 100% = 收起于右缘；0 = 完全展开 */
const PANEL_CLIP_CLOSED = 'inset(0 0 0 100%)'
const PANEL_CLIP_OPEN = 'inset(0 0 0 0)'

/** 入口页 GSAP：Hero 入场 + 三色递推菜单 */
export function useEntryPage(rootRef: Ref<HTMLElement | null>) {
  const menuOpen = ref(false)
  const isAnimating = ref(false)
  const isExiting = ref(false)

  let ctx: gsap.Context | null = null
  let menuTimeline: gsap.core.Timeline | null = null

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function playHeroEntrance(): void {
    if (!rootRef.value) return

    const chars = rootRef.value.querySelectorAll('[data-hero-char]')
    const blocks = rootRef.value.querySelectorAll('[data-hero-block]')

    if (prefersReducedMotion()) {
      gsap.set([...chars, ...blocks], { yPercent: 0, opacity: 1 })
      return
    }

    gsap.set(chars, { yPercent: -110, opacity: 1, force3D: true })
    gsap.set(blocks, { yPercent: -110, opacity: 1, force3D: true })

    gsap
      .timeline({ defaults: { ease: 'power4.out' } })
      .to(chars, {
        yPercent: 0,
        duration: 0.74,
        stagger: { each: 0.045, ease: 'power2.out' },
        force3D: true,
      })
      .to(
        blocks,
        {
          yPercent: 0,
          duration: 0.68,
          stagger: 0.1,
          ease: 'expo.out',
          force3D: true,
        },
        '-=0.32',
      )
  }

  function playPageExit(onComplete: () => void): void {
    if (!rootRef.value || isExiting.value) return

    isExiting.value = true

    if (prefersReducedMotion()) {
      onComplete()
      return
    }

    const hero = rootRef.value.querySelector('.entry__hero')
    const works = rootRef.value.querySelector('.works')
    const header = rootRef.value.querySelector('.entry__header')

    gsap
      .timeline({
        defaults: { ease: 'power3.inOut' },
        onComplete,
      })
      .to(hero, { y: -22, opacity: 0, duration: 0.5, force3D: true }, 0)
      .to(works, { y: -16, opacity: 0, duration: 0.48, force3D: true }, 0.04)
      .to(header, { y: -12, opacity: 0, duration: 0.42, force3D: true }, 0.06)
  }

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

  /** 收拢态：色带 scaleX=0，白面板从右缘 clip 收起 */
  function initMenuClosed(): void {
    if (!rootRef.value) return

    const { layer1, layer2, panel, backdrop } = getMenuLayers(rootRef.value)

    gsap.set([layer1, layer2], {
      scaleX: 0,
      transformOrigin: MENU_ORIGIN,
      force3D: true,
    })
    gsap.set(panel, { clipPath: PANEL_CLIP_CLOSED })
    gsap.set(backdrop, { opacity: 0 })
    resetMenuTextHidden(rootRef.value)
  }

  /** 打开：最右黑带最先 → 紫带 → 白面板揭开 → 文字错落入场 */
  function openMenu(): void {
    if (!rootRef.value || menuOpen.value || isAnimating.value) return

    const reduced = prefersReducedMotion()
    const { layer1, layer2, panel, backdrop, navTextEls, menuTextEls } =
      getMenuLayers(rootRef.value)

    menuTimeline?.kill()

    gsap.set([layer1, layer2], {
      scaleX: 0,
      transformOrigin: MENU_ORIGIN,
      force3D: true,
    })
    gsap.set(panel, { clipPath: PANEL_CLIP_CLOSED })
    gsap.set(backdrop, { opacity: 0 })
    resetMenuTextHidden(rootRef.value)

    menuOpen.value = true
    isAnimating.value = true
    document.body.style.overflow = 'hidden'

    const allText = [...navTextEls, ...menuTextEls]

    if (reduced) {
      gsap.set([layer1, layer2], { scaleX: 1, transformOrigin: MENU_ORIGIN })
      gsap.set(panel, { clipPath: PANEL_CLIP_OPEN })
      gsap.set(backdrop, { opacity: 1 })
      gsap.set(allText, { yPercent: 0 })
      isAnimating.value = false
      return
    }

    menuTimeline = gsap.timeline({
      onComplete: () => {
        gsap.set(allText, { yPercent: 0 })
        isAnimating.value = false
      },
    })

    menuTimeline.to(backdrop, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 0)

    /* ① 右缘黑色最先展开 */
    menuTimeline.to(
      layer1,
      { scaleX: 1, duration: LAYER_DURATION, ease: MENU_EASE, force3D: true },
      0,
    )

    /* ② 紫色中间带 */
    menuTimeline.to(
      layer2,
      {
        scaleX: 1,
        duration: LAYER_DURATION + 0.04,
        ease: MENU_EASE,
        force3D: true,
      },
      LAYER_STAGGER,
    )

    /* ③ 白色面板：从右缘 clip 揭开（视觉等同 scaleX，不压扁字） */
    menuTimeline.to(
      panel,
      {
        clipPath: PANEL_CLIP_OPEN,
        duration: LAYER_DURATION + 0.1,
        ease: MENU_EASE,
      },
      LAYER_STAGGER * 2,
    )

    const textAt = LAYER_STAGGER * 2 + LAYER_DURATION * 0.42

    if (navTextEls.length) {
      playStaggeredMaskedTextReveal(menuTimeline, navTextEls, {
        position: textAt,
        stagger: STAGGERED_MASKED_TEXT_DEFAULTS.stagger,
        duration: STAGGERED_MASKED_TEXT_DEFAULTS.duration,
        ease: STAGGERED_MASKED_TEXT_DEFAULTS.ease,
      })
    }

    if (menuTextEls.length) {
      playStaggeredMaskedTextReveal(menuTimeline, menuTextEls, {
        position: textAt + 0.1,
        stagger: 0.07,
        duration: 0.64,
        ease: 'expo.out',
      })
    }
  }

  /** 关闭：文字收回 → 白 → 紫 → 黑 */
  function closeMenu(): void {
    if (!rootRef.value || !menuOpen.value || isAnimating.value) return

    isAnimating.value = true

    const reduced = prefersReducedMotion()
    const { layer1, layer2, panel, backdrop, navTextEls, menuTextEls } =
      getMenuLayers(rootRef.value)

    menuTimeline?.kill()

    if (reduced) {
      menuOpen.value = false
      document.body.style.overflow = ''
      isAnimating.value = false
      initMenuClosed()
      return
    }

    const allText = [...navTextEls, ...menuTextEls]

    menuTimeline = gsap.timeline({
      onComplete: () => {
        menuOpen.value = false
        document.body.style.overflow = ''
        isAnimating.value = false
        initMenuClosed()
      },
    })

    if (allText.length) {
      playStaggeredMaskedTextHide(menuTimeline, allText, { position: 0 })
    }

    menuTimeline
      .to(
        panel,
        { clipPath: PANEL_CLIP_CLOSED, duration: 0.48, ease: MENU_EASE },
        0.12,
      )
      .to(
        layer2,
        { scaleX: 0, duration: 0.46, ease: MENU_EASE, force3D: true },
        0.12 + LAYER_STAGGER * 0.7,
      )
      .to(
        layer1,
        { scaleX: 0, duration: 0.44, ease: MENU_EASE, force3D: true },
        0.12 + LAYER_STAGGER * 1.35,
      )
      .to(backdrop, { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.22)
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
