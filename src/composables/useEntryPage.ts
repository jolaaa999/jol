import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import gsap from 'gsap'

/** 菜单导航项 */
export interface EntryMenuItem {
  id: string
  label: string
  href: string
}

/** 入口页 GSAP 编排：Hero 逐字冒起 + 多层菜单展开 */
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

  /** 菜单层与面板初始：全部在视口右侧外 */
  function initMenuClosed(): void {
    if (!rootRef.value) return

    const layers = rootRef.value.querySelectorAll('[data-menu-layer]')
    const panel = rootRef.value.querySelector('[data-menu-panel]')
    const backdrop = rootRef.value.querySelector('[data-menu-backdrop]')
    const revealEls = rootRef.value.querySelectorAll('[data-menu-reveal]')

    gsap.set(layers, { xPercent: 100 })
    gsap.set(panel, { xPercent: 100 })
    gsap.set(backdrop, { opacity: 0 })
    gsap.set(revealEls, { yPercent: 110, opacity: 0 })
  }

  /** 菜单打开：色带递进滑入 → 文字逐条从遮罩下冒出 */
  function openMenu(): void {
    if (!rootRef.value || menuOpen.value || isAnimating.value) return

    menuOpen.value = true
    isAnimating.value = true
    document.body.style.overflow = 'hidden'

    const reduced = prefersReducedMotion()
    const layers = rootRef.value.querySelectorAll('[data-menu-layer]')
    const panel = rootRef.value.querySelector('[data-menu-panel]')
    const backdrop = rootRef.value.querySelector('[data-menu-backdrop]')
    const revealEls = rootRef.value.querySelectorAll('[data-menu-reveal]')

    menuTimeline?.kill()
    menuTimeline = gsap.timeline({
      onComplete: () => {
        isAnimating.value = false
      },
    })

    if (reduced) {
      gsap.set([layers, panel], { xPercent: 0 })
      gsap.set(backdrop, { opacity: 1 })
      gsap.set(revealEls, { yPercent: 0, opacity: 1 })
      isAnimating.value = false
      return
    }

    gsap.set(layers, { xPercent: 100 })
    gsap.set(panel, { xPercent: 100 })
    gsap.set(backdrop, { opacity: 0 })
    gsap.set(revealEls, { yPercent: 110, opacity: 0 })

    menuTimeline
      .to(backdrop, { opacity: 1, duration: 0.55, ease: 'power2.out' }, 0)
      .to(
        layers,
        {
          xPercent: 0,
          duration: 0.72,
          stagger: 0.1,
          ease: 'power3.inOut',
        },
        0.04,
      )
      .to(
        panel,
        {
          xPercent: 0,
          duration: 0.68,
          ease: 'power3.inOut',
        },
        '-=0.48',
      )
      .to(
        revealEls,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.78,
          stagger: { each: 0.085, ease: 'power2.out' },
          ease: 'power4.out',
        },
        '-=0.22',
      )
  }

  /** 菜单关闭：文字先收回 → 面板与色带逆序滑出 */
  function closeMenu(): void {
    if (!rootRef.value || !menuOpen.value || isAnimating.value) return

    isAnimating.value = true

    const reduced = prefersReducedMotion()
    const layers = rootRef.value.querySelectorAll('[data-menu-layer]')
    const panel = rootRef.value.querySelector('[data-menu-panel]')
    const backdrop = rootRef.value.querySelector('[data-menu-backdrop]')
    const revealEls = rootRef.value.querySelectorAll('[data-menu-reveal]')

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
      .to(
        panel,
        {
          xPercent: 100,
          duration: 0.52,
          ease: 'power3.inOut',
        },
        '-=0.08',
      )
      .to(
        layers,
        {
          xPercent: 100,
          duration: 0.55,
          stagger: 0.05,
          ease: 'power3.inOut',
        },
        '-=0.38',
      )
      .to(
        backdrop,
        {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
        },
        '-=0.42',
      )
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
