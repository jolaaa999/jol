import { onMounted, onUnmounted, ref, shallowRef, type Ref } from 'vue'
import { PhysicsEngine } from './usePhysicsEngine'
import { useWindField } from './useWindField'

/** Canvas 蒲公英粒子场景 — Verlet 积分 + 风场反馈 */
export function useDandelionScene(canvasRef: Ref<HTMLCanvasElement | null>) {
  const engine = shallowRef<PhysicsEngine | null>(null)
  const windField = useWindField()
  const pointer = ref<{ x: number; y: number } | null>(null)
  let rafId = 0
  let lastTime = 0

  const SEED_COUNT = 48
  const HEAD_ID = 0

  function initScene(width: number, height: number): void {
    const eng = new PhysicsEngine({
      gravity: { x: 0, y: 0.04 },
      globalDamping: 0.996,
      substeps: 4,
    })

    const cx = width * 0.72
    const cy = height * 0.42

    eng.addParticle({
      x: cx,
      y: cy,
      prevX: cx,
      prevY: cy,
      mass: 10,
      pinned: true,
      radius: 6,
      drag: 0,
    })

    for (let i = 0; i < SEED_COUNT; i++) {
      const angle = (i / SEED_COUNT) * Math.PI * 2
      const len = 28 + Math.random() * 18
      const sx = cx + Math.cos(angle) * len
      const sy = cy + Math.sin(angle) * len
      const seedId = eng.addParticle({
        x: sx,
        y: sy,
        prevX: sx,
        prevY: sy,
        mass: 0.4 + Math.random() * 0.3,
        pinned: false,
        radius: 1.5,
        drag: 1.2 + Math.random() * 0.8,
      })

      eng.addSpring({
        a: HEAD_ID,
        b: seedId,
        restLength: len,
        stiffness: 0.08 + Math.random() * 0.04,
        damping: 0.02,
      })
    }

    engine.value = eng
  }

  function render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
  ): void {
    const eng = engine.value
    if (!eng) return

    ctx.clearRect(0, 0, width, height)

    eng.step(1, (p) => {
      if (p.pinned) return { x: 0, y: 0 }
      return windField.sampleWithPointer(p.x, p.y, time * 0.001, pointer.value)
    })
    eng.constrainToBounds(width, height, 20)

    const head = eng.particles[HEAD_ID]

    ctx.strokeStyle = 'rgba(232, 232, 234, 0.12)'
    ctx.lineWidth = 0.5

    for (const spring of eng.springs) {
      const a = eng.particles[spring.a]
      const b = eng.particles[spring.b]
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    for (let i = 1; i < eng.particles.length; i++) {
      const p = eng.particles[i]
      const vx = p.x - p.prevX
      const vy = p.y - p.prevY
      const speed = Math.sqrt(vx * vx + vy * vy)
      const alpha = 0.35 + Math.min(speed * 0.15, 0.5)

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0, 212, 170, ${alpha})`
      ctx.fill()

      const fluffLen = 6 + speed * 2
      ctx.strokeStyle = `rgba(255, 107, 44, ${alpha * 0.6})`
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - vx * fluffLen, p.y - vy * fluffLen)
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(head.x, head.y, head.radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fill()

    ctx.beginPath()
    ctx.arc(head.x, head.y, head.radius + 4, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 107, 44, 0.35)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  function loop(timestamp: number): void {
    const canvas = canvasRef.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!lastTime) lastTime = timestamp
    lastTime = timestamp

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initScene(w, h)
    }

    render(ctx, w, h, timestamp)
    rafId = requestAnimationFrame(loop)
  }

  function onPointerMove(e: PointerEvent): void {
    const canvas = canvasRef.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    pointer.value = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function onPointerLeave(): void {
    pointer.value = null
  }

  onMounted(() => {
    rafId = requestAnimationFrame(loop)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerleave', onPointerLeave)
  })

  onUnmounted(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerleave', onPointerLeave)
  })
}
