import { ref, onUnmounted, type Ref } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { Font } from 'three/examples/jsm/loaders/FontLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { PoemLayout } from '@/types/poem'
import { collectDistractorChars } from '@/utils/poemLayout'
import { fontHasChar } from '@/utils/chineseFontLoader'

export type PoemScenePhase = 'loading' | 'playing' | 'dissolving' | 'complete'

export interface UsePoemSceneOptions {
  onComplete?: () => void
  dissolveDuration?: number
}

interface FloatingSlot {
  slotIndex: number
  mesh: THREE.Mesh | null
  placeholder: THREE.Mesh | null
  targetPos: THREE.Vector3
  char: string
}

interface GroundTile {
  char: string
  mesh: THREE.Mesh
  isCorrect: boolean
  blankGlobalIndex: number | null
  picked: boolean
}

interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

const COL_SP = 1.75
const ROW_SP = 1.55
const CHAR_SIZE = 0.52
const CHAR_DEPTH = 0.12
const GROUND_Y = -2.8
const SCATTER_R = 9

export function usePoemScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  layoutRef: Ref<PoemLayout | null>,
  fontRef: Ref<Font | null>,
  options: UsePoemSceneOptions = {},
) {
  const { onComplete, dissolveDuration = 2000 } = options

  const phase = ref<PoemScenePhase>('loading')
  const filledCount = ref(0)
  const totalBlanks = ref(0)

  let renderer: THREE.WebGLRenderer | null = null
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let composer: EffectComposer | null = null
  let raycaster = new THREE.Raycaster()
  let pointer = new THREE.Vector2()
  let rafId = 0
  let clock = new THREE.Clock()

  const poemGroup = new THREE.Group()
  const groundGroup = new THREE.Group()
  const floatingSlots: FloatingSlot[] = []
  const groundTiles: GroundTile[] = []
  let particles: Particle[] | null = null
  let pointsMesh: THREE.Points | null = null
  let dissolveStart = 0
  let width = 0
  let height = 0

  // ── 材质工厂 ──

  function createGlowMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xffe566,
      emissive: 0xffc832,
      emissiveIntensity: 1.2,
      metalness: 0.35,
      roughness: 0.25,
    })
  }

  function createGroundMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xc4a060,
      emissive: 0x6a5020,
      emissiveIntensity: 0.55,
      metalness: 0.65,
      roughness: 0.32,
    })
  }

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

  function makeBlankPlaceholder(pos: THREE.Vector3): THREE.Mesh {
    const geo = new THREE.BoxGeometry(CHAR_SIZE * 0.85, CHAR_SIZE * 1.05, CHAR_DEPTH * 0.6)
    const mat = createPlaceholderMaterial()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(pos)
    mesh.userData.isPlaceholder = true
    return mesh
  }

  function makeTextMesh(
    font: Font,
    char: string,
    material: THREE.Material,
  ): THREE.Mesh {
    if (!fontHasChar(font, char)) {
      throw new Error(`Font missing glyph: ${char}`)
    }
    const geo = new TextGeometry(char, {
      font,
      size: CHAR_SIZE,
      depth: CHAR_DEPTH,
      curveSegments: 8,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.01,
      bevelSegments: 2,
    })
    geo.computeBoundingBox()
    geo.center()
    const mesh = new THREE.Mesh(geo, material)
    return mesh
  }

  // ── 布局坐标 ──

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

  function buildGroundChars(font: Font, layout: PoemLayout): void {
    groundGroup.clear()
    groundTiles.length = 0

    const distractors = collectDistractorChars(layout)
    const correctChars = layout.slots
      .filter((s) => s.isBlank)
      .map((s) => ({ char: s.char, idx: s.globalIndex }))

    const pool: Array<{ char: string; isCorrect: boolean; blankIdx: number | null }> = []

    for (const c of correctChars) {
      pool.push({ char: c.char, isCorrect: true, blankIdx: c.idx })
    }

    const extraCount = Math.max(correctChars.length * 2, 6)
    for (let i = 0; i < extraCount; i++) {
      const char = distractors[Math.floor(Math.random() * distractors.length)]
      const dup = pool.some((p) => p.char === char && p.isCorrect)
      if (dup && Math.random() > 0.3) continue
      pool.push({ char, isCorrect: false, blankIdx: null })
    }

    pool.sort(() => Math.random() - 0.5)

    for (const item of pool) {
      const angle = Math.random() * Math.PI * 2
      const r = 3 + Math.random() * SCATTER_R
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      const y = GROUND_Y + (Math.random() - 0.5) * 0.15

      const mesh = makeTextMesh(font, item.char, createGroundMaterial())
      mesh.position.set(x, y, z)
      mesh.rotation.set(
        -Math.PI * 0.5 + (Math.random() - 0.5) * 0.08,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.06,
      )
      mesh.userData.groundChar = true
      groundGroup.add(mesh)

      groundTiles.push({
        char: item.char,
        mesh,
        isCorrect: item.isCorrect,
        blankGlobalIndex: item.blankIdx,
        picked: false,
      })
    }
  }

  // ── 初始化 / 销毁 ──

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
    renderer.toneMappingExposure = 1.1

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050508)
    scene.fog = new THREE.FogExp2(0x050508, 0.045)

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200)
    camera.position.set(0, 5.5, 11)
    camera.lookAt(0, -0.5, 0)

    scene.add(new THREE.AmbientLight(0x2a2840, 0.85))
    const key = new THREE.DirectionalLight(0xffe8b0, 1.6)
    key.position.set(4, 10, 6)
    scene.add(key)
    const rim = new THREE.PointLight(0xff9020, 1.1, 40)
    rim.position.set(-6, 4, -4)
    scene.add(rim)
    const groundLight = new THREE.PointLight(0xffcc66, 0.9, 30)
    groundLight.position.set(0, 1, 4)
    scene.add(groundLight)

    scene.add(poemGroup)
    scene.add(groundGroup)

    const renderPass = new RenderPass(scene, camera)
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.35,
      0.55,
      0.12,
    )
    composer = new EffectComposer(renderer)
    composer.addPass(renderPass)
    composer.addPass(bloom)

    poemGroup.position.set(0, 0.8, 0)
  }

  function rebuildScene(): void {
    const font = fontRef.value
    const layout = layoutRef.value
    if (!font || !layout || !scene) return
    buildFloatingPoem(font, layout)
    buildGroundChars(font, layout)
    phase.value = 'playing'
  }

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
    poemGroup.clear()
    groundGroup.clear()
  }

  // ── 交互 ──

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

  function flyCharToSlot(tile: GroundTile, slot: FloatingSlot): void {
    const font = fontRef.value
    if (!font) return

    const startPos = tile.mesh.position.clone()
    const startRot = tile.mesh.rotation.clone()

    tile.mesh.visible = false

    const flying = makeTextMesh(font, tile.char, createGroundMaterial())
    flying.position.copy(startPos)
    flying.rotation.copy(startRot)
    scene!.add(flying)

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
        gsap.fromTo(emissive, { intensity: 2.5 }, {
          intensity: 1.2,
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

  function onResize(): void {
    const canvas = canvasRef.value
    if (!canvas || !camera || !renderer || !composer) return
    width = canvas.clientWidth
    height = canvas.clientHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    composer.setSize(width, height)
  }

  function animate(): void {
    rafId = requestAnimationFrame(animate)
    if (!renderer || !scene || !camera || !composer) return

    const dt = clock.getDelta()

    if (phase.value === 'playing') {
      poemGroup.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.04
      groundGroup.children.forEach((c, i) => {
        c.position.y = GROUND_Y + Math.sin(clock.elapsedTime * 0.8 + i) * 0.03
      })
    }

    if (phase.value === 'dissolving') {
      updateDissolve(dt)
    }

    composer.render()
  }

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
