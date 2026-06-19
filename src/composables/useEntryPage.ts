import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import gsap from 'gsap'

/** 菜单导航项 */
export interface EntryMenuItem {
  id: string
  label: string
  href: string
}

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

  /** 菜单层初始：全部收在抽屉左缘外侧（不在浏览器右缘） */
  function initMenuClosed(): void {
    if (!rootRef.value) return

    const { layer1, layer2, panel, backdrop, revealEls } = getMenuLayers(rootRef.value)

    gsap.set([layer1, layer2, panel], { xPercent: -100 })
    gsap.set(backdrop, { opacity: 0 })
    gsap.set(revealEls, { yPercent: 110, opacity: 0 })
  }

  /** 菜单打开：两层色带先从左缘递进展开，白面板最后覆盖其上 */
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
      gsap.set([layer1, layer2, panel], { xPercent: 0 })
      gsap.set(backdrop, { opacity: 1 })
      gsap.set(revealEls, { yPercent: 0, opacity: 1 })
      isAnimating.value = false
      return
    }

    gsap.set([layer1, layer2, panel], { xPercent: -100 })
    gsap.set(backdrop, { opacity: 0 })
    gsap.set(revealEls, { yPercent: 110, opacity: 0 })

    menuTimeline
      .to(backdrop, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
      /* 深色内层最先从左缘露出 */
      .to(layer1, { xPercent: 0, duration: 0.52, ease: 'power3.inOut' }, 0.05)
      /* 紫色中层覆盖深色带右侧 */
      .to(layer2, { xPercent: 0, duration: 0.54, ease: 'power3.inOut' }, '+=0.12')
      /* 白面板最后从左缘滑入，覆盖紫色带 */
      .to(panel, { xPercent: 0, duration: 0.6, ease: 'power3.inOut' }, '+=0.12')
      .to(
        revealEls,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.76,
          stagger: { each: 0.085, ease: 'power2.out' },
          ease: 'power4.out',
        },
        '-=0.12',
      )
  }

  /** 菜单关闭：文字收回 → 白面板 → 紫带 → 深带，逆序收回左缘 */
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
        duration: 0.28,
        stagger: 0.025,
        ease: 'power2.in',
      })
      .to(panel, { xPercent: -100, duration: 0.52, ease: 'power3.inOut' }, '-=0.06')
      .to(layer2, { xPercent: -100, duration: 0.5, ease: 'power3.inOut' }, '+=0.08')
      .to(layer1, { xPercent: -100, duration: 0.48, ease: 'power3.inOut' }, '+=0.08')
      .to(backdrop, { opacity: 0, duration: 0.38, ease: 'power2.in' }, '-=0.32')
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
