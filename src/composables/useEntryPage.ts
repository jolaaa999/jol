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

/** 白色面板 clip-path：从左向右裁切，从浏览器右缘向左露出 */
const MENU_PANEL_CLIP_CLOSED = 'inset(0 0 0 100%)'
const MENU_PANEL_CLIP_OPEN = 'inset(0 0 0 0)'

/** 菜单开合缓动：与 --ease-damped 一致的机械阻尼感 */
const MENU_EASE = 'power2.inOut'

/** 入口页 GSAP 编排：Hero 逐字坠落 + 三层递进覆盖菜单 */
export function useEntryPage(rootRef: Ref<HTMLElement | null>) {
  const menuOpen = ref(false)
  const isAnimating = ref(false)

  let ctx: gsap.Context | null = null
  let menuTimeline: gsap.core.Timeline | null = null

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /** Hero 区入场：标题逐字从上方掉入遮罩，块级内容紧随其后（仅位移，不透明度保持 1） */
  function playHeroEntrance(): void {
    if (!rootRef.value) return

    const chars = rootRef.value.querySelectorAll('[data-hero-char]')
    const blocks = rootRef.value.querySelectorAll('[data-hero-block]')

    if (prefersReducedMotion()) {
      gsap.set([...chars, ...blocks], { yPercent: 0, opacity: 1 })
      return
    }

    /* 渐变字不可配合 opacity:0，仅用 yPercent 藏在遮罩顶外 */
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

  /** 获取菜单三层 DOM 与文本遮罩节点 */
  function getMenuLayers(root: HTMLElement) {
    return {
      layer1: root.querySelector('[data-menu-layer="1"]'),
      layer2: root.querySelector('[data-menu-layer="2"]'),
      panel: root.querySelector('[data-menu-panel]'),
      backdrop: root.querySelector('[data-menu-backdrop]'),
      /** 导航主项：HOME / POETRY 等，优先错落展开 */
      navTextEls: root.querySelectorAll('[data-menu-nav-text]'),
      /** 其余菜单文本：Close / Credits / Footer */
      menuTextEls: root.querySelectorAll('[data-menu-text-inner]'),
    }
  }

  /** 重置全部菜单内层文本为遮罩顶外隐藏 */
  function resetMenuTextHidden(root: HTMLElement): void {
    const { navTextEls, menuTextEls } = getMenuLayers(root)
    setMaskedTextHidden(navTextEls)
    setMaskedTextHidden(menuTextEls)
  }

  /** 菜单层初始：色带 scaleX 收拢于右缘，白面板 clip 隐藏 */
  function initMenuClosed(): void {
    if (!rootRef.value) return

    const { layer1, layer2, panel, backdrop } = getMenuLayers(rootRef.value)

    gsap.set([layer1, layer2], {
      scaleX: 0,
      transformOrigin: 'right center',
      force3D: true,
    })
    gsap.set(panel, { clipPath: MENU_PANEL_CLIP_CLOSED })
    gsap.set(backdrop, { opacity: 0 })
    resetMenuTextHidden(rootRef.value)
  }

  /** 菜单打开：黑 → 紫 → 白，从浏览器右缘连续向左展开（无缝隙） */
  function openMenu(): void {
    if (!rootRef.value || menuOpen.value || isAnimating.value) return

    menuOpen.value = true
    isAnimating.value = true
    document.body.style.overflow = 'hidden'

    const reduced = prefersReducedMotion()
    const { layer1, layer2, panel, backdrop, navTextEls, menuTextEls } = getMenuLayers(rootRef.value)

    menuTimeline?.kill()
    menuTimeline = gsap.timeline({
      onComplete: () => {
        isAnimating.value = false
      },
    })

    if (reduced) {
      gsap.set([layer1, layer2], { scaleX: 1, transformOrigin: 'right center' })
      gsap.set(panel, { clipPath: MENU_PANEL_CLIP_OPEN })
      gsap.set(backdrop, { opacity: 1 })
      gsap.set([...navTextEls, ...menuTextEls], { yPercent: 0 })
      isAnimating.value = false
      return
    }

    gsap.set([layer1, layer2], {
      scaleX: 0,
      transformOrigin: 'right center',
      force3D: true,
    })
    gsap.set(panel, { clipPath: MENU_PANEL_CLIP_CLOSED })
    gsap.set(backdrop, { opacity: 0 })
    resetMenuTextHidden(rootRef.value)

    menuTimeline
      .to(backdrop, { opacity: 1, duration: 0.75, ease: 'power2.out' }, 0)
      .to(
        layer1,
        { scaleX: 1, duration: 0.52, ease: MENU_EASE, force3D: true },
        0,
      )
      .to(
        layer2,
        { scaleX: 1, duration: 0.52, ease: MENU_EASE, force3D: true },
        0.09,
      )
      .to(
        panel,
        { clipPath: MENU_PANEL_CLIP_OPEN, duration: 0.62, ease: MENU_EASE },
        0.18,
      )

    playStaggeredMaskedTextReveal(menuTimeline, navTextEls, {
      position: 0.4,
      stagger: STAGGERED_MASKED_TEXT_DEFAULTS.stagger,
      duration: STAGGERED_MASKED_TEXT_DEFAULTS.duration,
      ease: STAGGERED_MASKED_TEXT_DEFAULTS.ease,
    })
    playStaggeredMaskedTextReveal(menuTimeline, menuTextEls, {
      position: '-=0.38',
      stagger: 0.07,
      duration: 0.68,
      ease: 'expo.out',
    })
  }

  /** 菜单关闭：文字收回 → 白 → 紫 → 黑，逆序贴右缘收回 */
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
    menuTimeline
      .to(
        panel,
        { clipPath: MENU_PANEL_CLIP_CLOSED, duration: 0.48, ease: MENU_EASE },
        0.18,
      )
      .to(
        layer2,
        { scaleX: 0, duration: 0.46, ease: MENU_EASE, force3D: true },
        '-=0.34',
      )
      .to(
        layer1,
        { scaleX: 0, duration: 0.44, ease: MENU_EASE, force3D: true },
        '-=0.34',
      )
      .to(backdrop, { opacity: 0, duration: 0.48, ease: 'power2.in' }, '-=0.36')
  }

  function toggleMenu(): void {
    if (menuOpen.value) closeMenu()
    else openMenu()
  }

  onMounted(() => {
    if (!rootRef.value) return
    ctx = gsap.context(() => {
      initMenuClosed()
      playHeroEntrance()
    }, rootRef.value)
  })

  onUnmounted(() => {
    menuTimeline?.kill()
    document.body.style.overflow = ''
    ctx?.revert()
  })

  return {
    menuOpen,
    toggleMenu,
    openMenu,
    closeMenu,
  }
}
