import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { PhysicsEngine, type Particle, type Vec2 } from './usePhysicsEngine'
import { sharedPerlin } from '@/utils/perlinNoise'

// ─── 类型 ───────────────────────────────────────────────────────────────────

export type DandelionPhase = 'idle' | 'blowing' | 'fading' | 'done'

export interface DandelionPhysicsOptions {
  /** 吹散动画时长 (ms) */
  blowDuration?: number
  /** 淡出时长 (ms) */
  fadeDuration?: number
  /** 动画结束后回调（用于路由跳转） */
  onTransitionComplete?: () => void
}

interface WindTrail {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

interface PappusBristle {
  angle: number
  length: number
  thickness: number
}

interface FluffSeed {
  offsetX: number
  offsetY: number
  x: number
  y: number
  prevX: number
  prevY: number
  vx: number
  vy: number
  mass: number
  friction: number
  bristles: PappusBristle[]
  detached: boolean
  engineId: number
  distFromCenter: number
}

/** 全局光源 — 屏幕左上角 */
const SUN = { x: -0.78, y: -0.62, intensity: 1.15 }

// ─── 风力计算 ─────────────────────────────────────────────────────────────────

function computeMouseWind(
  mouse: Vec2,
  target: Vec2,
  radius: number,
  strength: number,
): Vec2 {
  const dx = mouse.x - target.x
  const dy = mouse.y - target.y
  const distSq = dx * dx + dy * dy
  const rSq = radius * radius
  if (distSq > rSq || distSq < 1) return { x: 0, y: 0 }

  const dist = Math.sqrt(distSq)
  const falloff = (1 - dist / radius) ** 2
  const nx = dx / dist
  const ny = dy / dist

  return {
    x: nx * strength * falloff,
    y: ny * strength * falloff * 0.45,
  }
}

// ─── 渲染辅助 ─────────────────────────────────────────────────────────────────

function drawStem(
  ctx: CanvasRenderingContext2D,
  nodes: readonly { x: number; y: number }[],
): void {
  if (nodes.length < 2) return

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]
    const b = nodes[i + 1]
    const t = i / (nodes.length - 2)
    const width = 4.8 - t * 2.4

    const midX = (a.x + b.x) / 2
    const midY = (a.y + b.y) / 2
    const nx = -(b.y - a.y)
    const ny = b.x - a.x
    const nLen = Math.sqrt(nx * nx + ny * ny) || 1
    const litSide = (nx / nLen) * SUN.x + (ny / nLen) * SUN.y
    const shade = 0.55 + litSide * 0.35 * SUN.intensity

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    const cpx = midX + (b.y - a.y) * 0.035
    const cpy = midY - (b.x - a.x) * 0.035
    ctx.quadraticCurveTo(cpx, cpy, b.x, b.y)

    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
    const r = Math.floor(28 + shade * 22 + t * 8)
    const gv = Math.floor(72 + shade * 38 + t * 12)
    const gb = Math.floor(28 + shade * 14)
    g.addColorStop(0, `rgba(${r}, ${gv}, ${gb}, 0.96)`)
    g.addColorStop(1, `rgba(${r + 12}, ${gv + 8}, ${gb + 6}, 0.92)`)
    ctx.strokeStyle = g
    ctx.lineWidth = width
    ctx.stroke()
  }
  ctx.restore()
}

function drawFluffSeed(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vx: number,
  vy: number,
  bristles: PappusBristle[],
  distFromCenter: number,
  alpha: number,
): void {
  const speed = Math.sqrt(vx * vx + vy * vy)
  const motionAngle = speed > 0.08 ? Math.atan2(vy, vx) : 0
  const edgeFade = 0.45 + (1 - Math.min(distFromCenter / 36, 1)) * 0.55

  ctx.save()
  ctx.globalAlpha = alpha * edgeFade

  for (const bristle of bristles) {
    const angle = bristle.angle + motionAngle * 0.15
    const ex = x + Math.cos(angle) * bristle.length
    const ey = y + Math.sin(angle) * bristle.length
    const lit = 0.5 + Math.cos(angle - Math.atan2(SUN.y, SUN.x)) * 0.25

    ctx.strokeStyle = `rgba(${Math.floor(235 + lit * 20)}, ${Math.floor(238 + lit * 15)}, ${Math.floor(240 + lit * 10)}, ${0.35 + lit * 0.45})`
    ctx.lineWidth = bristle.thickness
    ctx.shadowBlur = 2.5
    ctx.shadowColor = 'rgba(255, 255, 255, 0.35)'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(ex, ey)
    ctx.stroke()
  }

  ctx.shadowBlur = 0
  ctx.fillStyle = `rgba(255, 252, 248, ${0.65 + edgeFade * 0.3})`
  ctx.beginPath()
  ctx.arc(x, y, 0.7 + edgeFade * 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.save()
  const lx = x + SUN.x * radius * 0.6
  const ly = y + SUN.y * radius * 0.6
  const g = ctx.createRadialGradient(lx, ly, 0, x, y, radius * 1.4)
  g.addColorStop(0, 'rgba(255, 255, 252, 0.92)')
  g.addColorStop(0.45, 'rgba(245, 243, 235, 0.55)')
  g.addColorStop(1, 'rgba(180, 178, 170, 0.08)')
  ctx.fillStyle = g
  ctx.shadowBlur = 6
  ctx.shadowColor = 'rgba(255, 255, 240, 0.25)'
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawRoot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save()
  ctx.fillStyle = 'rgba(30, 65, 28, 0.85)'
  ctx.beginPath()
  ctx.ellipse(x, y + 2, 5, 2.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ─── 主 Composable ────────────────────────────────────────────────────────────

const STEM_NODES = 8
const SEED_COUNT = 96
const TRAIL_MAX = 48

export function useDandelionPhysics(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: DandelionPhysicsOptions = {},
) {
  const {
    blowDuration = 1500,
    fadeDuration = 600,
    onTransitionComplete,
  } = options

  const phase = ref<DandelionPhase>('idle')
  const fadeOpacity = ref(1)

  const focusPoint = ref({ x: 0, y: 0 })
  let engine: PhysicsEngine | null = null
  let seeds: FluffSeed[] = []
  let trails: WindTrail[] = []
  let mouse: Vec2 | null = null
  let prevMouse: Vec2 | null = null
  let rootPos: Vec2 = { x: 0, y: 0 }
  let headEngineId = 0
  let rafId = 0
  let lastTimestamp = 0
  let blowStartTime = 0
  let fadeStartTime = 0
  let canvasW = 0
  let canvasH = 0

  // ── 场景初始化 ──

  function buildScene(width: number, height: number): void {
    canvasW = width
    canvasH = height

    engine = new PhysicsEngine({
      gravity: { x: 0, y: 0.06 },
      globalDamping: 0.985,
      substeps: 5,
    })

    const cx = width * 0.5
    const groundY = height * 0.68
    rootPos = { x: cx, y: groundY }
    headEngineId = STEM_NODES - 1

    const segLen = (groundY - height * 0.28) / (STEM_NODES - 1)

    for (let i = 0; i < STEM_NODES; i++) {
      const y = groundY - i * segLen
      engine.addParticle({
        x: cx,
        y,
        prevX: cx,
        prevY: y,
        mass: i === 0 ? 100 : 0.8 + i * 0.15,
        pinned: i === 0,
        radius: 2,
        drag: 0.3 + i * 0.05,
      })

      if (i > 0) {
        engine.addSpring({
          a: i - 1,
          b: i,
          restLength: segLen,
          stiffness: 0.35 + i * 0.02,
          damping: 0.04,
        })
      }
    }

    seeds = []
    const headY = groundY - (STEM_NODES - 1) * segLen

    for (let i = 0; i < SEED_COUNT; i++) {
      const angle = (i / SEED_COUNT) * Math.PI * 2 + Math.random() * 0.15
      const dist = 8 + Math.random() * 28
      const ox = Math.cos(angle) * dist
      const oy = Math.sin(angle) * dist * 0.62
      const sx = cx + ox
      const sy = headY + oy

      const bristleCount = 2 + Math.floor(Math.random() * 3)
      const bristles: PappusBristle[] = []
      for (let b = 0; b < bristleCount; b++) {
        bristles.push({
          angle: angle + Math.PI + (b - bristleCount / 2) * 0.18,
          length: 7 + Math.random() * 10 + (1 - dist / 36) * 4,
          thickness: 0.35 + Math.random() * 0.35,
        })
      }

      const engineId = engine.addParticle({
        x: sx,
        y: sy,
        prevX: sx,
        prevY: sy,
        mass: 0.22 + Math.random() * 0.18,
        pinned: false,
        radius: 1,
        drag: 1.6,
      })

      engine.addSpring({
        a: headEngineId,
        b: engineId,
        restLength: dist,
        stiffness: 0.05 + Math.random() * 0.03,
        damping: 0.018,
      })

      seeds.push({
        offsetX: ox,
        offsetY: oy,
        x: sx,
        y: sy,
        prevX: sx,
        prevY: sy,
        vx: 0,
        vy: 0,
        mass: 0.28,
        friction: 0.984,
        bristles,
        detached: false,
        engineId,
        distFromCenter: dist,
      })
    }

    focusPoint.value = { x: cx, y: headY }
  }

  // ── 风迹粒子 ──

  function spawnTrail(x: number, y: number, vx: number, vy: number): void {
    if (phase.value !== 'idle') return
    trails.push({
      x,
      y,
      vx: vx * 0.3 + (Math.random() - 0.5) * 0.5,
      vy: vy * 0.3 + (Math.random() - 0.5) * 0.5,
      life: 1,
      maxLife: 0.6 + Math.random() * 0.4,
    })
    if (trails.length > TRAIL_MAX) trails.shift()
  }

  function updateTrails(dt: number): void {
    trails = trails.filter((t) => {
      t.life -= dt * 0.0012
      t.x += t.vx
      t.y += t.vy
      t.vx *= 0.96
      t.vy *= 0.96
      return t.life > 0
    })
  }

  function drawTrails(ctx: CanvasRenderingContext2D): void {
    for (const t of trails) {
      const alpha = (t.life / t.maxLife) * 0.35
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = 'rgba(200, 230, 255, 0.8)'
      ctx.beginPath()
      ctx.arc(t.x, t.y, 2 + (1 - t.life / t.maxLife) * 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  // ── 物理更新 ──

  function getHead(): Particle {
    return engine!.particles[headEngineId]
  }

  function updateIdlePhysics(time: number, dt: number): void {
    const head = getHead()
    const wind = computeMouseWind(mouse ?? head, head, 280, 2.8)

    engine!.step(dt, (p, i) => {
      if (p.pinned) return { x: 0, y: 0 }

      if (i <= headEngineId) {
        const nodeFactor = i / (STEM_NODES - 1)
        const ambient = sharedPerlin.sampleWindField(p.x, p.y, time, 0.002, 4)
        const forceScale = dt * 0.0045
        return {
          x: (wind.x * nodeFactor * 1.3 + ambient.x * 0.14 * nodeFactor) * forceScale,
          y: (wind.y * nodeFactor * 0.85 + ambient.y * 0.08 * nodeFactor) * forceScale,
        }
      }

      const fluffWind = sharedPerlin.sampleWindField(p.x, p.y, time, 0.005, 3)
      const fluffMouse = computeMouseWind(mouse ?? head, p, 200, 1.2)
      const forceScale = dt * 0.0035
      return {
        x: (fluffWind.x * 0.35 + fluffMouse.x) * forceScale,
        y: (fluffWind.y * 0.2 + fluffMouse.y) * forceScale,
      }
    })
  }

  function detachSeeds(): void {
    const head = getHead()
    const seedIds = new Set(seeds.map((s) => s.engineId))

    engine!.springs = engine!.springs.filter(
      (s) => !seedIds.has(s.a) && !seedIds.has(s.b),
    )

    for (const seed of seeds) {
      const p = engine!.particles[seed.engineId]
      p.pinned = true
      seed.detached = true
      seed.x = p.x
      seed.y = p.y
      seed.vx = (p.x - p.prevX) * 8
      seed.vy = (p.y - p.prevY) * 8

      const dx = p.x - head.x
      const dy = p.y - head.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const burst = 6 + Math.random() * 4
      seed.vx += (dx / dist) * burst + (Math.random() - 0.5) * 2
      seed.vy += (dy / dist) * burst * 0.4 - 2 - Math.random() * 2
    }
  }

  function updateDetachedSeeds(time: number, dt: number): void {
    const dtSec = dt * 0.06
    for (const seed of seeds) {
      if (!seed.detached) continue

      const wind = sharedPerlin.sampleWindField(seed.x, seed.y, time, 0.004, 4)
      const turb = sharedPerlin.fbm(seed.x * 0.008, seed.y * 0.008 + time * 0.0003, 2)
      const windForce = 2.2 + turb * 0.8

      seed.vx += (wind.x * windForce) / seed.mass
      seed.vy += (wind.y * windForce - 0.07) / seed.mass
      seed.vx *= seed.friction
      seed.vy *= seed.friction
      seed.x += seed.vx * dtSec
      seed.y += seed.vy * dtSec
    }
  }

  function updateBlowingPhysics(time: number, dt: number): void {
    const head = getHead()
    const sway = sharedPerlin.sampleWindField(head.x, head.y, time, 0.0025, 3)
    const forceScale = dt * 0.003
    engine!.step(dt, (p, i) => {
      if (p.pinned) return { x: 0, y: 0 }
      if (i <= headEngineId) {
        const f = i / headEngineId
        return { x: sway.x * 0.5 * f * forceScale, y: sway.y * 0.25 * f * forceScale }
      }
      return { x: 0, y: 0 }
    })
    updateDetachedSeeds(time, dt)
  }

  // ── 渲染 ──

  function renderFrame(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, canvasW, canvasH)

    drawTrails(ctx)

    if (!engine) return

    const stemNodes = engine.particles
      .slice(0, STEM_NODES)
      .map((p) => ({ x: p.x, y: p.y }))

    drawStem(ctx, stemNodes)
    drawRoot(ctx, rootPos.x, rootPos.y)

    const head = getHead()
    focusPoint.value = { x: head.x, y: head.y }
    const headAlpha = phase.value === 'fading'
      ? fadeOpacity.value
      : 1

    if (phase.value === 'idle' || phase.value === 'blowing') {
      drawHead(ctx, head.x, head.y, 11 * headAlpha)
    }

    for (const seed of seeds) {
      let sx: number
      let sy: number
      let svx: number
      let svy: number

      if (seed.detached) {
        sx = seed.x
        sy = seed.y
        svx = seed.vx
        svy = seed.vy
      } else {
        const p = engine.particles[seed.engineId]
        sx = p.x
        sy = p.y
        svx = p.x - p.prevX
        svy = p.y - p.prevY
      }

      const seedAlpha = phase.value === 'fading' ? fadeOpacity.value : 1
      drawFluffSeed(ctx, sx, sy, svx, svy, seed.bristles, seed.distFromCenter, seedAlpha)
    }
  }

  // ── 主循环 ──

  function tick(timestamp: number): void {
    if (!lastTimestamp) lastTimestamp = timestamp
    const dt = Math.min(timestamp - lastTimestamp, 32)
    lastTimestamp = timestamp

    const canvas = canvasRef.value
    if (!canvas || !engine) {
      rafId = requestAnimationFrame(tick)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      rafId = requestAnimationFrame(tick)
      return
    }

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildScene(w, h)
    }

    updateTrails(dt)

    if (phase.value === 'idle') {
      updateIdlePhysics(timestamp, dt)
    } else if (phase.value === 'blowing') {
      updateBlowingPhysics(timestamp, dt)
      if (timestamp - blowStartTime >= blowDuration) {
        phase.value = 'fading'
        fadeStartTime = timestamp
      }
    } else if (phase.value === 'fading') {
      updateBlowingPhysics(timestamp, dt)
      const progress = (timestamp - fadeStartTime) / fadeDuration
      fadeOpacity.value = Math.max(0, 1 - progress)
      if (progress >= 1) {
        phase.value = 'done'
        onTransitionComplete?.()
        return
      }
    }

    renderFrame(ctx)
    rafId = requestAnimationFrame(tick)
  }

  // ── 交互 ──

  function onPointerMove(e: PointerEvent): void {
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (prevMouse && phase.value === 'idle') {
      spawnTrail(x, y, x - prevMouse.x, y - prevMouse.y)
    }

    prevMouse = { x, y }
    mouse = { x, y }
  }

  function onPointerLeave(): void {
    mouse = null
    prevMouse = null
  }

  function triggerBlow(): void {
    if (phase.value !== 'idle' || !engine) return
    phase.value = 'blowing'
    blowStartTime = performance.now()
    detachSeeds()
  }

  function onClick(): void {
    triggerBlow()
  }

  // ── 生命周期 ──

  onMounted(() => {
    rafId = requestAnimationFrame(tick)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerleave', onPointerLeave)
  })

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerleave', onPointerLeave)
  })

  return {
    phase,
    fadeOpacity,
    focusPoint,
    triggerBlow,
    onClick,
  }
}
