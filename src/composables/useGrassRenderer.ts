import { onMounted, onUnmounted, type Ref } from 'vue'
import { sharedPerlin } from '@/utils/perlinNoise'

export interface GrassLayerConfig {
  blur: number
  density: number
  minHeight: number
  maxHeight: number
  baseYRatio: number
  opacity: number
}

interface GrassBlade {
  x: number
  baseY: number
  height: number
  width: number
  lean: number
  phase: number
  layer: number
  hueShift: number
}

const LAYERS: GrassLayerConfig[] = [
  { blur: 5, density: 0.55, minHeight: 18, maxHeight: 42, baseYRatio: 0.58, opacity: 0.55 },
  { blur: 2.5, density: 0.75, minHeight: 32, maxHeight: 72, baseYRatio: 0.62, opacity: 0.78 },
  { blur: 0, density: 1, minHeight: 48, maxHeight: 110, baseYRatio: 0.66, opacity: 1 },
]

/** 太阳方向 — 屏幕左上角 */
const SUN_DIR = { x: -0.85, y: -0.52 }

function buildBlades(width: number, height: number): GrassBlade[] {
  const blades: GrassBlade[] = []

  for (let layer = 0; layer < LAYERS.length; layer++) {
    const cfg = LAYERS[layer]
    const count = Math.floor(width * cfg.density * (layer === 2 ? 1.4 : 1))
    const baseY = height * cfg.baseYRatio

    for (let i = 0; i < count; i++) {
      blades.push({
        x: (i / count) * width + (Math.random() - 0.5) * (width / count) * 1.2,
        baseY: baseY + (Math.random() - 0.5) * height * 0.04,
        height: cfg.minHeight + Math.random() * (cfg.maxHeight - cfg.minHeight),
        width: 1.2 + Math.random() * (layer === 2 ? 2.2 : 1.4),
        lean: (Math.random() - 0.5) * 0.35,
        phase: Math.random() * Math.PI * 2,
        layer,
        hueShift: Math.random(),
      })
    }
  }

  return blades.sort((a, b) => a.layer - b.layer)
}

function drawBlade(
  ctx: CanvasRenderingContext2D,
  blade: GrassBlade,
  sway: number,
  focusX: number,
  focusY: number,
  focusRadius: number,
): void {
  const dx = blade.x - focusX
  const dy = blade.baseY - focusY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const focusBoost = dist < focusRadius ? 1 + (1 - dist / focusRadius) * 0.15 : 1

  const angle = blade.lean + sway * (0.6 + blade.layer * 0.15)
  const h = blade.height * focusBoost
  const tipX = blade.x + Math.sin(angle) * h * 0.35
  const tipY = blade.baseY - h
  const ctrlX = blade.x + Math.sin(angle * 0.5) * h * 0.18
  const ctrlY = blade.baseY - h * 0.55

  const lit = 0.35 + Math.max(0, -SUN_DIR.x * Math.sin(angle) - SUN_DIR.y * 0.3) * 0.65
  const ao = 0.25 + blade.layer * 0.12
  const cfg = LAYERS[blade.layer]

  const baseG = Math.floor(38 + blade.hueShift * 18 + lit * 12)
  const tipG = Math.floor(95 + lit * 55 + blade.hueShift * 20)
  const baseR = Math.floor(12 + ao * 8)
  const tipR = Math.floor(48 + lit * 30)

  ctx.beginPath()
  ctx.moveTo(blade.x - blade.width * 0.4, blade.baseY)
  ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY)
  ctx.lineTo(tipX + blade.width * 0.35, tipY + 1)
  ctx.quadraticCurveTo(ctrlX + blade.width * 0.2, ctrlY, blade.x + blade.width * 0.4, blade.baseY)
  ctx.closePath()

  const grad = ctx.createLinearGradient(blade.x, blade.baseY, tipX, tipY)
  grad.addColorStop(0, `rgba(${baseR}, ${baseG}, ${Math.floor(22 + ao * 6)}, ${cfg.opacity})`)
  grad.addColorStop(0.45, `rgba(${baseR + 8}, ${baseG + 18}, ${28 + blade.layer * 4}, ${cfg.opacity * 0.95})`)
  grad.addColorStop(1, `rgba(${tipR}, ${tipG}, ${42 + blade.layer * 8}, ${cfg.opacity * 0.88})`)
  ctx.fillStyle = grad
  ctx.fill()
}

export function useGrassRenderer(
  canvasRef: Ref<HTMLCanvasElement | null>,
  focusRef: Ref<{ x: number; y: number }>,
) {
  let blades: GrassBlade[] = []
  let rafId = 0

  function render(time: number): void {
    const canvas = canvasRef.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      blades = buildBlades(w, h)
    }

    ctx.clearRect(0, 0, w, h)

    const focus = focusRef.value
    const focusRadius = Math.min(w, h) * 0.22

    for (let layer = 0; layer < LAYERS.length; layer++) {
      const cfg = LAYERS[layer]
      ctx.save()
      if (cfg.blur > 0) {
        ctx.filter = `blur(${cfg.blur}px)`
      }

      for (const blade of blades) {
        if (blade.layer !== layer) continue
        const wind = sharedPerlin.sampleWindField(blade.x, blade.baseY, time, 0.0025, 3)
        const sway =
          wind.x * 0.35 +
          Math.sin(time * 0.0008 + blade.phase) * 0.04 +
          sharedPerlin.fbm(blade.x * 0.01, time * 0.0002, 2) * 0.08
        drawBlade(ctx, blade, sway, focus.x, focus.y, focusRadius)
      }

      ctx.restore()
    }

    const groundAo = ctx.createLinearGradient(0, h * 0.52, 0, h)
    groundAo.addColorStop(0, 'rgba(6, 16, 8, 0)')
    groundAo.addColorStop(1, 'rgba(4, 10, 5, 0.42)')
    ctx.fillStyle = groundAo
    ctx.fillRect(0, h * 0.52, w, h * 0.48)

    rafId = requestAnimationFrame(render)
  }

  onMounted(() => {
    rafId = requestAnimationFrame(render)
  })

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
  })
}
