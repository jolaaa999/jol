import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import gsap from 'gsap'

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
const MENU_EASE_OUT = 'power3.out'

/** 入口页 GSAP 编排：Hero 逐字冒起 + 三层递进覆盖菜单 */
export function useEntryPage(rootRef: Ref<HTMLElement | null>) {
  const menuOpen = ref(false)
  const isAnimating = ref(false)

  let ctx: gsap.Context | null = null
  let menuTimeline: gsap.core.Timeline | null = null

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /** Hero 区入场：逐字 / 逐块从下方冒出 */
  function playHeroEntrance(): void {
    if (!rootRef.value) return

    const chars = rootRef.value.querySelectorAll('[data-hero-char]')
    const blocks = rootRef.value.querySelectorAll('[data-hero-block]')

    if (prefersReducedMotion()) {
      gsap.set([...chars, ...blocks], { yPercent: 0, opacity: 1 })
      return
    }

    gsap.set(chars, { yPercent: 115, opacity: 0.2 })
    gsap.set(blocks, { yPercent: 110, opacity: 0 })

    gsap
      .timeline({ defaults: { ease: 'power4.out' } })
      .to(chars, {
        yPercent: 0,
        opacity: 1,
        duration: 0.82,
        stagger: { each: 0.038, ease: 'power2.out' },
      })
      .to(
        blocks,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.72,
          stagger: 0.1,
          ease: 'power3.out',
        },
        '-=0.35',
      )
  }

  /** 获取菜单三层 DOM */
  function getMenuLayers(root: HTMLElement) {
    return {
      layer1: root.querySelector('[data-menu-layer="1"]'),
      layer2: root.querySelector('[data-menu-layer="2"]'),
      panel: root.querySelector('[data-menu-panel]'),
      backdrop: root.querySelector('[data-menu-backdrop]'),
      revealEls: root.querySelectorAll('[data-menu-reveal]'),
    }
  }

  /** 菜单层初始：色带 scaleX 收拢于右缘，白面板 clip 隐藏 */
  function initMenuClosed(): void {
    if (!rootRef.value) return

    const { layer1, layer2, panel, backdrop, revealEls } = getMenuLayers(rootRef.value)

    gsap.set([layer1, layer2], {
      scaleX: 0,
      transformOrigin: 'right center',
      force3D: true,
    })
    gsap.set(panel, { clipPath: MENU_PANEL_CLIP_CLOSED })
    gsap.set(backdrop, { opacity: 0 })
    gsap.set(revealEls, { yPercent: 110, opacity: 0 })
  }

  /** 菜单打开：黑 → 紫 → 白，从浏览器右缘连续向左展开（无缝隙） */
  function openMenu(): void {
    if (!rootRef.value || menuOpen.value || isAnimating.value) return

    menuOpen.value = true
    isAnimating.value = true
    document.body.style.overflow = 'hidden'

    const reduced = prefersReducedMotion()
    const { layer1, layer2, panel, backdrop, revealEls } = getMenuLayers(rootRef.value)

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
      gsap.set(revealEls, { yPercent: 0, opacity: 1 })
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
    gsap.set(revealEls, { yPercent: 110, opacity: 0 })

    menuTimeline
      .to(backdrop, { opacity: 1, duration: 0.75, ease: 'power2.out' }, 0)
      /* 黑色条：贴右缘 scaleX 展开，像从屏幕侧面推出 */
      .to(
        layer1,
        { scaleX: 1, duration: 0.52, ease: MENU_EASE, force3D: true },
        0,
      )
      /* 紫色条：紧挨黑色向左延伸，时序重叠保证连贯 */
      .to(
        layer2,
        { scaleX: 1, duration: 0.52, ease: MENU_EASE, force3D: true },
        0.09,
      )
      /* 白色面板：clip 从左向右打开，文字不被 scale 挤压 */
      .to(
        panel,
        { clipPath: MENU_PANEL_CLIP_OPEN, duration: 0.62, ease: MENU_EASE },
        0.18,
      )
      .to(
        revealEls,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.68,
          stagger: { each: 0.052, ease: 'power2.out' },
          ease: MENU_EASE_OUT,
        },
        0.42,
      )
  }

  /** 菜单关闭：文字收回 → 白 → 紫 → 黑，逆序贴右缘收回 */
  function closeMenu(): void {
    if (!rootRef.value || !menuOpen.value || isAnimating.value) return

    isAnimating.value = true

    const reduced = prefersReducedMotion()
    const { layer1, layer2, panel, backdrop, revealEls } = getMenuLayers(rootRef.value)

    menuTimeline?.kill()

    if (reduced) {
      menuOpen.value = false
      document.body.style.overflow = ''
      isAnimating.value = false
      initMenuClosed()
      return
    }

    menuTimeline = gsap.timeline({
      onComplete: () => {
        menuOpen.value = false
        document.body.style.overflow = ''
        isAnimating.value = false
        initMenuClosed()
      },
    })

    menuTimeline
      .to(revealEls, {
        yPercent: 110,
        opacity: 0,
        duration: 0.22,
        stagger: { each: 0.014, ease: 'power2.in' },
        ease: 'power2.in',
      })
      .to(
        panel,
        { clipPath: MENU_PANEL_CLIP_CLOSED, duration: 0.48, ease: MENU_EASE },
        '-=0.02',
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
