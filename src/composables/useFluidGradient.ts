import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

/** 流体渐变配色方案 */
export interface FluidPalette {
  id: string
  blobs: Array<{ x: number; y: number; r: number; color: string }>
  base: [string, string, string]
}

/** 深色背景预设 */
export const FLUID_PALETTES_DARK: FluidPalette[] = [
  {
    id: 'aurora',
    base: ['#0a0520', '#1a0a4a', '#0d2847'],
    blobs: [
      { x: 0.22, y: 0.38, r: 0.42, color: 'rgba(88, 28, 220, 0.72)' },
      { x: 0.68, y: 0.28, r: 0.38, color: 'rgba(32, 96, 255, 0.68)' },
      { x: 0.52, y: 0.72, r: 0.36, color: 'rgba(0, 180, 220, 0.45)' },
      { x: 0.82, y: 0.62, r: 0.28, color: 'rgba(180, 60, 255, 0.38)' },
    ],
  },
  {
    id: 'twilight',
    base: ['#120818', '#2a1048', '#0f1a3a'],
    blobs: [
      { x: 0.35, y: 0.45, r: 0.4, color: 'rgba(140, 40, 200, 0.65)' },
      { x: 0.75, y: 0.35, r: 0.35, color: 'rgba(255, 80, 120, 0.42)' },
      { x: 0.55, y: 0.78, r: 0.32, color: 'rgba(40, 120, 255, 0.55)' },
    ],
  },
  {
    id: 'deep',
    base: ['#050810', '#0a1830', '#101828'],
    blobs: [
      { x: 0.28, y: 0.32, r: 0.44, color: 'rgba(0, 140, 200, 0.58)' },
      { x: 0.62, y: 0.55, r: 0.38, color: 'rgba(60, 40, 180, 0.62)' },
      { x: 0.48, y: 0.82, r: 0.3, color: 'rgba(0, 212, 170, 0.28)' },
    ],
  },
]

/** 浅色背景预设 — 天蓝 / 淡青 */
export const FLUID_PALETTES_LIGHT: FluidPalette[] = [
  {
    id: 'sky-dawn',
    base: ['#eef8ff', '#dceefb', '#e8f7fc'],
    blobs: [
      { x: 0.2, y: 0.35, r: 0.46, color: 'rgba(125, 211, 252, 0.62)' },
      { x: 0.72, y: 0.28, r: 0.4, color: 'rgba(103, 232, 249, 0.55)' },
      { x: 0.48, y: 0.74, r: 0.38, color: 'rgba(165, 243, 252, 0.5)' },
      { x: 0.84, y: 0.58, r: 0.3, color: 'rgba(186, 230, 253, 0.45)' },
    ],
  },
  {
    id: 'mist-cyan',
    base: ['#f0f9ff', '#e0f2fe', '#ecfeff'],
    blobs: [
      { x: 0.32, y: 0.42, r: 0.42, color: 'rgba(56, 189, 248, 0.48)' },
      { x: 0.68, y: 0.38, r: 0.36, color: 'rgba(34, 211, 238, 0.42)' },
      { x: 0.55, y: 0.78, r: 0.34, color: 'rgba(147, 197, 253, 0.38)' },
    ],
  },
  {
    id: 'cloud-aqua',
    base: ['#f8fcff', '#dff6f8', '#e6f4ff'],
    blobs: [
      { x: 0.26, y: 0.3, r: 0.44, color: 'rgba(14, 165, 233, 0.35)' },
      { x: 0.64, y: 0.52, r: 0.4, color: 'rgba(45, 212, 191, 0.32)' },
      { x: 0.5, y: 0.8, r: 0.32, color: 'rgba(96, 165, 250, 0.28)' },
    ],
  },
]

/** @deprecated 使用 FLUID_PALETTES_DARK */
export const FLUID_PALETTES = FLUID_PALETTES_DARK

/** Canvas 流体渐变背景 — 多 blob 叠加 + 缓慢漂移 */
export function useFluidGradient(canvasRef: Ref<HTMLCanvasElement | null>) {
  const { resolved } = useTheme()
  const paletteIndex = ref(0)

  let rafId = 0
  let startTime = 0
  let width = 0
  let height = 0
  let paused = false
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function getPalettes(): FluidPalette[] {
    return resolved.value === 'light' ? FLUID_PALETTES_LIGHT : FLUID_PALETTES_DARK
  }

  function getPalette(): FluidPalette {
    const palettes = getPalettes()
    return palettes[paletteIndex.value % palettes.length]!
  }

  function resize(): void {
    const canvas = canvasRef.value
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = canvas.clientWidth
    height = canvas.clientHeight
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    const ctx = canvas.getContext('2d')
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function drawFrame(now: number): void {
    const canvas = canvasRef.value
    if (!canvas || width === 0 || height === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isLight = resolved.value === 'light'
    const t = reducedMotion ? 0 : (now - startTime) * 0.00018
    const palette = getPalette()
    const [c0, c1, c2] = palette.base

    const grad = ctx.createLinearGradient(0, 0, width, height)
    grad.addColorStop(0, c0)
    grad.addColorStop(0.5, c1)
    grad.addColorStop(1, c2)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)

    ctx.globalCompositeOperation = isLight ? 'multiply' : 'screen'
    for (let i = 0; i < palette.blobs.length; i++) {
      const blob = palette.blobs[i]!
      const phase = t + i * 1.7
      const bx = (blob.x + Math.sin(phase) * 0.06) * width
      const by = (blob.y + Math.cos(phase * 0.85) * 0.05) * height
      const br = blob.r * Math.min(width, height)

      const radial = ctx.createRadialGradient(bx, by, 0, bx, by, br)
      radial.addColorStop(0, blob.color)
      radial.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = radial
      ctx.fillRect(0, 0, width, height)
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  function draw(now: number): void {
    drawFrame(now)
    if (!paused && !reducedMotion) {
      rafId = requestAnimationFrame(draw)
    }
  }

  function startLoop(): void {
    cancelAnimationFrame(rafId)
    if (reducedMotion) {
      drawFrame(performance.now())
      return
    }
    rafId = requestAnimationFrame(draw)
  }

  function onVisibilityChange(): void {
    paused = document.hidden
    if (paused) {
      cancelAnimationFrame(rafId)
    } else {
      startLoop()
    }
  }

  function cyclePalette(): void {
    paletteIndex.value = (paletteIndex.value + 1) % getPalettes().length
    if (reducedMotion || paused) {
      drawFrame(performance.now())
    }
  }

  watch(resolved, () => {
    paletteIndex.value = 0
    drawFrame(performance.now())
  })

  onMounted(() => {
    resize()
    startTime = performance.now()
    startLoop()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { paletteIndex, cyclePalette }
}
