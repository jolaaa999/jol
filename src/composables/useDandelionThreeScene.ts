import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { PhysicsEngine, type Vec2 } from './usePhysicsEngine'
import { sharedPerlin } from '@/utils/perlinNoise'
import { getLandingLayout } from '@/composables/landingLayout'

export type DandelionPhase = 'idle' | 'blowing' | 'spreading' | 'done'

export interface DandelionThreeOptions {
  /** 吹散后飘满屏幕的时长 (ms) */
  spreadDuration?: number
  onTransitionComplete?: () => void
}

interface FluffParticle {
  engineId: number
  detached: boolean
  px: number
  py: number
  vx: number
  vy: number
  distFromCenter: number
  layer: number
  warmup: number
  goldMix: number
  z: number
}

const STEM_NODES = 8
const PARTICLE_COUNT = 1280
const PARTICLE_SIZE = 4.3
const MAX_DPR = 2
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

function createGlowTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255, 255, 255, 1)')
  g.addColorStop(0.25, 'rgba(255, 245, 220, 0.85)')
  g.addColorStop(0.55, 'rgba(255, 210, 140, 0.35)')
  g.addColorStop(1, 'rgba(255, 180, 80, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

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

function pxToWorld(px: number, py: number, w: number, h: number): THREE.Vector3 {
  return new THREE.Vector3(px - w / 2, h / 2 - py, 0)
}

export function useDandelionThreeScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: DandelionThreeOptions = {},
) {
  const { spreadDuration = 2800, onTransitionComplete } = options

  const phase = ref<DandelionPhase>('idle')
  const fadeOpacity = ref(1)

  let renderer: THREE.WebGLRenderer | null = null
  let scene: THREE.Scene | null = null
  let camera: THREE.OrthographicCamera | null = null
  let composer: EffectComposer | null = null
  let engine: PhysicsEngine | null = null
  let fluffParticles: FluffParticle[] = []
  let points: THREE.Points | null = null
  let posAttr: THREE.BufferAttribute | null = null
  let colorAttr: THREE.BufferAttribute | null = null
  let stemLine: THREE.Line | null = null
  let headGlow: THREE.Mesh | null = null
  let glowTexture: THREE.CanvasTexture | null = null

  let mouse: Vec2 | null = null
  let prevMouse: Vec2 | null = null
  let headEngineId = 0
  let rafId = 0
  let lastTimestamp = 0
  let spreadStartTime = 0
  let canvasW = 0
  let canvasH = 0
  let headSpread = 120
  let headPx = { x: 0, y: 0 }

  function buildScene(width: number, height: number): void {
    canvasW = width
    canvasH = height

    const { cx, groundY, headY } = getLandingLayout(width, height)
    headSpread = Math.min(width, height) * 0.34
    headPx = { x: cx, y: groundY - (STEM_NODES - 1) * ((groundY - headY) / (STEM_NODES - 1)) }

    engine = new PhysicsEngine({
      gravity: { x: 0, y: 0 },
      globalDamping: 0.988,
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
        damping: 0.016,
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
      colors[i * 3] = 0.92 + g * 0.08
      colors[i * 3 + 1] = 0.88 + g * 0.1
      colors[i * 3 + 2] = 0.72 + g * 0.2
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
      opacity: 0.9,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: false,
    })

    points = new THREE.Points(geo, mat)
    scene.add(points)
  }

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
    const glowGeo = new THREE.CircleGeometry(headSpread * 0.28, 36)
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xfff4d0,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    headGlow = new THREE.Mesh(glowGeo, glowMat)
    headGlow.position.set(hw.x, hw.y, -2)
    scene.add(headGlow)
  }

  function initRenderer(): void {
    const canvas = canvasRef.value
    if (!canvas || renderer) return

    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvasW = w
    canvasH = h

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR))
    renderer.setSize(w, h, false)

    scene = new THREE.Scene()

    camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 500)
    camera.position.set(0, 0, 100)

    const renderPass = new RenderPass(scene, camera)
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.35, 0.62)
    composer = new EffectComposer(renderer)
    composer.addPass(renderPass)
    composer.addPass(bloom)

    buildScene(w, h)
  }

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
      mat.opacity = 0.14 + Math.sin(lastTimestamp * 0.002) * 0.05
    }
  }

  function updateIdlePhysics(time: number, dt: number): void {
    if (!engine) return
    const head = engine.particles[headEngineId]
    const mouseVec = mouse ?? { x: head.x, y: head.y }
    const headDist = Math.hypot(mouseVec.x - head.x, mouseVec.y - head.y)
    const hoverRadius = headSpread * 0.95
    const hoverPull = headDist < hoverRadius ? Math.pow(1 - headDist / hoverRadius, 1.5) : 0
    const gustPulse = 0.35 + Math.max(0, Math.sin(time * 0.0016))

    engine.step(dt, (p, i) => {
      if (p.pinned) return { x: 0, y: 0 }

      if (i <= headEngineId) {
        const nodeFactor = i / (STEM_NODES - 1)
        const ambient = sharedPerlin.sampleWindField(p.x, p.y, time, 0.002, 3)
        const gust = computeMouseWind(mouseVec, head, hoverRadius, (0.9 + hoverPull) * gustPulse)
        const fs = dt * 0.004
        return {
          x: (gust.x * nodeFactor * 1.1 + ambient.x * 0.06 * nodeFactor) * fs,
          y: (gust.y * nodeFactor * 0.85 + ambient.y * 0.04 * nodeFactor) * fs,
        }
      }

      const wind = sharedPerlin.sampleWindField(p.x, p.y, time, 0.005, 3)
      const mouseWind = computeMouseWind(mouseVec, p, headSpread * 0.7, (0.6 + hoverPull) * gustPulse)
      const fs = dt * 0.0032
      return {
        x: (wind.x * 0.32 + mouseWind.x) * fs,
        y: (wind.y * 0.18 + mouseWind.y) * fs,
      }
    })
  }

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

  function updateDetachedPhysics(time: number, dt: number): void {
    const dtSec = dt * 0.055
    const cx = canvasW / 2
    const cy = headPx.y
    const fillBoost = phase.value === 'spreading' ? 2.5 : 1
    const friction = phase.value === 'spreading' ? 0.993 : 0.988

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
      updateIdlePhysics(timestamp, dt)
    } else if (phase.value === 'blowing' || phase.value === 'spreading') {
      updateDetachedPhysics(timestamp, dt)
      const elapsed = timestamp - spreadStartTime
      const progress = elapsed / spreadDuration
      fadeOpacity.value = Math.max(0, 1 - progress * 0.35)

      if (elapsed >= spreadDuration) {
        phase.value = 'done'
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

  function onPointerMove(e: PointerEvent): void {
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    prevMouse = mouse ?? { x, y }
    mouse = { x, y }

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

  function onPointerLeave(): void {
    mouse = null
    prevMouse = null
  }

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
    renderer?.dispose()
    renderer = null
    scene = null
    camera = null
    composer = null
    engine = null
    points = null
    fluffParticles = []
  }

  function onResize(): void {
    const canvas = canvasRef.value
    if (!canvas || !renderer || !camera) return
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvasW = w
    canvasH = h
    renderer.setSize(w, h, false)
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
    fadeOpacity,
    onPointerMove,
    onPointerLeave,
    triggerBlow,
  }
}
