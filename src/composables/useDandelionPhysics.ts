import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { PhysicsEngine, type Particle, type Vec2 } from './usePhysicsEngine'

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

interface FluffSeed {
  /** 相对于 head 的锚点偏移（idle）或世界坐标（blowing） */
  offsetX: number
  offsetY: number
  /** 自由态物理 */
  x: number
  y: number
  prevX: number
  prevY: number
  vx: number
  vy: number
  mass: number
  friction: number
  bristleAngle: number
  bristleLen: number
  detached: boolean
  engineId: number
}

// ─── Perlin 2D 噪音 ─────────────────────────────────────────────────────────

class PerlinNoise2D {
  private readonly perm: number[]

  constructor(seed = 42) {
    const p = Array.from({ length: 256 }, (_, i) => i)
    let s = seed
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 12345) & 0x7fffffff
      const j = s % (i + 1)
      ;[p[i], p[j]] = [p[j], p[i]]
    }
    this.perm = [...p, ...p]
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  /** 返回值范围约 [-1, 1] */
  noise(x: number, y: number): number {
    const xi = Math.floor(x) & 255
    const yi = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const u = this.fade(xf)
    const v = this.fade(yf)
    const aa = this.perm[this.perm[xi] + yi]
    const ab = this.perm[this.perm[xi] + yi + 1]
    const ba = this.perm[this.perm[xi + 1] + yi]
    const bb = this.perm[this.perm[xi + 1] + yi + 1]
    return this.lerp(
      this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
      this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
      v,
    )
  }

  /** 返回 2D 风向量 */
  sampleField(x: number, y: number, time: number, scale = 0.004): Vec2 {
    const nx = x * scale
    const ny = y * scale + time * 0.0004
    const angle = this.noise(nx, ny) * Math.PI * 2
    const mag = 0.5 + this.noise(nx + 100, ny + 100) * 0.5
    return { x: Math.cos(angle) * mag, y: Math.sin(angle) * mag * 0.6 }
  }
}

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
    const width = 4.5 - t * 2.2

    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    const cpx = (a.x + b.x) / 2 + (b.y - a.y) * 0.04
    const cpy = (a.y + b.y) / 2 - (b.x - a.x) * 0.04
    ctx.quadraticCurveTo(cpx, cpy, b.x, b.y)

    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
    g.addColorStop(0, `rgba(${40 + t * 20}, ${90 + t * 10}, ${35}, 0.95)`)
    g.addColorStop(1, `rgba(${55 + t * 15}, ${110 + t * 5}, ${45}, 0.9)`)
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
  angle: number,
  bristleLen: number,
  alpha: number,
): void {
  const speed = Math.sqrt(vx * vx + vy * vy)
  const dirAngle = speed > 0.1 ? Math.atan2(vy, vx) : angle

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(
    x - Math.cos(dirAngle) * bristleLen,
    y - Math.sin(dirAngle) * bristleLen,
  )
  ctx.stroke()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.beginPath()
  ctx.arc(x, y, 1.2, 0, Math.PI * 2)
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
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius)
  g.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
  g.addColorStop(0.6, 'rgba(240, 240, 235, 0.7)')
  g.addColorStop(1, 'rgba(200, 200, 195, 0.2)')
  ctx.fillStyle = g
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
const SEED_COUNT = 64
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

  const perlin = new PerlinNoise2D(2026)
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
      const angle = (i / SEED_COUNT) * Math.PI * 2 + Math.random() * 0.2
      const dist = 14 + Math.random() * 22
      const ox = Math.cos(angle) * dist
      const oy = Math.sin(angle) * dist * 0.65
      const sx = cx + ox
      const sy = headY + oy

      const engineId = engine.addParticle({
        x: sx,
        y: sy,
        prevX: sx,
        prevY: sy,
        mass: 0.25 + Math.random() * 0.2,
        pinned: false,
        radius: 1.2,
        drag: 1.5,
      })

      engine.addSpring({
        a: headEngineId,
        b: engineId,
        restLength: dist,
        stiffness: 0.06 + Math.random() * 0.03,
        damping: 0.015,
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
        mass: 0.3,
        friction: 0.985,
        bristleAngle: angle + Math.PI,
        bristleLen: 8 + Math.random() * 6,
        detached: false,
        engineId,
      })
    }
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
        const ambient = perlin.sampleField(p.x, p.y, time, 0.002)
        return {
          x: wind.x * nodeFactor * 1.2 + ambient.x * 0.06 * nodeFactor,
          y: wind.y * nodeFactor * 0.8 + ambient.y * 0.04 * nodeFactor,
        }
      }

      const fluffWind = perlin.sampleField(p.x, p.y, time, 0.006)
      const fluffMouse = computeMouseWind(mouse ?? head, p, 200, 1.2)
      return {
        x: fluffWind.x * 0.2 + fluffMouse.x,
        y: fluffWind.y * 0.12 + fluffMouse.y,
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

      const wind = perlin.sampleField(seed.x, seed.y, time, 0.005)
      const windForce = 1.8

      seed.vx += (wind.x * windForce) / seed.mass
      seed.vy += (wind.y * windForce - 0.08) / seed.mass
      seed.vx *= seed.friction
      seed.vy *= seed.friction
      seed.x += seed.vx * dtSec
      seed.y += seed.vy * dtSec
    }
  }

  function updateBlowingPhysics(time: number, dt: number): void {
    const head = getHead()
    const sway = perlin.sampleField(head.x, head.y, time, 0.003)
    engine!.step(dt, (p, i) => {
      if (p.pinned) return { x: 0, y: 0 }
      if (i <= headEngineId) {
        return { x: sway.x * 0.4 * (i / headEngineId), y: sway.y * 0.2 }
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
    const headAlpha = phase.value === 'fading'
      ? fadeOpacity.value
      : 1

    if (phase.value === 'idle' || phase.value === 'blowing') {
      drawHead(ctx, head.x, head.y, 10 * headAlpha)
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
      drawFluffSeed(ctx, sx, sy, svx, svy, seed.bristleAngle, seed.bristleLen, seedAlpha)
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
    triggerBlow,
    onClick,
  }
}
