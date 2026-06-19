import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { PhysicsEngine, type Vec2 } from './usePhysicsEngine'
import { sharedPerlin } from '@/utils/perlinNoise'
import { getLandingLayout } from '@/composables/landingLayout'

/** 蒲公英 Three.js 场景阶段 */
export type DandelionPhase = 'idle' | 'blowing' | 'spreading' | 'done'

/** useDandelionThreeScene 配置 */
export interface DandelionThreeOptions {
  /** 吹散后飘满屏幕的时长 (ms) */
  spreadDuration?: number
  /** 过渡动画结束回调 */
  onTransitionComplete?: () => void
}

/** 绒球粒子运行时数据 */
interface FluffParticle {
  /** 物理引擎粒子索引 */
  engineId: number
  /** 是否已脱离花头 */
  detached: boolean
  /** 像素 X 坐标 */
  px: number
  /** 像素 Y 坐标 */
  py: number
  /** X 方向速度 */
  vx: number
  /** Y 方向速度 */
  vy: number
  /** 距花头中心的距离 */
  distFromCenter: number
  /** 径向层级（0 内 → 2 外） */
  layer: number
  /** 吹散预热值 [0, 1] */
  warmup: number
  /** 金色调混合比 */
  goldMix: number
  /** 深度 Z 偏移 */
  z: number
}

/** 茎秆节点数量 */
const STEM_NODES = 8
/** 绒球粒子总数 */
const PARTICLE_COUNT = 1280
/** 粒子点精灵尺寸 */
const PARTICLE_SIZE = 4.3
/** 最大设备像素比 */
const MAX_DPR = 2
/** 黄金角 — 向日葵/蒲公英分布 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
/** 默认吹散铺满屏幕时长 (ms) */
const DEFAULT_SPREAD_MS = 2800
/** 茎秆受鼠标风强度倍率 */
const MOUSE_WIND_STEM = 0.32
/** 绒球受鼠标风强度倍率 */
const MOUSE_WIND_FLUFF = 0.18
/** 无鼠标时环境风强度倍率（仅轻微摇曳） */
const AMBIENT_WIND_IDLE = 0.018
/** 有鼠标时环境风强度倍率 */
const AMBIENT_WIND_HOVER = 0.03
/** Bloom 强度（仅高光粒子，背景不参与） */
const BLOOM_STRENGTH = 0.22
/** Bloom 扩散半径 */
const BLOOM_RADIUS = 0.28
/** Bloom 亮度阈值（高于此值才发光，避免麦黄背景过曝） */
const BLOOM_THRESHOLD = 0.9

/** 与 Landing.vue CSS 一致的麦黄田园渐变，供 WebGL 不透明渲染（Bloom 会盖住下层 CSS） */
function createPastoralGradientTexture(width: number, height: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  const w = Math.max(1, Math.floor(width))
  const h = Math.max(1, Math.floor(height))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  /** 线性渐变角度（与 CSS 168deg 对齐） */
  const angle = ((168 - 90) * Math.PI) / 180
  const cx = w / 2
  const cy = h / 2
  const diag = Math.hypot(w, h)
  const linear = ctx.createLinearGradient(
    cx + Math.cos(angle) * diag * 0.5,
    cy + Math.sin(angle) * diag * 0.5,
    cx - Math.cos(angle) * diag * 0.5,
    cy - Math.sin(angle) * diag * 0.5,
  )
  linear.addColorStop(0, '#ede0c4')
  linear.addColorStop(0.38, '#e0d0a8')
  linear.addColorStop(0.68, '#d4c490')
  linear.addColorStop(1, '#c8b878')
  ctx.fillStyle = linear
  ctx.fillRect(0, 0, w, h)

  /** 叠加径向光斑层（低透明度，避免 Bloom 洗白） */
  const addRadial = (px: number, py: number, inner: string, radiusFrac: number): void => {
    const r = Math.max(w, h) * radiusFrac
    const g = ctx.createRadialGradient(px * w, py * h, 0, px * w, py * h, r)
    g.addColorStop(0, inner)
    g.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  addRadial(0.15, 0.12, 'rgba(240, 225, 180, 0.35)', 0.32)
  addRadial(0.88, 0.18, 'rgba(235, 215, 165, 0.28)', 0.28)
  addRadial(0.5, 1.0, 'rgba(200, 170, 110, 0.22)', 0.36)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/** 创建粒子发光贴图 */
function createGlowTexture(): THREE.CanvasTexture {
  /** 发光贴图分辨率（像素） */
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255, 235, 200, 0.9)')
  g.addColorStop(0.25, 'rgba(255, 220, 170, 0.55)')
  g.addColorStop(0.55, 'rgba(240, 190, 120, 0.2)')
  g.addColorStop(1, 'rgba(220, 160, 80, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/** 计算鼠标位置对目标点的风力扰动 */
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
  return {
    x: (dx / dist) * strength * falloff,
    y: (dy / dist) * strength * falloff * 0.85,
  }
}

/** 像素坐标转正交相机世界坐标 */
function pxToWorld(px: number, py: number, w: number, h: number): THREE.Vector3 {
  return new THREE.Vector3(px - w / 2, h / 2 - py, 0)
}

/** 蒲公英 Three.js WebGL 场景 Composable */
export function useDandelionThreeScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: DandelionThreeOptions = {},
) {
  const { spreadDuration = DEFAULT_SPREAD_MS, onTransitionComplete } = options

  /** 当前蒲公英阶段 */
  const phase = ref<DandelionPhase>('idle')
  /** 飘散进度 [0, 1] — spreading 阶段线性推进 */
  const spreadProgress = ref(0)
  /** 末段白光强度 [0, 1] — 供 Landing 亮光过渡层使用 */
  const lightIntensity = ref(0)

  /** WebGL 渲染器 */
  let renderer: THREE.WebGLRenderer | null = null
  /** Three.js 场景 */
  let scene: THREE.Scene | null = null
  /** 正交相机 */
  let camera: THREE.OrthographicCamera | null = null
  /** 后处理合成器 */
  let composer: EffectComposer | null = null
  /** Bloom 后处理通道（飘散阶段动态增亮） */
  let bloomPass: UnrealBloomPass | null = null
  /** Verlet 物理引擎 */
  let engine: PhysicsEngine | null = null
  /** 绒球粒子运行时列表 */
  let fluffParticles: FluffParticle[] = []
  /** 粒子 Points 对象 */
  let points: THREE.Points | null = null
  /** 粒子位置缓冲属性 */
  let posAttr: THREE.BufferAttribute | null = null
  /** 粒子颜色缓冲属性 */
  let colorAttr: THREE.BufferAttribute | null = null
  /** 茎秆线段 */
  let stemLine: THREE.Line | null = null
  /** 花头光晕 Mesh */
  let headGlow: THREE.Mesh | null = null
  /** 粒子发光贴图 */
  let glowTexture: THREE.CanvasTexture | null = null
  /** 麦黄田园背景贴图 */
  let backgroundTexture: THREE.CanvasTexture | null = null

  /** 当前鼠标位置 */
  let mouse: Vec2 | null = null
  /** 上一帧鼠标位置 */
  let prevMouse: Vec2 | null = null
  /** 鼠标移动速度（像素/帧，用于静止时削弱风力） */
  let mouseSpeed = 0
  /** 花头物理粒子索引 */
  let headEngineId = 0
  /** requestAnimationFrame 句柄 */
  let rafId = 0
  /** 上一帧时间戳 */
  let lastTimestamp = 0
  /** 吹散阶段起始时间 */
  let spreadStartTime = 0
  /** 画布宽度（像素） */
  let canvasW = 0
  /** 画布高度（像素） */
  let canvasH = 0
  /** 花头展开半径 */
  let headSpread = 120
  /** 花头像素坐标 */
  let headPx = { x: 0, y: 0 }

  /** 构建茎秆、绒球粒子与物理引擎 */
  function buildScene(width: number, height: number): void {
    canvasW = width
    canvasH = height

    const { cx, groundY, headY } = getLandingLayout(width, height)
    headSpread = Math.min(width, height) * 0.34
    headPx = { x: cx, y: groundY - (STEM_NODES - 1) * ((groundY - headY) / (STEM_NODES - 1)) }

    engine = new PhysicsEngine({
      gravity: { x: 0, y: 0 },
      globalDamping: 0.993,
      substeps: 3,
    })

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

    fluffParticles = []
    const seedAnchorY = headPx.y

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = (i + Math.random() * 0.35) / PARTICLE_COUNT
      const dist = headSpread * Math.sqrt(t)
      const angle = i * GOLDEN_ANGLE + (Math.random() - 0.5) * 0.14
      const ox = Math.cos(angle) * dist
      const oy = Math.sin(angle) * dist * 0.92
      const sx = cx + ox
      const sy = seedAnchorY + oy

      const engineId = engine.addParticle({
        x: sx,
        y: sy,
        prevX: sx,
        prevY: sy,
        mass: 0.16 + Math.random() * 0.12,
        pinned: false,
        radius: 0.5,
        drag: 1.55,
      })

      engine.addSpring({
        a: headEngineId,
        b: engineId,
        restLength: dist,
        stiffness: 0.045 + Math.random() * 0.025,
        damping: 0.028,
      })

      fluffParticles.push({
        engineId,
        detached: false,
        px: sx,
        py: sy,
        vx: 0,
        vy: 0,
        distFromCenter: dist,
        layer: Math.min(2, Math.floor((dist / headSpread) * 3)),
        warmup: 0,
        goldMix: 0.45 + Math.random() * 0.5,
        z: (Math.random() - 0.5) * 12,
      })
    }

    rebuildPointsGeometry()
    updateStemLine()
  }

  /** 重建粒子点云几何体 */
  function rebuildPointsGeometry(): void {
    if (!scene) return

    if (points) {
      scene.remove(points)
      points.geometry.dispose()
      ;(points.material as THREE.Material).dispose()
    }

    const positions = new Float32Array(fluffParticles.length * 3)
    const colors = new Float32Array(fluffParticles.length * 3)

    for (let i = 0; i < fluffParticles.length; i++) {
      const fp = fluffParticles[i]
      const w = pxToWorld(fp.px, fp.py, canvasW, canvasH)
      positions[i * 3] = w.x
      positions[i * 3 + 1] = w.y
      positions[i * 3 + 2] = fp.z
      const g = fp.goldMix
      colors[i * 3] = 0.82 + g * 0.1
      colors[i * 3 + 1] = 0.72 + g * 0.12
      colors[i * 3 + 2] = 0.48 + g * 0.18
    }

    const geo = new THREE.BufferGeometry()
    posAttr = new THREE.BufferAttribute(positions, 3)
    colorAttr = new THREE.BufferAttribute(colors, 3)
    geo.setAttribute('position', posAttr)
    geo.setAttribute('color', colorAttr)

    glowTexture = createGlowTexture()
    const mat = new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      map: glowTexture,
      transparent: true,
      opacity: 0.62,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false,
    })

    points = new THREE.Points(geo, mat)
    scene.add(points)
  }

  /** 更新茎秆线段与花头光晕 */
  function updateStemLine(): void {
    if (!scene || !engine) return

    const verts: number[] = []
    for (let i = 0; i < STEM_NODES; i++) {
      const p = engine.particles[i]
      const w = pxToWorld(p.x, p.y, canvasW, canvasH)
      verts.push(w.x, w.y, 1)
    }

    if (stemLine) {
      scene.remove(stemLine)
      stemLine.geometry.dispose()
      ;(stemLine.material as THREE.Material).dispose()
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    const mat = new THREE.LineBasicMaterial({
      color: 0x5c7a38,
      transparent: true,
      opacity: 0.88,
    })
    stemLine = new THREE.Line(geo, mat)
    scene.add(stemLine)

    if (headGlow) {
      scene.remove(headGlow)
      headGlow.geometry.dispose()
      ;(headGlow.material as THREE.Material).dispose()
    }

    const head = engine.particles[headEngineId]
    const hw = pxToWorld(head.x, head.y, canvasW, canvasH)
    const glowGeo = new THREE.CircleGeometry(headSpread * 0.16, 36)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xe8c878,
      transparent: true,
      opacity: 0.07,
      blending: THREE.NormalBlending,
      depthWrite: false,
    })
    headGlow = new THREE.Mesh(glowGeo, glowMat)
    headGlow.position.set(hw.x, hw.y, -2)
    scene.add(headGlow)
  }

  /** 更新田园渐变背景纹理 */
  function updateSceneBackground(width: number, height: number): void {
    if (!scene) return
    backgroundTexture?.dispose()
    backgroundTexture = createPastoralGradientTexture(width, height)
    scene.background = backgroundTexture
  }

  /** 初始化 WebGL 渲染器与后处理 */
  function initRenderer(): void {
    const canvas = canvasRef.value
    if (!canvas || renderer) return

    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvasW = w
    canvasH = h

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR))
    renderer.setSize(w, h, false)
    renderer.setClearColor(0xe0d0a8, 1)

    scene = new THREE.Scene()
    updateSceneBackground(w, h)

    camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 500)
    camera.position.set(0, 0, 100)

    const renderPass = new RenderPass(scene, camera)
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    )
    composer = new EffectComposer(renderer)
    composer.addPass(renderPass)
    composer.addPass(bloomPass)

    buildScene(w, h)
  }

  /** 同步粒子位置到 BufferAttribute */
  function syncPointPositions(): void {
    if (!posAttr || !engine) return

    for (let i = 0; i < fluffParticles.length; i++) {
      const fp = fluffParticles[i]
      let px: number
      let py: number

      if (fp.detached) {
        px = fp.px
        py = fp.py
      } else {
        const p = engine.particles[fp.engineId]
        px = p.x
        py = p.y
        fp.px = px
        fp.py = py
      }

      const w = pxToWorld(px, py, canvasW, canvasH)
      posAttr.setXYZ(i, w.x, w.y, fp.z)
    }
    posAttr.needsUpdate = true
  }

  /** 更新茎秆顶点位置 */
  function updateStemPositions(): void {
    if (!stemLine || !engine) return
    const attr = stemLine.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < STEM_NODES; i++) {
      const p = engine.particles[i]
      const w = pxToWorld(p.x, p.y, canvasW, canvasH)
      attr.setXYZ(i, w.x, w.y, 1)
    }
    attr.needsUpdate = true

    if (headGlow && phase.value === 'idle') {
      const head = engine.particles[headEngineId]
      const hw = pxToWorld(head.x, head.y, canvasW, canvasH)
      headGlow.position.set(hw.x, hw.y, -2)
      const mat = headGlow.material as THREE.MeshBasicMaterial
      mat.opacity = 0.06 + Math.sin(lastTimestamp * 0.002) * 0.02
    }
  }

  /** 静止态物理 — 无鼠标时仅轻微环境风，有鼠标时按移动速度施加扰动 */
  function updateIdlePhysics(time: number, dt: number): void {
    if (!engine) return
    const head = engine.particles[headEngineId]
    const hasMouse = mouse !== null
    const headDist = hasMouse
      ? Math.hypot(mouse!.x - head.x, mouse!.y - head.y)
      : Infinity
    const hoverRadius = headSpread * 0.95
    const hoverPull = hasMouse && headDist < hoverRadius
      ? Math.pow(1 - headDist / hoverRadius, 1.5)
      : 0
    /** 静止鼠标时趋近 0.12，快速划过时趋近 1 */
    const moveFactor = hasMouse ? Math.min(1, 0.12 + mouseSpeed * 0.06) : 0
    const ambientScale = hasMouse ? AMBIENT_WIND_HOVER : AMBIENT_WIND_IDLE
    const fsStem = dt * 0.003
    const fsFluff = dt * 0.0022

    engine.step(dt, (p, i) => {
      if (p.pinned) return { x: 0, y: 0 }

      if (i <= headEngineId) {
        const nodeFactor = i / (STEM_NODES - 1)
        const ambient = sharedPerlin.sampleWindField(p.x, p.y, time, 0.0018, 2)
        const gust = hasMouse
          ? computeMouseWind(
              mouse!,
              head,
              hoverRadius,
              (MOUSE_WIND_STEM + hoverPull * 0.12) * moveFactor,
            )
          : { x: 0, y: 0 }
        return {
          x: (gust.x * nodeFactor * 0.65 + ambient.x * ambientScale * nodeFactor) * fsStem,
          y: (gust.y * nodeFactor * 0.55 + ambient.y * ambientScale * nodeFactor) * fsStem,
        }
      }

      const wind = sharedPerlin.sampleWindField(p.x, p.y, time, 0.0035, 2)
      const mouseWind = hasMouse
        ? computeMouseWind(
            mouse!,
            p,
            headSpread * 0.6,
            (MOUSE_WIND_FLUFF + hoverPull * 0.1) * moveFactor,
          )
        : { x: 0, y: 0 }
      return {
        x: (wind.x * ambientScale * 3.2 + mouseWind.x) * fsFluff,
        y: (wind.y * ambientScale * 2.4 + mouseWind.y) * fsFluff,
      }
    })
  }

  /** 断开所有绒球粒子与花头的弹簧 */
  function detachAll(): void {
    if (!engine) return
    const head = engine.particles[headEngineId]
    const seedIds = new Set(fluffParticles.map((f) => f.engineId))

    engine.springs = engine.springs.filter(
      (s) => !seedIds.has(s.a) && !seedIds.has(s.b),
    )

    for (const fp of fluffParticles) {
      const p = engine.particles[fp.engineId]
      fp.detached = true
      fp.px = p.x
      fp.py = p.y
      fp.vx = (p.x - p.prevX) * 10
      fp.vy = (p.y - p.prevY) * 10

      const dx = p.x - head.x
      const dy = p.y - head.y
      const dist = Math.hypot(dx, dy) || 1
      const burst = 5 + Math.random() * 5
      fp.vx += (dx / dist) * burst + (Math.random() - 0.5) * 2.5
      fp.vy += (dy / dist) * burst * 0.5 - 1.5 - Math.random() * 2
    }

    if (headGlow) {
      headGlow.visible = false
    }
    if (stemLine) {
      stemLine.visible = false
    }
  }

  /** 已脱离粒子的自由飘动物理 */
  function updateDetachedPhysics(time: number, dt: number): void {
    const dtSec = dt * 0.055
    const cx = canvasW / 2
    const cy = headPx.y
    const spreadP = spreadProgress.value
    const fillBoost = phase.value === 'spreading' ? 2.5 + spreadP * 5.5 : 1
    const friction = phase.value === 'spreading' ? 0.994 + spreadP * 0.004 : 0.988

    for (const fp of fluffParticles) {
      if (!fp.detached) continue

      const swirl = sharedPerlin.fbm(fp.px * 0.006, fp.py * 0.006 + time * 0.00015, 2)
      const gust = 0.45 + swirl * 0.4

      const dx = fp.px - cx
      const dy = fp.py - cy
      const dist = Math.hypot(dx, dy) || 1
      const spreadForce = fillBoost * 0.12 / (fp.distFromCenter / headSpread + 0.45)
      fp.vx += (dx / dist) * spreadForce * 0.06 + gust * 0.035
      fp.vy += (dy / dist) * spreadForce * 0.035 - 0.015 + gust * 0.02

      fp.vx += Math.sin(time * 0.0025 + fp.distFromCenter) * 0.05
      fp.vy += Math.cos(time * 0.002 + fp.distFromCenter) * 0.03

      fp.vx *= friction
      fp.vy *= friction
      fp.px += fp.vx * dtSec
      fp.py += fp.vy * dtSec

      fp.px = Math.max(-40, Math.min(canvasW + 40, fp.px))
      fp.py = Math.max(-40, Math.min(canvasH + 40, fp.py))
    }
  }

  /** 触发吹散 — 脱离粒子并施加冲量 */
  function triggerBlow(originX?: number, originY?: number): void {
    if (phase.value !== 'idle' || !engine) return
    phase.value = 'blowing'
    spreadStartTime = performance.now()
    detachAll()

    if (originX !== undefined && originY !== undefined) {
      for (const fp of fluffParticles) {
        const dx = fp.px - originX
        const dy = fp.py - originY
        const dist = Math.hypot(dx, dy) || 1
        const push = Math.max(0, 1 - dist / (headSpread * 1.2))
        fp.vx += (dx / dist) * push * 5
        fp.vy += (dy / dist) * push * 3 - push * 0.6
      }
    }

    setTimeout(() => {
      if (phase.value === 'blowing') phase.value = 'spreading'
    }, 120)
  }

  /** 主渲染循环 */
  function tick(timestamp: number): void {
    if (!lastTimestamp) lastTimestamp = timestamp
    const dt = Math.min(timestamp - lastTimestamp, 32)
    lastTimestamp = timestamp

    const canvas = canvasRef.value
    if (!canvas) {
      rafId = requestAnimationFrame(tick)
      return
    }

    if (!renderer) {
      initRenderer()
    }

    const dpr = Math.min(window.devicePixelRatio, MAX_DPR)
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    if (w > 0 && h > 0 && (w !== canvasW || h !== canvasH)) {
      canvasW = w
      canvasH = h
      renderer!.setPixelRatio(dpr)
      renderer!.setSize(w, h, false)
      updateSceneBackground(w, h)
      if (camera) {
        camera.left = -w / 2
        camera.right = w / 2
        camera.top = h / 2
        camera.bottom = -h / 2
        camera.updateProjectionMatrix()
      }
      composer?.setSize(w, h)
      buildScene(w, h)
    }

    if (!engine || !composer) {
      rafId = requestAnimationFrame(tick)
      return
    }

    if (phase.value === 'idle') {
      mouseSpeed *= 0.82
      updateIdlePhysics(timestamp, dt)
    } else if (phase.value === 'blowing' || phase.value === 'spreading') {
      updateDetachedPhysics(timestamp, dt)
      const elapsed = timestamp - spreadStartTime
      const progress = Math.min(1, elapsed / spreadDuration)
      spreadProgress.value = progress

      /** 粒子逐渐放大、增亮，营造「充满屏幕」感 */
      if (points) {
        const mat = points.material as THREE.PointsMaterial
        mat.opacity = 0.58 + progress * 0.42
        mat.size = PARTICLE_SIZE * (1 + progress * 2.4)
      }

      /** 末段拉高 Bloom，配合 Landing 白光层 */
      if (bloomPass) {
        bloomPass.strength = BLOOM_STRENGTH + progress * 1.35
        bloomPass.radius = BLOOM_RADIUS + progress * 0.42
        bloomPass.threshold = Math.max(0.28, BLOOM_THRESHOLD - progress * 0.62)
      }

      /** 55% 之后白光渐起，100% 时全屏过曝 */
      lightIntensity.value =
        progress < 0.55 ? 0 : Math.pow((progress - 0.55) / 0.45, 1.35)

      if (elapsed >= spreadDuration) {
        phase.value = 'done'
        spreadProgress.value = 1
        lightIntensity.value = 1
        onTransitionComplete?.()
      }
    }

    syncPointPositions()
    if (phase.value === 'idle' || phase.value === 'blowing') {
      updateStemPositions()
    }

    composer.render()
    rafId = requestAnimationFrame(tick)
  }

  /** 指针移动 — 预热检测与吹散触发 */
  function onPointerMove(e: PointerEvent): void {
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    prevMouse = mouse ?? { x, y }
    mouse = { x, y }
    mouseSpeed = Math.hypot(e.movementX, e.movementY)

    if (phase.value !== 'idle' || !engine) return

    const head = engine.particles[headEngineId]
    const dist = Math.hypot(x - head.x, y - head.y)
    const enterRadius = headSpread * 1.1
    if (dist >= enterRadius) return

    const speed = Math.max(
      Math.hypot(e.movementX, e.movementY),
      Math.hypot(x - prevMouse.x, y - prevMouse.y),
    )
    const proximity = Math.pow(1 - dist / enterRadius, 1.1)
    const triggerAmount = Math.min(1, Math.max(0.12, speed / 12)) * proximity

    let peakWarmup = 0
    let warmedCount = 0
    const seedRadius = headSpread * 0.65

    for (const fp of fluffParticles) {
      if (fp.detached) continue
      const p = engine.particles[fp.engineId]
      const sDist = Math.hypot(p.x - x, p.y - y)
      if (sDist < seedRadius) {
        const warm = Math.max(0, 1 - sDist / seedRadius)
        const layerBoost = [0.7, 0.95, 1.15][fp.layer] ?? 0.85
        fp.warmup = Math.min(1, fp.warmup + warm * triggerAmount * layerBoost * 0.12)
        peakWarmup = Math.max(peakWarmup, fp.warmup)
        if (fp.warmup > 0.35) warmedCount++
      }
    }

    const fastSwipe = speed > 4 && triggerAmount > 0.25
    const enoughWarmth = warmedCount >= 18 && peakWarmup >= 0.5
    const deepWarmth = peakWarmup >= 0.68 && speed > 2

    if (fastSwipe || enoughWarmth || deepWarmth) {
      triggerBlow(x, y)
    }
  }

  /** 指针离开画布 */
  function onPointerLeave(): void {
    mouse = null
    prevMouse = null
    mouseSpeed = 0
  }

  /** 释放 GPU 资源 */
  function dispose(): void {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', onResize)

    if (points) {
      points.geometry.dispose()
      ;(points.material as THREE.Material).dispose()
    }
    if (stemLine) {
      stemLine.geometry.dispose()
      ;(stemLine.material as THREE.Material).dispose()
    }
    if (headGlow) {
      headGlow.geometry.dispose()
      ;(headGlow.material as THREE.Material).dispose()
    }
    glowTexture?.dispose()
    backgroundTexture?.dispose()
    renderer?.dispose()
    renderer = null
    scene = null
    camera = null
    composer = null
    engine = null
    points = null
    fluffParticles = []
    backgroundTexture = null
  }

  /** 窗口 resize 处理 */
  function onResize(): void {
    const canvas = canvasRef.value
    if (!canvas || !renderer || !camera) return
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvasW = w
    canvasH = h
    renderer.setSize(w, h, false)
    updateSceneBackground(w, h)
    camera.left = -w / 2
    camera.right = w / 2
    camera.top = h / 2
    camera.bottom = -h / 2
    camera.updateProjectionMatrix()
    composer?.setSize(w, h)
    buildScene(w, h)
  }

  onMounted(() => {
    rafId = requestAnimationFrame(tick)
    window.addEventListener('resize', onResize)
  })

  onUnmounted(dispose)

  return {
    phase,
    spreadProgress,
    lightIntensity,
    onPointerMove,
    onPointerLeave,
    triggerBlow,
  }
}
