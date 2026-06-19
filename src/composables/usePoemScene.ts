import { ref, onUnmounted, type Ref } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { PoemLayout } from '@/types/poem'
import { buildBackgroundCharPool, buildGroundDistractorPool } from '@/utils/poemLayout'
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
  /** 干扰字流光相位（仅干扰字） */
  phase?: number
  /** 干扰字流光速度（仅干扰字） */
  speed?: number
}

/** 已放置字块的圆柱面占位（防重叠） */
interface PlacedGroundSlot {
  theta: number
  y: number
  radius: number
  charRadius: number
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
const COL_SP = 1.48
/** 竖排行间距 */
const ROW_SP = 1.22
/** 主诗文字号 */
const CHAR_SIZE = 0.64
/** 主诗文字深度 */
const CHAR_DEPTH = 0.08
/** 背景字字号 */
const BG_CHAR_SIZE = 0.38
/** 中心诗区 Y 锚点 */
const POEM_CENTER_Y = 0.85
/** 竖排各列垂直错位幅度 — 多列时高低参差 */
const COL_Y_STAGGER_AMP = 1.75
/** 凸弧面包围 — 非 360°，仅相机前方扇形（约 138°） */
const ARC_SPAN = 2.42
/** 弧面轴心 Y */
const ARC_AXIS_Y = POEM_CENTER_Y + 0.8
/** 背景字弧面半径 */
const ARC_BG_RADIUS = 9.4
/** 干扰字弧面半径 — 内（大）~ 外（小） */
const ARC_GROUND_RADIUS_NEAR = 4.5
const ARC_GROUND_RADIUS_FAR = 7.6
/** 正确答案弧面半径 */
const ARC_CORRECT_RADIUS = 5.1
/** 弧面纵向半高 */
const ARC_HALF_HEIGHT = 5.0
/** 中心诗区角向/纵向避让（归一化 u,v） */
const ARC_CENTER_CLEAR_U = 0.22
const ARC_CENTER_CLEAR_V = 0.26
/** 边缘字号缩放 — 中心 1.0，两侧缩小 */
const ARC_EDGE_SCALE_BG = 0.5
const ARC_EDGE_SCALE_GROUND = 0.58
/** 背景网格密度 */
const ARC_BG_COLS = 12
const ARC_BG_ROWS = 10
/** 弧面轻微呼吸摆动（弧度） */
const ARC_SWAY_AMP = 0.028
const ARC_SWAY_SPEED = 0.11
/** 地面字最小尺寸 */
const GROUND_CHAR_MIN = 0.32
/** 地面字最大尺寸 */
const GROUND_CHAR_MAX = 0.84
/** 干扰字最小间距（世界坐标） */
const GROUND_CHAR_MIN_GAP = 0.72
/** 中心诗文 renderOrder — 始终压在最上层 */
const POEM_RENDER_ORDER = 1200
/** 解体粒子每个顶点额外子粒子数 */
const DISSOLVE_SUB_PARTICLES = 2
/** 默认流光解体时长 (ms) */
const DEFAULT_DISSOLVE_MS = 4800

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

  /** 计算槽位世界坐标（竖排布局，各列垂直错开） */
  function slotWorldPosition(col: number, row: number, maxRows: number): THREE.Vector3 {
    const lineCount = layoutRef.value?.lines.length ?? 1
    const maxCol = lineCount - 1
    const cx = maxCol * COL_SP * 0.5
    const cy = (maxRows - 1) * ROW_SP * 0.5
    const colStagger =
      lineCount > 1 ? ((col / (lineCount - 1)) - 0.5) * COL_Y_STAGGER_AMP : 0
    return new THREE.Vector3(
      cx - col * COL_SP,
      cy - row * ROW_SP + 0.5 + colStagger,
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
        tagPoemRenderOrder(ph)
        poemGroup.add(ph)
        entry.placeholder = ph
      } else {
        const mesh = makeTextMesh(font, slot.char, createGlowMaterial())
        mesh.position.copy(pos)
        tagPoemRenderOrder(mesh)
        poemGroup.add(mesh)
        entry.mesh = mesh
      }

      floatingSlots.push(entry)
    }

    totalBlanks.value = layout.blankIndices.size
    filledCount.value = 0
  }

  /** 弧面朝向系数：0 = 弧缘，1 = 弧心（正对相机） */
  function arcFrontness(theta: number, vNorm = 0): number {
    const half = ARC_SPAN * 0.5
    const h = 1 - Math.abs(theta) / half
    const vert = 1 - Math.abs(vNorm) * 0.24
    return THREE.MathUtils.clamp(h * vert, 0, 1)
  }

  /** 弧面坐标 */
  function arcXYZ(radius: number, theta: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(radius * Math.sin(theta), y, radius * Math.cos(theta))
  }

  /** 放置于凸弧面：透视缩放 + 面向轴心 */
  function placeOnArcSurface(
    mesh: THREE.Mesh,
    radius: number,
    theta: number,
    y: number,
    vNorm: number,
    edgeScale: number,
  ): void {
    const front = arcFrontness(theta, vNorm)
    const scale = THREE.MathUtils.lerp(edgeScale, 1, front)

    mesh.position.copy(arcXYZ(radius, theta, y))
    mesh.rotation.set(
      (Math.random() - 0.5) * 0.045 * (1 - front),
      theta + Math.PI,
      (Math.random() - 0.5) * 0.035 * (1 - front),
    )
    mesh.scale.setScalar(scale)

    mesh.userData.arcTheta = theta
    mesh.userData.arcRadius = radius
    mesh.userData.baseY = y
    mesh.userData.baseScale = scale
    mesh.userData.frontness = front
    mesh.userData.vNorm = vNorm
  }

  /** 构建凸弧面背景字阵 — 前方扇形网格，中心放大、边缘透视 */
  function buildBackgroundBoard(font: Font, layout: PoemLayout): void {
    for (const bg of backgroundChars) {
      bg.mesh.geometry.dispose()
      ;(bg.mesh.material as THREE.Material).dispose()
    }
    backgroundChars.length = 0
    backgroundGroup.clear()
    backgroundGroup.rotation.y = 0

    const pool = buildBackgroundCharPool(layout)
    if (!pool.length) return

    let poolIdx = 0
    const axisY = ARC_AXIS_Y
    const halfArc = ARC_SPAN * 0.5

    for (let row = 0; row < ARC_BG_ROWS; row++) {
      const v = ARC_BG_ROWS > 1 ? (row / (ARC_BG_ROWS - 1)) * 2 - 1 : 0

      for (let col = 0; col < ARC_BG_COLS; col++) {
        const u = ARC_BG_COLS > 1 ? (col / (ARC_BG_COLS - 1)) * 2 - 1 : 0

        if (Math.abs(u) < ARC_CENTER_CLEAR_U && Math.abs(v) < ARC_CENTER_CLEAR_V) continue

        const theta = u * halfArc * 0.94 + (Math.random() - 0.5) * 0.07
        const y = axisY + v * ARC_HALF_HEIGHT * 1.02 + (Math.random() - 0.5) * 0.14
        const front = arcFrontness(theta, v)
        const shellR = ARC_BG_RADIUS + (1 - front) * 0.75

        const mat = createBackgroundMaterial()
        mat.transparent = true
        mat.opacity = 0.28 + front * 0.58
        mat.depthWrite = front > 0.42

        const mesh = makeTextMesh(font, pool[poolIdx % pool.length]!, mat, BG_CHAR_SIZE, CHAR_DEPTH * 0.6)
        poolIdx++
        placeOnArcSurface(mesh, shellR, theta, y, v, ARC_EDGE_SCALE_BG)
        mesh.renderOrder = Math.round(front * 90)
        backgroundGroup.add(mesh)
        backgroundChars.push({
          mesh,
          phase: Math.random() * Math.PI * 2,
          speed: 0.35 + Math.random() * 0.85,
        })
      }
    }
  }

  /** 单字材质流光闪烁（背景字 / 干扰字共用） */
  function applyCharSparkle(
    mat: THREE.MeshStandardMaterial,
    time: number,
    phase: number,
    speed: number,
  ): void {
    const t = time * speed + phase
    const flicker =
      Math.sin(t * 1.65) * Math.sin(t * 2.35 + 0.9) * Math.sin(t * 0.58 + 1.4)
    const sparkle = flicker > 0.72 ? (flicker - 0.72) / 0.28 : 0
    const eased = sparkle * sparkle * (3 - 2 * sparkle)

    mat.emissiveIntensity = 0.1 + eased * 0.82
    mat.emissive.setRGB(0.22 + eased * 0.55, 0.17 + eased * 0.42, 0.04 + eased * 0.06)
    mat.color.setRGB(0.58 + eased * 0.18, 0.52 + eased * 0.22, 0.42 + eased * 0.12)
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
      applyCharSparkle(bg.mesh.material as THREE.MeshStandardMaterial, time, bg.phase, bg.speed)
    }
  }

  /** 更新地面干扰字闪烁发光 */
  function updateGroundDistractorSparkle(time: number): void {
    for (const tile of groundTiles) {
      if (tile.isCorrect || tile.picked || !tile.mesh.visible) continue
      if (tile.phase === undefined || tile.speed === undefined) continue
      applyCharSparkle(tile.mesh.material as THREE.MeshStandardMaterial, time, tile.phase, tile.speed)
    }
  }

  /** 将地面字号归一化到 [0, 1] */
  function normalizeGroundCharSize(charSize: number): number {
    return THREE.MathUtils.clamp(
      (charSize - GROUND_CHAR_MIN) / (GROUND_CHAR_MAX - GROUND_CHAR_MIN),
      0,
      1,
    )
  }

  /** 按字号映射弧面半径 — 大字更靠内弧 */
  function sizeToArcRadius(charSize: number, isCorrect: boolean): number {
    if (isCorrect) return ARC_CORRECT_RADIUS
    const t = normalizeGroundCharSize(charSize)
    return THREE.MathUtils.lerp(ARC_GROUND_RADIUS_FAR, ARC_GROUND_RADIUS_NEAR, t)
  }

  /** 弧面分层：透视缩放、透明度、renderOrder */
  function applyGroundDepthLayering(): void {
    for (const tile of groundTiles) {
      const theta = tile.mesh.userData.arcTheta as number
      const radius = tile.mesh.userData.arcRadius as number
      const y = tile.mesh.userData.baseY as number
      const vNorm = (tile.mesh.userData.vNorm as number) ?? 0
      const charSize = tile.sizeRatio * CHAR_SIZE
      const front = arcFrontness(theta, vNorm)
      const sizeT = normalizeGroundCharSize(charSize)
      const scale =
        THREE.MathUtils.lerp(ARC_EDGE_SCALE_GROUND, 1, front) *
        (tile.isCorrect ? 1 : 0.88 + sizeT * 0.12)

      tile.mesh.position.copy(arcXYZ(radius, theta, y))
      tile.mesh.scale.setScalar(scale)
      tile.mesh.userData.baseScale = scale

      if (tile.isCorrect) {
        tile.mesh.renderOrder = 900 + Math.round(front * 80)
        continue
      }

      tile.mesh.renderOrder = 100 + Math.round(front * 400 + sizeT * 360)
      const mat = tile.mesh.material as THREE.MeshStandardMaterial
      mat.transparent = true
      mat.opacity = THREE.MathUtils.lerp(0.55, 1.0, front * 0.6 + sizeT * 0.4)
      mat.depthWrite = front > 0.35 && sizeT > 0.4
    }

    groundGroup.children.sort((a, b) => a.renderOrder - b.renderOrder)
  }

  /** 标记诗文 Mesh 始终在最上层 */
  function tagPoemRenderOrder(mesh: THREE.Mesh): void {
    mesh.renderOrder = POEM_RENDER_ORDER
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

  /** 在凸弧面上选取互不重叠的位置（仅前方扇形） */
  function pickArcSlot(
    charRadius: number,
    placed: PlacedGroundSlot[],
    charSize: number,
    isCorrect: boolean,
  ): { theta: number; y: number; radius: number; vNorm: number } | null {
    const radius = sizeToArcRadius(charSize, isCorrect)
    const sizeT = normalizeGroundCharSize(charSize)
    const axisY = ARC_AXIS_Y
    const halfArc = ARC_SPAN * 0.5

    for (let attempt = 0; attempt < 80; attempt++) {
      const spread = isCorrect ? 0.88 : 0.72 + sizeT * 0.22
      const theta = (Math.random() - 0.5) * ARC_SPAN * spread
      const vNorm = (Math.random() - 0.5) * 1.85
      const y = axisY + vNorm * ARC_HALF_HEIGHT + (Math.random() - 0.5) * 0.12

      if (Math.abs(theta) < ARC_CENTER_CLEAR_U * halfArc * 1.1 && Math.abs(vNorm) < ARC_CENTER_CLEAR_V * 1.2) {
        continue
      }

      const pos = arcXYZ(radius, theta, y)
      let ok = true
      for (const p of placed) {
        const other = arcXYZ(p.radius, p.theta, p.y)
        const dx = pos.x - other.x
        const dy = pos.y - other.y
        const dz = pos.z - other.z
        const minDist = charRadius + p.charRadius + GROUND_CHAR_MIN_GAP
        if (dx * dx + dy * dy + dz * dz < minDist * minDist) {
          ok = false
          break
        }
      }
      if (ok) return { theta, y, radius, vNorm }
    }
    return null
  }

  /** 构建凸弧面散落字块 */
  function buildGroundChars(font: Font, layout: PoemLayout): void {
    groundGroup.clear()
    groundGroup.rotation.y = 0
    groundTiles.length = 0

    const correctChars = layout.slots
      .filter((s) => s.isBlank)
      .map((s) => ({ char: s.char, idx: s.globalIndex }))

    const distractors = buildGroundDistractorPool(layout, 3)
    const pool: Array<{ char: string; isCorrect: boolean; blankIdx: number | null }> = []

    for (const c of correctChars) {
      pool.push({ char: c.char, isCorrect: true, blankIdx: c.idx })
    }
    for (const char of distractors) {
      pool.push({ char, isCorrect: false, blankIdx: null })
    }

    pool.sort(() => Math.random() - 0.5)

    const placed: PlacedGroundSlot[] = []

    for (const item of pool) {
      const charSize = randomGroundCharSize(item.isCorrect)
      const charRadius = charSize * 0.55
      const slot = pickArcSlot(charRadius, placed, charSize, item.isCorrect)
      if (!slot) continue

      placed.push({
        theta: slot.theta,
        y: slot.y,
        radius: slot.radius,
        charRadius,
      })
      const sizeRatio = charSize / CHAR_SIZE

      const material = item.isCorrect ? createGroundMaterial() : createBackgroundMaterial()
      const mesh = makeTextMesh(font, item.char, material, charSize)
      placeOnArcSurface(mesh, slot.radius, slot.theta, slot.y, slot.vNorm, ARC_EDGE_SCALE_GROUND)
      mesh.userData.groundChar = true
      mesh.userData.isDistractor = !item.isCorrect
      groundGroup.add(mesh)

      groundTiles.push({
        char: item.char,
        mesh,
        isCorrect: item.isCorrect,
        blankGlobalIndex: item.blankIdx,
        picked: false,
        sizeRatio,
        phase: item.isCorrect ? undefined : Math.random() * Math.PI * 2,
        speed: item.isCorrect ? undefined : 0.35 + Math.random() * 0.85,
      })
    }

    applyGroundDepthLayering()
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
        tagPoemRenderOrder(glowMesh)
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

    const emitParticle = (wx: number, wy: number, wz: number): void => {
      positions.push(wx, wy, wz)

      const dir = new THREE.Vector3(
        wx - poemGroup.position.x,
        wy - poemGroup.position.y,
        wz - poemGroup.position.z,
      )
      if (dir.lengthSq() < 0.01) dir.set(Math.random() - 0.5, 0.6 + Math.random() * 0.4, Math.random() - 0.5)
      dir.normalize()

      const burst = 0.028 + Math.random() * 0.045
      velocities.push({
        x: wx,
        y: wy,
        z: wz,
        vx: dir.x * burst * 0.55 + (Math.random() - 0.5) * 0.055,
        vy: Math.abs(dir.y) * burst * 0.35 + 0.028 + Math.random() * 0.038,
        vz: dir.z * burst * 0.55 + (Math.random() - 0.5) * 0.055,
      })
    }

    poemGroup.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      const geo = obj.geometry as THREE.BufferGeometry
      const posAttr = geo.getAttribute('position')
      if (!posAttr) return

      const worldMatrix = obj.matrixWorld
      const v = new THREE.Vector3()

      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i)
        v.applyMatrix4(worldMatrix)

        for (let sub = 0; sub < DISSOLVE_SUB_PARTICLES; sub++) {
          const jx = (Math.random() - 0.5) * 0.14
          const jy = (Math.random() - 0.5) * 0.14
          const jz = (Math.random() - 0.5) * 0.14
          emitParticle(v.x + jx, v.y + jy, v.z + jz)
        }
      }
      obj.visible = false
    })

    const buf = new THREE.BufferGeometry()
    buf.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

    const mat = new THREE.PointsMaterial({
      color: 0xffe890,
      size: 0.042,
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
      p.vx *= 0.994
      p.vy *= 0.994
      p.vz *= 0.994
      p.vy += 0.00028
      p.vx += (Math.random() - 0.5) * 0.0006
      p.x += p.vx * dt * 42
      p.y += p.vy * dt * 42
      p.z += p.vz * dt * 42
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
    }

    if (phase.value === 'playing' || phase.value === 'dissolving') {
      const sway = Math.sin(clock.elapsedTime * ARC_SWAY_SPEED) * ARC_SWAY_AMP
      backgroundGroup.rotation.y = sway
      groundGroup.rotation.y = sway * 0.35

      updateBackgroundSparkle(clock.elapsedTime)
      updateGroundDistractorSparkle(clock.elapsedTime)
      groundGroup.children.forEach((c, i) => {
        if (!c.visible) return
        const theta = c.userData.arcTheta as number | undefined
        const radius = c.userData.arcRadius as number | undefined
        const baseY = (c.userData.baseY as number | undefined) ?? c.position.y
        const baseScale = (c.userData.baseScale as number | undefined) ?? 1
        if (theta === undefined || radius === undefined) return

        const front = (c.userData.frontness as number | undefined) ?? 0.5
        const bobAmp = 0.008 + front * 0.02
        const y = baseY + Math.sin(clock.elapsedTime * 0.8 + i * 0.37) * bobAmp
        c.position.set(radius * Math.sin(theta), y, radius * Math.cos(theta))
        c.scale.setScalar(baseScale)
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
