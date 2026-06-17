import type { Vec2 } from '@/composables/usePhysicsEngine'

/** 2D Perlin 噪音 — 返回值约 [-1, 1] */
export class PerlinNoise2D {
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

  /** 分形布朗运动 — 多 octave 叠加 */
  fbm(x: number, y: number, octaves = 5, lacunarity = 2, gain = 0.5): number {
    let value = 0
    let amplitude = 0.5
    let frequency = 1
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise(x * frequency, y * frequency)
      frequency *= lacunarity
      amplitude *= gain
    }
    return value
  }

  /** 连续非线性风场 — 基于 fBm 的旋度场近似 */
  sampleWindField(
    x: number,
    y: number,
    time: number,
    scale = 0.003,
    octaves = 4,
  ): Vec2 {
    const nx = x * scale
    const ny = y * scale
    const t = time * 0.00035

    const n1 = this.fbm(nx + t, ny + t * 0.7, octaves)
    const n2 = this.fbm(nx + 100 + t * 0.5, ny + 200, octaves)

    const angle = n1 * Math.PI * 1.6 + n2 * 0.4
    const mag = 0.35 + (this.fbm(nx + 50, ny + 50, 3) + 1) * 0.325

    return {
      x: Math.cos(angle) * mag,
      y: Math.sin(angle) * mag * 0.55,
    }
  }
}

export const sharedPerlin = new PerlinNoise2D(2026)
