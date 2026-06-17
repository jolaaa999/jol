export interface Vec2 {
  x: number
  y: number
}

export interface Particle {
  id: number
  x: number
  y: number
  prevX: number
  prevY: number
  mass: number
  pinned: boolean
  radius: number
  drag: number
}

export interface Spring {
  a: number
  b: number
  restLength: number
  stiffness: number
  damping: number
}

export interface PhysicsConfig {
  gravity: Vec2
  globalDamping: number
  substeps: number
}

const DEFAULT_CONFIG: PhysicsConfig = {
  gravity: { x: 0, y: 0.12 },
  globalDamping: 0.998,
  substeps: 3,
}

/**
 * Verlet 积分物理引擎 — 弹簧-振子 + 外力场
 * 单一职责：数值模拟，不含渲染逻辑
 */
export class PhysicsEngine {
  particles: Particle[] = []
  springs: Spring[] = []
  private config: PhysicsConfig

  constructor(config: Partial<PhysicsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  addParticle(p: Omit<Particle, 'id'>): number {
    const id = this.particles.length
    this.particles.push({ ...p, id })
    return id
  }

  addSpring(s: Omit<Spring, 'a' | 'b'> & { a: number; b: number }): void {
    this.springs.push(s)
  }

  applyForce(id: number, force: Vec2): void {
    const p = this.particles[id]
    if (!p || p.pinned) return
    const invMass = 1 / p.mass
    p.x += force.x * invMass
    p.y += force.y * invMass
  }

  /** 半隐式欧拉辅助：对 Verlet 位置修正施加外力 */
  applyExternalForces(getForce: (p: Particle, index: number) => Vec2): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      if (p.pinned) continue
      const f = getForce(p, i)
      const invMass = 1 / p.mass
      p.x += f.x * invMass
      p.y += f.y * invMass
    }
  }

  step(dt: number, externalForces?: (p: Particle, index: number) => Vec2): void {
    const subDt = dt / this.config.substeps
    for (let s = 0; s < this.config.substeps; s++) {
      this.integrateVerlet(subDt)
      this.solveSprings(subDt)
      if (externalForces) {
        this.applyExternalForces(externalForces)
      }
    }
  }

  /** Verlet 积分：x' = 2x - x_prev + a·dt² */
  private integrateVerlet(dt: number): void {
    const { gravity, globalDamping } = this.config
    const dtSq = dt * dt

    for (const p of this.particles) {
      if (p.pinned) continue

      const vx = (p.x - p.prevX) * globalDamping * (1 - p.drag * 0.01)
      const vy = (p.y - p.prevY) * globalDamping * (1 - p.drag * 0.01)

      p.prevX = p.x
      p.prevY = p.y

      p.x += vx + gravity.x * dtSq
      p.y += vy + gravity.y * dtSq
    }
  }

  /** 弹簧约束迭代 — Hooke 定律 + 速度阻尼 */
  private solveSprings(dt: number): void {
    for (const spring of this.springs) {
      const a = this.particles[spring.a]
      const b = this.particles[spring.b]
      if (!a || !b) continue

      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
      const diff = (dist - spring.restLength) / dist

      const totalMass = a.mass + b.mass
      const aRatio = b.pinned ? 1 : a.mass / totalMass
      const bRatio = a.pinned ? 1 : b.mass / totalMass

      const fx = dx * diff * spring.stiffness
      const fy = dy * diff * spring.stiffness

      if (!a.pinned) {
        a.x += fx * aRatio
        a.y += fy * aRatio
        const dvx = (a.x - a.prevX) * spring.damping * dt
        const dvy = (a.y - a.prevY) * spring.damping * dt
        a.prevX += dvx
        a.prevY += dvy
      }
      if (!b.pinned) {
        b.x -= fx * bRatio
        b.y -= fy * bRatio
        const dvx = (b.x - b.prevX) * spring.damping * dt
        const dvy = (b.y - b.prevY) * spring.damping * dt
        b.prevX += dvx
        b.prevY += dvy
      }
    }
  }

  constrainToBounds(
    width: number,
    height: number,
    padding = 0,
  ): void {
    for (const p of this.particles) {
      if (p.pinned) continue
      const r = p.radius
      if (p.x < padding + r) {
        p.x = padding + r
        p.prevX = p.x
      }
      if (p.x > width - padding - r) {
        p.x = width - padding - r
        p.prevX = p.x
      }
      if (p.y < padding + r) {
        p.y = padding + r
        p.prevY = p.y
      }
      if (p.y > height - padding - r) {
        p.y = height - padding - r
        p.prevY = p.y
      }
    }
  }
}

export function usePhysicsEngine(config?: Partial<PhysicsConfig>) {
  const engine = new PhysicsEngine(config)
  return { engine }
}
