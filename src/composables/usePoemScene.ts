import { ref, onUnmounted, type Ref } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { PoemLayout } from '@/types/poem'
import { collectDistractorChars, buildBackgroundCharPool } from '@/utils/poemLayout'
import { fontHasChar } from '@/utils/chineseFontLoader'

/** 诗词场景阶段 */
export type PoemScenePhase = 'loading' | 'playing' | 'dissolving' | 'complete'

/** usePoemScene 可选配置 */
export interface UsePoemSceneOptions {
  /** 流光解体完成回调 */
  onComplete?: () => void
  /** 流光解体动画时长 (ms) */
  dissolveDuration?: number
}

/** 悬浮诗文字槽 — 含占位与目标位置 */
interface FloatingSlot {
  /** 对应布局全局序号 */
  slotIndex: number
  /** 已填入的文字 Mesh（挖空位未填时为 null） */
  mesh: THREE.Mesh | null
  /** 挖空占位框 Mesh */
  placeholder: THREE.Mesh | null
  /** 目标世界坐标 */
  targetPos: THREE.Vector3
  /** 正确字符 */
  char: string
}

/** 地面散落字块数据 */
interface GroundTile {
  /** 字符内容 */
  char: string
  /** 对应 Three.js Mesh */
  mesh: THREE.Mesh
  /** 是否为正确答案 */
  isCorrect: boolean
  /** 对应挖空位全局序号 */
  blankGlobalIndex: number | null
  /** 是否已被拾取 */
  picked: boolean
  /** 相对标准字号的缩放比 */
  sizeRatio: number
}

/** 解体流光粒子 */
interface Particle {
  /** 当前 X */
  x: number
  /** 当前 Y */
  y: number
  /** 当前 Z */
  z: number
  /** X 方向速度 */
  vx: number
  /** Y 方向速度 */
  vy: number
  /** Z 方向速度 */
  vz: number
}

/** 竖排列间距 */
const COL_SP = 1.25
/** 竖排行间距 */
const ROW_SP = 1.0
/** 主诗文字号 */
const CHAR_SIZE = 0.52
/** 主诗文字深度 */
const CHAR_DEPTH = 0.08
/** 背景字字号 */
const BG_CHAR_SIZE = 0.38
/** 地面 Y 坐标 */
const GROUND_Y = -3.2
/** 地面字散射半径 */
const SCATTER_R = 11
/** 地面字最小尺寸 */
const GROUND_CHAR_MIN = 0.32
/** 地面字最大尺寸 */
const GROUND_CHAR_MAX = 0.84
/** 地面额外干扰字数量 */
const GROUND_EXTRA_COUNT = 1056
/** 背景字 Z 深度 */
const BG_Z = -14
/** 背景字网格单元尺寸 */
const BG_CELL = 1.92
/** 默认流光解体时长 (ms) */
const DEFAULT_DISSOLVE_MS = 2000

/** 背景闪烁字数据 */
interface BackgroundChar {
  /** 文字 Mesh */
  mesh: THREE.Mesh
  /** 闪烁相位偏移 */
  phase: number
  /** 闪烁速度倍率 */
  speed: number
}

/** 诗词 Three.js 场景 Composable */
export function usePoemScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  layoutRef: Ref<PoemLayout | null>,
  fontRef: Ref<Font | null>,
  options: UsePoemSceneOptions = {},
) {
  const { onComplete, dissolveDuration = DEFAULT_DISSOLVE_MS } = options

  /** 当前场景阶段 */
  const phase = ref<PoemScenePhase>('loading')
  /** 已填入的挖空位数量 */
  const filledCount = ref(0)
  /** 挖空位总数 */
  const totalBlanks = ref(0)

  /** WebGL 渲染器 */
  let renderer: THREE.WebGLRenderer | null = null
  /** Three.js 场景根节点 */
  let scene: THREE.Scene | null = null
  /** 透视相机 */
  let camera: THREE.PerspectiveCamera | null = null
  /** 后处理合成器（Bloom） */
  let composer: EffectComposer | null = null
  /** 射线拾取器 */
  let raycaster = new THREE.Raycaster()
  /** 归一化指针坐标 */
  let pointer = new THREE.Vector2()
  /** requestAnimationFrame 句柄 */
  let rafId = 0
  /** 场景时钟 */
  let clock = new THREE.Clock()

  /** 悬浮诗文组 */
  const poemGroup = new THREE.Group()
  /** 背景字阵组 */
  const backgroundGroup = new THREE.Group()
  /** 地面散落字组 */
  const groundGroup = new THREE.Group()
  /** 悬浮字槽列表 */
  const floatingSlots: FloatingSlot[] = []
  /** 地面字块列表 */
  const groundTiles: GroundTile[] = []
  /** 背景闪烁字列表 */
  const backgroundChars: BackgroundChar[] = []
  /** 解体流光粒子数组 */
  let particles: Particle[] | null = null
  /** 流光 Points Mesh */
  let pointsMesh: THREE.Points | null = null
  /** 解体动画起始时间戳 */
  let dissolveStart = 0
  /** 画布宽度 */
  let width = 0
  /** 画布高度 */
  let height = 0

  // ── 材质工厂 ──

  /** 创建发光诗文字材质 */
  function createGlowMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xfff8e8,
      emissive: 0xffe090,
      emissiveIntensity: 0.95,
      metalness: 0.22,
      roughness: 0.38,
    })
  }

  /** 创建背景字材质 */
  function createBackgroundMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x9a8e78,
      emissive: 0x3a3428,
      emissiveIntensity: 0.12,
      metalness: 0.1,
      roughness: 0.72,
    })
  }

  /** 创建地面字材质 */
  function createGroundMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xc8b890,
      emissive: 0x5a4830,
      emissiveIntensity: 0.28,
      metalness: 0.2,
      roughness: 0.58,
    })
  }

  /** 创建挖空占位框材质 */
  function createPlaceholderMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x2a2210,
      emissive: 0x332a0a,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.45,
      metalness: 0.2,
      roughness: 0.6,
    })
  }

  /** 创建挖空占位方块 */
  function makeBlankPlaceholder(pos: THREE.Vector3): THREE.Mesh {
    const geo = new THREE.BoxGeometry(CHAR_SIZE * 0.85, CHAR_SIZE * 1.05, CHAR_DEPTH * 0.6)
    const mat = createPlaceholderMaterial()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(pos)
    mesh.userData.isPlaceholder = true
    return mesh
  }

  /** 创建三维文字 Mesh */
  function makeTextMesh(
    font: Font,
    char: string,
    material: THREE.Material,
    size = CHAR_SIZE,
    depth = CHAR_DEPTH,
  ): THREE.Mesh {
    const renderChar = fontHasChar(font, char)
      ? char
      : fontHasChar(font, '□')
        ? '□'
        : '?'
    const geo = new TextGeometry(renderChar, {
      font,
      size,
      depth,
      curveSegments: 6,
      bevelEnabled: false,
    })
    geo.computeBoundingBox()
    geo.center()
    const mesh = new THREE.Mesh(geo, material)
    return mesh
  }

  // ── 布局坐标 ──

  /** 计算槽位世界坐标（竖排布局） */
  function slotWorldPosition(col: number, row: number, maxRows: number): THREE.Vector3 {
    const lineCount = layoutRef.value?.lines.length ?? 1
    const maxCol = lineCount - 1
    const cx = maxCol * COL_SP * 0.5
    const cy = (maxRows - 1) * ROW_SP * 0.5
    return new THREE.Vector3(
      cx - col * COL_SP,
      cy - row * ROW_SP + 0.5,
      0,
    )
  }

  // ── 场景构建 ──

  /** 构建悬浮主诗文字 */
  function buildFloatingPoem(font: Font, layout: PoemLayout): void {
    poemGroup.clear()
    floatingSlots.length = 0

    const maxRows = Math.max(...layout.lines.map((l) => l.length))

    for (const slot of layout.slots) {
      const pos = slotWorldPosition(slot.col, slot.row, maxRows)
      const entry: FloatingSlot = {
        slotIndex: slot.globalIndex,
        mesh: null,
        placeholder: null,
        targetPos: pos.clone(),
        char: slot.char,
      }

      if (slot.isBlank) {
        const ph = makeBlankPlaceholder(pos)
        poemGroup.add(ph)
        entry.placeholder = ph
      } else {
        const mesh = makeTextMesh(font, slot.char, createGlowMaterial())
        mesh.position.copy(pos)
        poemGroup.add(mesh)
        entry.mesh = mesh
      }

      floatingSlots.push(entry)
    }

    totalBlanks.value = layout.blankIndices.size
    filledCount.value = 0
  }

  /** 构建远景背景字阵 */
  function buildBackgroundBoard(font: Font, layout: PoemLayout): void {
    for (const bg of backgroundChars) {
      bg.mesh.geometry.dispose()
      ;(bg.mesh.material as THREE.Material).dispose()
    }
    backgroundChars.length = 0
    backgroundGroup.clear()

    if (!camera) return

    const pool = buildBackgroundCharPool(layout)
    let poolIdx = 0

    const dist = Math.abs(camera.position.z - BG_Z)
    const vFov = (camera.fov * Math.PI) / 180
    const visibleH = 2 * Math.tan(vFov / 2) * dist
    const visibleW = visibleH * camera.aspect

    const marginX = visibleW * 0.55
    const marginY = visibleH * 0.52
    const cols = Math.ceil(marginX * 2 / BG_CELL) + 2
    const rows = Math.ceil(marginY * 2 / BG_CELL) + 2
    const startX = -(cols * BG_CELL) / 2
    const startY = -(rows * BG_CELL) / 2 + 0.6

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * BG_CELL + (Math.random() - 0.5) * 0.22
        const y = startY + row * BG_CELL + (Math.random() - 0.5) * 0.22

        if (Math.abs(x) < 3.8 && Math.abs(y - 0.8) < 4.2) continue

        const char = pool[poolIdx % pool.length]
        poolIdx++

        const mesh = makeTextMesh(font, char, createBackgroundMaterial(), BG_CHAR_SIZE, CHAR_DEPTH * 0.6)
        mesh.position.set(x, y, BG_Z)
        mesh.rotation.set(0, 0, 0)
        backgroundGroup.add(mesh)
        backgroundChars.push({
          mesh,
          phase: Math.random() * Math.PI * 2,
          speed: 0.35 + Math.random() * 0.85,
        })
      }
    }
  }

  /** 更新中心诗文字呼吸辉光 */
  function updatePoemGlow(time: number): void {
    const pulse = 0.9 + Math.sin(time * 1.35) * 0.1
    poemGroup.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || obj.userData.isPlaceholder) return
      const mat = obj.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.88 * pulse
    })
  }

  /** 更新背景字闪烁发光 */
  function updateBackgroundSparkle(time: number): void {
    for (const bg of backgroundChars) {
      const mat = bg.mesh.material as THREE.MeshStandardMaterial
      const t = time * bg.speed + bg.phase
      const flicker =
        Math.sin(t * 1.65) * Math.sin(t * 2.35 + 0.9) * Math.sin(t * 0.58 + 1.4)
      const sparkle = flicker > 0.72 ? (flicker - 0.72) / 0.28 : 0
      const eased = sparkle * sparkle * (3 - 2 * sparkle)

      mat.emissiveIntensity = 0.1 + eased * 0.82
      mat.emissive.setRGB(0.22 + eased * 0.55, 0.17 + eased * 0.42, 0.04 + eased * 0.06)
      mat.color.setRGB(0.58 + eased * 0.18, 0.52 + eased * 0.22, 0.42 + eased * 0.12)
    }
  }

  /** 随机地面字尺寸（正确字偏大） */
  function randomGroundCharSize(isCorrect: boolean): number {
    if (isCorrect) {
      return CHAR_SIZE * (0.78 + Math.random() * 0.38)
    }
    const t = Math.random()
    const skew = t * t
    return GROUND_CHAR_MIN + skew * (GROUND_CHAR_MAX - GROUND_CHAR_MIN)
  }

  /** 构建地面散落字块 */
  function buildGroundChars(font: Font, layout: PoemLayout): void {
    groundGroup.clear()
    groundTiles.length = 0

    const distractors = [
      ...collectDistractorChars(layout),
      ...buildBackgroundCharPool(layout),
    ]
    const correctChars = layout.slots
      .filter((s) => s.isBlank)
      .map((s) => ({ char: s.char, idx: s.globalIndex }))

    const pool: Array<{ char: string; isCorrect: boolean; blankIdx: number | null }> = []

    for (const c of correctChars) {
      pool.push({ char: c.char, isCorrect: true, blankIdx: c.idx })
    }

    for (let i = 0; i < GROUND_EXTRA_COUNT; i++) {
      const char = distractors[Math.floor(Math.random() * distractors.length)]
      pool.push({ char, isCorrect: false, blankIdx: null })
    }

    pool.sort(() => Math.random() - 0.5)

    for (const item of pool) {
      const angle = Math.random() * Math.PI * 2
      const r = 2.5 + Math.sqrt(Math.random()) * SCATTER_R
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      const y = GROUND_Y + (Math.random() - 0.5) * 0.35
      const charSize = randomGroundCharSize(item.isCorrect)
      const sizeRatio = charSize / CHAR_SIZE

      const mesh = makeTextMesh(font, item.char, createGroundMaterial(), charSize)
      mesh.position.set(x, y, z)
      mesh.rotation.set(0, 0, (Math.random() - 0.5) * 0.05)
      mesh.userData.groundChar = true
      groundGroup.add(mesh)

      groundTiles.push({
        char: item.char,
        mesh,
        isCorrect: item.isCorrect,
        blankGlobalIndex: item.blankIdx,
        picked: false,
        sizeRatio,
      })
    }
  }

  // ── 初始化 / 销毁 ──

  /** 初始化 WebGL 渲染器与场景 */
  function initRenderer(): void {
    const canvas = canvasRef.value
    if (!canvas) return

    width = canvas.clientWidth
    height = canvas.clientHeight

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.88

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050508)
    scene.fog = new THREE.FogExp2(0x050508, 0.028)

    camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200)
    camera.position.set(0, 0.9, 13)
    camera.lookAt(0, 0.6, 0)

    scene.add(new THREE.AmbientLight(0x3a3848, 1.0))
    const key = new THREE.DirectionalLight(0xfff0d8, 0.95)
    key.position.set(2, 6, 10)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xc8d0e8, 0.35)
    fill.position.set(-4, 2, 6)
    scene.add(fill)
    const rim = new THREE.PointLight(0xffb040, 0.45, 40)
    rim.position.set(-5, 3, -3)
    scene.add(rim)
    /** 中心诗文暖光 — 强化主字辉光 */
    const poemKey = new THREE.PointLight(0xffe8a8, 1.35, 18)
    poemKey.position.set(0, 1.2, 4)
    scene.add(poemKey)

    scene.add(backgroundGroup)
    scene.add(poemGroup)
    scene.add(groundGroup)

    const renderPass = new RenderPass(scene, camera)
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.55,
      0.52,
      0.52,
    )
    composer = new EffectComposer(renderer)
    composer.addPass(renderPass)
    composer.addPass(bloom)

    poemGroup.position.set(0, 0.8, 0)
    poemGroup.rotation.set(0, 0, 0)
  }

  /** 重建完整场景内容 */
  function rebuildScene(): void {
    const font = fontRef.value
    const layout = layoutRef.value
    if (!font || !layout || !scene) return
    buildBackgroundBoard(font, layout)
    buildFloatingPoem(font, layout)
    buildGroundChars(font, layout)
    phase.value = 'playing'
  }

  /** 释放所有 GPU 资源与监听 */
  function dispose(): void {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pointerdown', onPointerDown)

    gsap.killTweensOf('*')

    if (renderer) {
      renderer.dispose()
      renderer = null
    }
    composer = null
    scene = null
    camera = null
    particles = null
    pointsMesh = null
    floatingSlots.length = 0
    groundTiles.length = 0
    for (const bg of backgroundChars) {
      bg.mesh.geometry.dispose()
      ;(bg.mesh.material as THREE.Material).dispose()
    }
    backgroundChars.length = 0
    poemGroup.clear()
    backgroundGroup.clear()
    groundGroup.clear()
  }

  // ── 交互 ──

  /** 指针按下 — 射线检测地面字 */
  function onPointerDown(e: PointerEvent): void {
    if (phase.value !== 'playing' || !camera || !scene) return

    const canvas = canvasRef.value
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(groundGroup.children, false)
    if (!hits.length) return

    const mesh = hits[0].object as THREE.Mesh
    const tile = groundTiles.find((t) => t.mesh === mesh)
    if (!tile || tile.picked) return

    handleGroundPick(tile)
  }

  /** 处理地面字点击 */
  function handleGroundPick(tile: GroundTile): void {
    if (!tile.isCorrect || tile.blankGlobalIndex === null) {
      gsap.to(tile.mesh.scale, {
        x: 0.85,
        y: 0.85,
        z: 0.85,
        duration: 0.08,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
      })
      return
    }

    const slot = floatingSlots.find((f) => f.slotIndex === tile.blankGlobalIndex)
    const layout = layoutRef.value
    if (!slot || !layout || slot.mesh) return

    tile.picked = true
    flyCharToSlot(tile, slot)
  }

  /** 字块飞向诗文字槽的贝塞尔动画 */
  function flyCharToSlot(tile: GroundTile, slot: FloatingSlot): void {
    const font = fontRef.value
    if (!font) return

    const startPos = tile.mesh.position.clone()
    const startRot = tile.mesh.rotation.clone()

    tile.mesh.visible = false

    const startScale = new THREE.Vector3(tile.sizeRatio, tile.sizeRatio, tile.sizeRatio)
    const flying = makeTextMesh(font, tile.char, createGroundMaterial(), CHAR_SIZE)
    flying.position.copy(startPos)
    flying.rotation.copy(startRot)
    flying.scale.copy(startScale)
    scene!.add(flying)

    const targetScale = new THREE.Vector3(1, 1, 1)

    const target = slot.targetPos.clone().add(poemGroup.position)
    const mid = new THREE.Vector3(
      (startPos.x + target.x) * 0.5,
      Math.max(startPos.y, target.y) + 3.5,
      (startPos.z + target.z) * 0.5,
    )

    const progress = { t: 0 }
    gsap.to(progress, {
      t: 1,
      duration: 0.85,
      ease: 'power3.inOut',
      onUpdate: () => {
        const t = progress.t
        const u = 1 - t
        flying.position.set(
          u * u * startPos.x + 2 * u * t * mid.x + t * t * target.x,
          u * u * startPos.y + 2 * u * t * mid.y + t * t * target.y,
          u * u * startPos.z + 2 * u * t * mid.z + t * t * target.z,
        )
        flying.rotation.x = THREE.MathUtils.lerp(startRot.x, 0, t)
        flying.rotation.z = THREE.MathUtils.lerp(startRot.z, 0, t)
        flying.scale.lerpVectors(startScale, targetScale, t)
      },
      onComplete: () => {
        scene!.remove(flying)
        flying.geometry.dispose()
        ;(flying.material as THREE.Material).dispose()

        if (slot.placeholder) {
          poemGroup.remove(slot.placeholder)
          slot.placeholder.geometry.dispose()
          ;(slot.placeholder.material as THREE.Material).dispose()
          slot.placeholder = null
        }

        const glowMesh = makeTextMesh(font, tile.char, createGlowMaterial())
        glowMesh.position.copy(slot.targetPos)
        poemGroup.add(glowMesh)
        slot.mesh = glowMesh

        gsap.fromTo(
          glowMesh.scale,
          { x: 1.25, y: 1.25, z: 1.25 },
          { x: 1, y: 1, z: 1, duration: 0.35, ease: 'elastic.out(1, 0.55)' },
        )
        const mat = glowMesh.material as THREE.MeshStandardMaterial
        const emissive = { intensity: mat.emissiveIntensity }
        gsap.fromTo(emissive, { intensity: 1.35 }, {
          intensity: 0.95,
          duration: 0.5,
          ease: 'power2.out',
          onUpdate: () => {
            mat.emissiveIntensity = emissive.intensity
          },
        })

        filledCount.value++
        const layout = layoutRef.value
        if (layout) {
          const s = layout.slots.find((x) => x.globalIndex === slot.slotIndex)
          if (s) s.filled = true
        }

        if (filledCount.value >= totalBlanks.value) {
          setTimeout(() => startDissolve(), 400)
        }
      },
    })
  }

  // ── 流光解体 ──

  /** 开始流光解体动画 */
  function startDissolve(): void {
    if (phase.value !== 'playing') return
    phase.value = 'dissolving'
    dissolveStart = performance.now()

    const positions: number[] = []
    const velocities: Particle[] = []

    poemGroup.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      const geo = obj.geometry as THREE.BufferGeometry
      const posAttr = geo.getAttribute('position')
      if (!posAttr) return

      const worldMatrix = obj.matrixWorld
      const v = new THREE.Vector3()

      for (let i = 0; i < posAttr.count; i += 3) {
        v.fromBufferAttribute(posAttr, i)
        v.applyMatrix4(worldMatrix)

        const dx = v.x + (Math.random() - 0.5) * 0.2
        const dy = v.y + (Math.random() - 0.5) * 0.2
        const dz = v.z + (Math.random() - 0.5) * 0.2
        positions.push(dx, dy, dz)

        const dir = new THREE.Vector3(
          dx - poemGroup.position.x,
          dy - poemGroup.position.y,
          dz - poemGroup.position.z,
        )
        if (dir.lengthSq() < 0.01) dir.set(Math.random() - 0.5, Math.random(), Math.random() - 0.5)
        dir.normalize()

        const burst = 0.06 + Math.random() * 0.12
        velocities.push({
          x: dx,
          y: dy,
          z: dz,
          vx: dir.x * burst + (Math.random() - 0.5) * 0.04,
          vy: dir.y * burst + 0.02 + Math.random() * 0.04,
          vz: dir.z * burst + (Math.random() - 0.5) * 0.04,
        })
      }
      obj.visible = false
    })

    groundGroup.visible = false

    const buf = new THREE.BufferGeometry()
    buf.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

    const mat = new THREE.PointsMaterial({
      color: 0xffd040,
      size: 0.06,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    pointsMesh = new THREE.Points(buf, mat)
    scene!.add(pointsMesh)
    particles = velocities
  }

  /** 更新解体粒子运动与淡出 */
  function updateDissolve(dt: number): void {
    if (!particles || !pointsMesh) return

    const elapsed = performance.now() - dissolveStart
    const fade = Math.max(0, 1 - elapsed / dissolveDuration)

    for (const p of particles) {
      p.vx *= 0.985
      p.vy *= 0.985
      p.vz *= 0.985
      p.vy += 0.0008
      p.x += p.vx * dt * 60
      p.y += p.vy * dt * 60
      p.z += p.vz * dt * 60
    }

    const arr = pointsMesh.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < particles.length; i++) {
      arr.setXYZ(i, particles[i].x, particles[i].y, particles[i].z)
    }
    arr.needsUpdate = true
    ;(pointsMesh.material as THREE.PointsMaterial).opacity = fade

    if (elapsed >= dissolveDuration) {
      phase.value = 'complete'
      onComplete?.()
      dispose()
    }
  }

  // ── 渲染循环 ──

  /** 画布尺寸变化时重建 */
  function onResize(): void {
    const canvas = canvasRef.value
    if (!canvas || !camera || !renderer || !composer) return
    width = canvas.clientWidth
    height = canvas.clientHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    composer.setSize(width, height)
    const layout = layoutRef.value
    const font = fontRef.value
    if (layout && font && scene) {
      buildBackgroundBoard(font, layout)
    }
  }

  /** 渲染循环 */
  function animate(): void {
    rafId = requestAnimationFrame(animate)
    if (!renderer || !scene || !camera || !composer) return

    const dt = clock.getDelta()

    if (phase.value === 'playing') {
      updatePoemGlow(clock.elapsedTime)
      updateBackgroundSparkle(clock.elapsedTime)
      groundGroup.children.forEach((c, i) => {
        c.position.y = GROUND_Y + Math.sin(clock.elapsedTime * 0.8 + i) * 0.02
      })
    }

    if (phase.value === 'dissolving') {
      updateDissolve(dt)
    }

    composer.render()
  }

  /** 初始化场景并启动循环 */
  function init(): void {
    if (!canvasRef.value || !fontRef.value || !layoutRef.value) return
    if (renderer) return
    initRenderer()
    rebuildScene()
    rafId = requestAnimationFrame(animate)
    window.addEventListener('resize', onResize)
    window.addEventListener('pointerdown', onPointerDown)
  }

  onUnmounted(dispose)

  return {
    phase,
    filledCount,
    totalBlanks,
    init,
    dispose,
    rebuildScene,
  }
}
