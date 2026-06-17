import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { PhysicsEngine, type Particle, type Vec2 } from './usePhysicsEngine'
import { sharedPerlin } from '@/utils/perlinNoise'
import { getLandingLayout } from '@/composables/landingLayout'

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
  width: number
  /** 0 = 粉, 1 = 蓝 */
  tint: number
  phase: number
}

interface PappusBristle {
  angle: number
  length: number
  thickness: number
  /** 0 内层短绒, 1 中层, 2 外层长丝 */
  tier: number
}

interface FluffSeed {
  offsetX: number
  offsetY: number
  angleJitter: number
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
  warmup: number
  layer: number
}

/** 全局光源 — 屏幕左上角 */
const SUN = { x: -0.78, y: -0.62, intensity: 1.15 }

const STEM_NODES = 8
const SEED_COUNT = 280
const TRAIL_MAX = 28
const MAX_DPR = 2
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

// ─── 风力计算 ─────────────────────────────────────────────────────────────────

function computeMouseWind(
  mouse: Vec2,
  target: Vec2,
  radius: number,
  strength: number,
  gust: number,
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
  const swirl = sharedPerlin.fbm(target.x * 0.012, target.y * 0.012, 2)
  const gustBoost = 0.8 + gust * 1.2

  return {
    x: (nx * 0.75 - ny * 0.25 * swirl) * strength * falloff * gustBoost,
    y: (ny * 0.45 + nx * 0.18 * swirl) * strength * falloff * gustBoost,
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
  headSpread: number,
  alpha: number,
  angleJitter: number,
  warmup: number,
  layer: number,
  time: number,
): void {
  const speed = Math.sqrt(vx * vx + vy * vy)
  const motionAngle = speed > 0.03 ? Math.atan2(vy, vx) : 0
  const edgeFade = 0.35 + (1 - Math.min(distFromCenter / headSpread, 1)) * 0.65
  const layerAlpha = [0.68, 0.84, 1.0][layer] ?? 0.85
  const twinkle = 0.72 + Math.sin(time * 0.005 + distFromCenter * 0.22 + x * 0.01) * 0.28
  const starAlpha = alpha * edgeFade * layerAlpha * twinkle
  const rayStretch = 1 + warmup * 0.85 + Math.min(speed * 0.18, 0.55)

  ctx.save()
  ctx.globalAlpha = starAlpha
  ctx.lineCap = 'round'

  for (const bristle of bristles) {
    const jitter = angleJitter * 0.08 + Math.sin(time * 0.003 + bristle.angle * 2.3) * 0.04
    const angle = bristle.angle + motionAngle * (0.08 + warmup * 0.12) + jitter
    const len = bristle.length * rayStretch
    const lit = 0.5 + Math.cos(angle - Math.atan2(SUN.y, SUN.x)) * 0.28

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 + lit * 0.45})`
    ctx.lineWidth = bristle.thickness
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
    ctx.stroke()
  }

  ctx.fillStyle = `rgba(255, 255, 255, ${0.82 + warmup * 0.18})`
  ctx.beginPath()
  ctx.arc(x, y, 0.35 + layer * 0.08 + warmup * 0.25, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  headSpread: number,
): void {
  ctx.save()
  const lx = x + SUN.x * radius * 0.5
  const ly = y + SUN.y * radius * 0.5
  const outer = headSpread * 0.55
  const g = ctx.createRadialGradient(lx, ly, 0, x, y, outer)
  g.addColorStop(0, 'rgba(255, 255, 255, 0.55)')
  g.addColorStop(0.2, 'rgba(255, 252, 248, 0.28)')
  g.addColorStop(0.55, 'rgba(250, 248, 240, 0.1)')
  g.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, outer, 0, Math.PI * 2)
  ctx.fill()

  const core = ctx.createRadialGradient(lx, ly, 0, x, y, radius * 1.2)
  core.addColorStop(0, 'rgba(255, 255, 255, 0.92)')
  core.addColorStop(0.5, 'rgba(250, 248, 240, 0.45)')
  core.addColorStop(1, 'rgba(200, 198, 190, 0.08)')
  ctx.fillStyle = core
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

/** 粉蓝梦幻流线色 — 呼应天空 dawn / mid 色调 */
function trailColor(tint: number, alpha: number): { r: number; g: number; b: number; a: number } {
  const pink = { r: 255, g: 198, b: 228 }
  const blue = { r: 148, g: 210, b: 255 }
  const t = tint * tint * (3 - 2 * tint)
  return {
    r: Math.round(pink.r + (blue.r - pink.r) * t),
    g: Math.round(pink.g + (blue.g - pink.g) * t),
    b: Math.round(pink.b + (blue.b - pink.b) * t),
    a: alpha,
  }
}

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

  const focusPoint = ref({
    x: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.4 : 0,
  })
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
  let lastTrailAt = 0
  let headSpread = 120
  let coreRadius = 16

  // ── 场景初始化 ──

  function buildScene(width: number, height: number): void {
    canvasW = width
    canvasH = height

    engine = new PhysicsEngine({
      gravity: { x: 0, y: 0.06 },
      globalDamping: 0.985,
      substeps: 3,
    })

    const { cx, groundY, headY } = getLandingLayout(width, height)
    headSpread = Math.min(width, height) * 0.28
    coreRadius = headSpread * 0.12
    rootPos = { x: cx, y: groundY }
    headEngineId = STEM_NODES - 1

    const segLen = (groundY - headY) / (STEM_NODES - 1)

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
    const seedAnchorY = groundY - (STEM_NODES - 1) * segLen

    for (let i = 0; i < SEED_COUNT; i++) {
      const t = (i + Math.random() * 0.6) / SEED_COUNT
      const dist = headSpread * Math.sqrt(t)
      const angle = i * GOLDEN_ANGLE + (Math.random() - 0.5) * 0.12
      const ox = Math.cos(angle) * dist
      const oy = Math.sin(angle) * dist * 0.88
      const sx = cx + ox
      const sy = seedAnchorY + oy

      const bristles: PappusBristle[] = []
      const baseAngle = angle + Math.PI
      const rayCount = 2 + Math.floor(Math.random() * 2)

      for (let b = 0; b < rayCount; b++) {
        bristles.push({
          angle: baseAngle + (b - rayCount / 2) * 0.55 + (Math.random() - 0.5) * 0.35,
          length: 2 + Math.random() * 4.5,
          thickness: 0.2 + Math.random() * 0.28,
          tier: 0,
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
        angleJitter: (Math.random() - 0.5) * 0.9,
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
        warmup: 0,
        layer: Math.min(2, Math.floor((dist / headSpread) * 3)),
      })
    }

    focusPoint.value = { x: cx, y: seedAnchorY }
  }

  // ── 风迹粒子 ──

  function spawnTrail(x: number, y: number, vx: number, vy: number): void {
    if (phase.value !== 'idle') return
    trails.push({
      x,
      y,
      vx: vx * 0.42 + (Math.random() - 0.5) * 0.7,
      vy: vy * 0.42 + (Math.random() - 0.5) * 0.7,
      life: 1,
      maxLife: 0.65 + Math.random() * 0.55,
      width: 1.2 + Math.random() * 2.2,
      tint: 0.15 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    })
    if (trails.length > TRAIL_MAX) trails.shift()
  }

  function updateTrails(dt: number): void {
    trails = trails.filter((t) => {
      t.life -= dt * 0.00085
      const drift = Math.sin(t.phase + t.life * 4.2) * 0.18
      t.x += t.vx + drift
      t.y += t.vy - drift * 0.6
      t.vx *= 0.965
      t.vy *= 0.965
      return t.life > 0
    })
  }

  function drawTrails(ctx: CanvasRenderingContext2D): void {
    if (trails.length === 0) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    for (const t of trails) {
      const lifeRatio = t.life / t.maxLife
      const age = 1 - lifeRatio
      const alpha = lifeRatio * (0.32 + (1 - age) * 0.2)
      const speed = Math.hypot(t.vx, t.vy) || 0.01
      const nx = t.vx / speed
      const ny = t.vy / speed
      const px = -ny
      const py = nx
      const len = 12 + speed * 2.8 + age * 18

      const x0 = t.x - nx * len * 0.85
      const y0 = t.y - ny * len * 0.85
      const x1 = t.x + nx * len * 0.35
      const y1 = t.y + ny * len * 0.35
      const cx = t.x + px * len * 0.22 * Math.sin(t.phase + age * 3)
      const cy = t.y + py * len * 0.22 * Math.sin(t.phase + age * 3)

      const c1 = trailColor(Math.min(1, t.tint + 0.25), alpha)

      ctx.strokeStyle = `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${c1.a})`
      ctx.lineWidth = t.width * (0.6 + lifeRatio * 0.9)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo(cx, cy, x1, y1)
      ctx.stroke()

      const core = trailColor(t.tint + 0.1, alpha * 0.65)
      ctx.fillStyle = `rgba(${core.r}, ${core.g}, ${core.b}, ${core.a})`
      ctx.beginPath()
      ctx.arc(t.x, t.y, 1.2 + lifeRatio * 2.4, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalCompositeOperation = 'source-over'
    ctx.restore()
  }

  // ── 物理更新 ──

  function getHead(): Particle {
    return engine!.particles[headEngineId]
  }

  function updateIdlePhysics(time: number, dt: number): void {
    const head = getHead()
    const mouseVec = mouse ?? head
    const headDist = Math.hypot(mouseVec.x - head.x, mouseVec.y - head.y)
    const hoverRadius = headSpread * 0.95
    const hoverPull = headDist < hoverRadius ? Math.pow(1 - headDist / hoverRadius, 1.5) : 0
    const gustNoise = sharedPerlin.fbm(head.x * 0.0015 + time * 0.00006, head.y * 0.0015, 2)
    const gustPulse = 0.35 + Math.max(0, Math.sin(time * 0.0016 + gustNoise * Math.PI * 2))
    const gustWind = computeMouseWind(mouseVec, head, hoverRadius, 1.0 + hoverPull * 1.1, gustPulse)
    const ambientHead = sharedPerlin.sampleWindField(head.x, head.y, time, 0.0014, 3)

    engine!.step(dt, (p, i) => {
      if (p.pinned) return { x: 0, y: 0 }

      if (i <= headEngineId) {
        const nodeFactor = i / (STEM_NODES - 1)
        const ambient = sharedPerlin.sampleWindField(p.x, p.y, time, 0.002, 4)
        const forceScale = dt * 0.0042
        return {
          x: (gustWind.x * nodeFactor * 1.2 + ambient.x * 0.08 * nodeFactor + ambientHead.x * hoverPull * 0.04) * forceScale,
          y: (gustWind.y * nodeFactor * 0.8 + ambient.y * 0.05 * nodeFactor + ambientHead.y * hoverPull * 0.03) * forceScale,
        }
      }

      const fluffWind = sharedPerlin.sampleWindField(p.x, p.y, time, 0.005, 3)
      const fluffMouse = computeMouseWind(mouseVec, p, headSpread * 0.75, 0.75 + hoverPull * 1.2, gustPulse)
      const forceScale = dt * 0.0035
      return {
        x: (fluffWind.x * 0.38 + fluffMouse.x) * forceScale,
        y: (fluffWind.y * 0.22 + fluffMouse.y) * forceScale,
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

      seed.warmup = Math.min(1, seed.warmup + dt * 0.0035)
      const swirl = sharedPerlin.fbm(seed.x * 0.008, seed.y * 0.008 + time * 0.00018, 2)
      const gustPulse = 0.28 + Math.max(0, Math.sin(time * 0.0018 + seed.offsetX * 0.08 + seed.layer * 0.7))
      const gust = 0.55 + gustPulse * 0.9 + swirl * 0.45
      const drift = 0.55 + seed.warmup * 1.5
      const inertia = 0.9 + (1 - Math.min(seed.distFromCenter / headSpread, 1)) * 1.1

      seed.vx += ((Math.sin(time * 0.0028 + seed.offsetX) * 0.08 + gust * 0.05) * drift) / (seed.mass * inertia)
      seed.vy += ((Math.cos(time * 0.0022 + seed.offsetY) * 0.05 - 0.03 + gust * 0.02) * drift) / (seed.mass * inertia)
      seed.vx *= seed.friction
      seed.vy *= seed.friction
      seed.x += seed.vx * dtSec
      seed.y += seed.vy * dtSec
    }
  }

  function updateBlowingPhysics(time: number, dt: number): void {
    const head = getHead()
    const gustNoise = sharedPerlin.fbm(head.x * 0.002 + time * 0.00012, head.y * 0.002, 4)
    const gustPulse = 0.55 + Math.max(0, Math.sin(time * 0.0028 + gustNoise * Math.PI * 2))
    const sway = sharedPerlin.sampleWindField(head.x, head.y, time, 0.0025, 3)
    const forceScale = dt * 0.003
    engine!.step(dt, (p, i) => {
      if (p.pinned) return { x: 0, y: 0 }
      if (i <= headEngineId) {
        const f = i / headEngineId
        return {
          x: sway.x * (0.4 + gustPulse * 0.8) * f * forceScale,
          y: sway.y * (0.2 + gustPulse * 0.65) * f * forceScale,
        }
      }
      return { x: 0, y: 0 }
    })

    for (const seed of seeds) {
      if (!seed.detached) {
        const dx = mouse ? mouse.x - seed.x : head.x - seed.x
        const dy = mouse ? mouse.y - seed.y : head.y - seed.y
        const dist = Math.hypot(dx, dy)
        const radius = headSpread * 1.1
        if (dist < radius) {
          const influence = Math.pow(1 - dist / radius, 1.45)
          const layerDelay = [0.6, 0.35, 0.18][seed.layer] ?? 0.3
          const layerBoost = [0.65, 0.9, 1.2][seed.layer] ?? 0.85
          const warmTarget = Math.max(0, influence * layerBoost - layerDelay * 0.2)
          seed.warmup += (warmTarget - seed.warmup) * Math.min(1, dt * 0.0025)
          const repulse = (0.12 + layerBoost * 0.14) * influence * dt * 0.0016
          seed.vx += (dx / (dist || 1)) * repulse
          seed.vy += (dy / (dist || 1)) * repulse * 0.7
        } else {
          seed.warmup = Math.max(0, seed.warmup - dt * (0.00055 + seed.layer * 0.00012))
        }

        const detachThreshold = [0.72, 0.48, 0.22][seed.layer] ?? 0.5
        if (seed.warmup >= detachThreshold) {
          seed.detached = true
        }
      }
    }

    updateDetachedSeeds(time, dt)
  }

  // ── 渲染 ──

  function renderFrame(ctx: CanvasRenderingContext2D, time: number): void {
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
      drawHead(ctx, head.x, head.y, coreRadius * headAlpha, headSpread)
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
      drawFluffSeed(
        ctx,
        sx,
        sy,
        svx,
        svy,
        seed.bristles,
        seed.distFromCenter,
        headSpread,
        seedAlpha,
        seed.angleJitter,
        seed.warmup,
        seed.layer,
        time,
      )
    }
  }

  // ── 主循环 ──

  function tick(timestamp: number): void {
    if (!lastTimestamp) lastTimestamp = timestamp
    const dt = Math.min(timestamp - lastTimestamp, 32)
    lastTimestamp = timestamp

    const canvas = canvasRef.value
    if (!canvas) {
      rafId = requestAnimationFrame(tick)
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      rafId = requestAnimationFrame(tick)
      return
    }

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    if (w > 0 && h > 0 && (!engine || canvas.width !== w * dpr || canvas.height !== h * dpr)) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildScene(w, h)
    }

    if (!engine) {
      rafId = requestAnimationFrame(tick)
      return
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

    renderFrame(ctx, timestamp)
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
      const moved = Math.hypot(x - prevMouse.x, y - prevMouse.y)
      const now = performance.now()
      if (moved > 3 && now - lastTrailAt > 28) {
        spawnTrail(x, y, x - prevMouse.x, y - prevMouse.y)
        lastTrailAt = now
      }
    }

    prevMouse = { x, y }
    mouse = { x, y }

    if (phase.value !== 'idle' || !engine) return

    const head = getHead()
    const dx = x - head.x
    const dy = y - head.y
    const dist = Math.hypot(dx, dy)
    const enterRadius = headSpread * 1.12
    const seedRadius = headSpread * 0.62
    const speed = prevMouse
      ? Math.max(
          Math.hypot(e.movementX, e.movementY),
          Math.hypot(x - prevMouse.x, y - prevMouse.y),
        )
      : Math.hypot(e.movementX, e.movementY)

    if (dist >= enterRadius) return

    const intensity = Math.min(1, Math.max(0.15, speed / 14))
    const proximity = Math.pow(1 - dist / enterRadius, 1.15)
    const triggerAmount = intensity * proximity

    let peakWarmup = 0
    let warmedCount = 0

    for (const seed of seeds) {
      if (seed.detached) continue
      const p = engine.particles[seed.engineId]
      const sx = p.x - x
      const sy = p.y - y
      const sDist = Math.hypot(sx, sy)
      if (sDist < seedRadius) {
        const warm = Math.max(0, 1 - sDist / seedRadius)
        const layerBoost = [0.7, 0.95, 1.2][seed.layer] ?? 0.85
        const delta = warm * triggerAmount * layerBoost * 0.14
        seed.warmup = Math.min(1, seed.warmup + delta)
        peakWarmup = Math.max(peakWarmup, seed.warmup)
        if (seed.warmup > 0.38) warmedCount++
      }
    }

    const fastSwipe = speed > 5 && triggerAmount > 0.28
    const enoughWarmth = warmedCount >= 12 && peakWarmup >= 0.55
    const deepWarmth = peakWarmup >= 0.72 && speed > 2

    if (fastSwipe || enoughWarmth || deepWarmth) {
      triggerBlow(x, y)
    }
  }

  function onPointerLeave(): void {
    mouse = null
    prevMouse = null
  }

  function triggerBlow(originX?: number, originY?: number): void {
    if (phase.value !== 'idle' || !engine) return
    phase.value = 'blowing'
    blowStartTime = performance.now()
    detachSeeds()

    if (originX !== undefined && originY !== undefined) {
      for (const seed of seeds) {
        const dx = seed.x - originX
        const dy = seed.y - originY
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const push = Math.max(0, 1 - dist / (headSpread * 1.1))
        seed.vx += (dx / dist) * push * 4.5
        seed.vy += (dy / dist) * push * 2.5 - push * 0.8
      }
    }
  }

  function onClick(): void {
    // retained for external compatibility
    triggerBlow()
  }

  // ── 生命周期 ──

  onMounted(() => {
    rafId = requestAnimationFrame(tick)
  })

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
  })

  return {
    phase,
    fadeOpacity,
    focusPoint,
    triggerBlow,
    onPointerMove,
    onPointerLeave,
    onClick,
  }
}
