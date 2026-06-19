import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import gsap from 'gsap'

/** 菜单导航项 */
export interface EntryMenuItem {
  id: string
  label: string
  href: string
}

/** 入口页 GSAP 编排：Hero 逐字冒起 + 多层菜单展开 */
export function useEntryPage(
  rootRef: Ref<HTMLElement | null>,
  menuItems: EntryMenuItem[],
) {
  const menuOpen = ref(false)
  const isAnimating = ref(false)

  let ctx: gsap.Context | null = null
  let menuTimeline: gsap.core.Timeline | null = null

  /** Hero 区入场：逐字 / 逐块从下方冒出 */
  function playHeroEntrance(): void {
    if (!rootRef.value) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const chars = rootRef.value.querySelectorAll('[data-hero-char]')
    const blocks = rootRef.value.querySelectorAll('[data-hero-block]')

    if (reduced) {
      gsap.set([...chars, ...blocks], { yPercent: 0, opacity: 1 })
      return
    }

    gsap.set(chars, { yPercent: 115, opacity: 0.2 })
    gsap.set(blocks, { yPercent: 110, opacity: 0 })

    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })

    tl.to(chars, {
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

  /** 菜单打开：三层色带递进滑入 + 链接逐条冒起 */
  function openMenu(): void {
    if (!rootRef.value || menuOpen.value || isAnimating.value) return

    menuOpen.value = true
    isAnimating.value = true

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const layers = rootRef.value.querySelectorAll('[data-menu-layer]')
    const panel = rootRef.value.querySelector('[data-menu-panel]')
    const items = rootRef.value.querySelectorAll('[data-menu-item-inner]')
    const closeBtn = rootRef.value.querySelector('[data-menu-close-inner]')
    const credits = rootRef.value.querySelector('[data-menu-credits-inner]')
    const footer = rootRef.value.querySelectorAll('[data-menu-footer-inner]')

    menuTimeline?.kill()
    menuTimeline = gsap.timeline({
      onComplete: () => {
        isAnimating.value = false
      },
    })

    if (reduced) {
      gsap.set([layers, panel], { xPercent: 0, opacity: 1 })
      gsap.set([items, closeBtn, credits, ...footer], { yPercent: 0, opacity: 1 })
      isAnimating.value = false
      return
    }

    gsap.set(layers, { xPercent: 108, opacity: 1 })
    gsap.set(panel, { xPercent: 108, opacity: 1 })
    gsap.set([items, closeBtn, credits, ...footer], { yPercent: 115, opacity: 0 })

    menuTimeline
      .to(layers, {
        xPercent: 0,
        duration: 0.78,
        stagger: 0.09,
        ease: 'power3.inOut',
      })
      .to(
        panel,
        {
          xPercent: 0,
          duration: 0.68,
          ease: 'power3.inOut',
        },
        '-=0.52',
      )
      .to(
        closeBtn,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.55,
          ease: 'power4.out',
        },
        '-=0.28',
      )
      .to(
        items,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.72,
          stagger: { each: 0.09, ease: 'power2.out' },
          ease: 'power4.out',
        },
        '-=0.38',
      )
      .to(
        credits,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power3.out',
        },
        '-=0.42',
      )
      .to(
        footer,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.06,
          ease: 'power3.out',
        },
        '-=0.35',
      )
  }

  /** 菜单关闭：逆序收回 */
  function closeMenu(): void {
    if (!rootRef.value || !menuOpen.value || isAnimating.value) return

    isAnimating.value = true

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const layers = rootRef.value.querySelectorAll('[data-menu-layer]')
    const panel = rootRef.value.querySelector('[data-menu-panel]')
    const items = rootRef.value.querySelectorAll('[data-menu-item-inner]')
    const closeBtn = rootRef.value.querySelector('[data-menu-close-inner]')
    const credits = rootRef.value.querySelector('[data-menu-credits-inner]')
    const footer = rootRef.value.querySelectorAll('[data-menu-footer-inner]')

    menuTimeline?.kill()

    if (reduced) {
      menuOpen.value = false
      isAnimating.value = false
      return
    }

    menuTimeline = gsap.timeline({
      onComplete: () => {
        menuOpen.value = false
        isAnimating.value = false
      },
    })

    menuTimeline
      .to([...footer, credits, ...items, closeBtn], {
        yPercent: 115,
        opacity: 0,
        duration: 0.32,
        stagger: 0.03,
        ease: 'power2.in',
      })
      .to(
        panel,
        {
          xPercent: 108,
          duration: 0.55,
          ease: 'power3.inOut',
        },
        '-=0.12',
      )
      .to(
        layers,
        {
          xPercent: 108,
          duration: 0.58,
          stagger: 0.06,
          ease: 'power3.inOut',
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
      playHeroEntrance()
    }, rootRef.value)
  })

  onUnmounted(() => {
    menuTimeline?.kill()
    ctx?.revert()
  })

  return {
    menuOpen,
    menuItems,
    toggleMenu,
    openMenu,
    closeMenu,
  }
}
