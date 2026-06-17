import type { Vec2 } from './usePhysicsEngine'

export interface WindFieldConfig {
  /** 基础风速 */
  baseStrength: number
  /** 空间频率 */
  spatialScale: number
  /** 时间频率 */
  temporalScale: number
  /** 湍流层数 */
  octaves: number
}

const DEFAULT_WIND: WindFieldConfig = {
  baseStrength: 0.8,
  spatialScale: 0.003,
  temporalScale: 0.6,
  octaves: 3,
}

/**
 * 分层正弦叠加风场 — 模拟非均匀流体扰动
 * 返回某点处的瞬时风力向量 (force scale)
 */
export function createWindField(config: Partial<WindFieldConfig> = {}) {
  const cfg = { ...DEFAULT_WIND, ...config }

  function sample(x: number, y: number, time: number): Vec2 {
    let fx = 0
    let fy = 0
    let amp = cfg.baseStrength
    let freq = 1

    for (let i = 0; i < cfg.octaves; i++) {
      const phase = time * cfg.temporalScale * freq
      fx +=
        Math.sin(y * cfg.spatialScale * freq + phase) * amp +
        Math.cos(x * cfg.spatialScale * 0.7 * freq + phase * 0.8) * amp * 0.6
      fy +=
        Math.cos(x * cfg.spatialScale * freq + phase * 1.1) * amp * 0.35 +
        Math.sin(y * cfg.spatialScale * 0.5 * freq + phase * 0.9) * amp * 0.25
      amp *= 0.55
      freq *= 2.1
    }

    return { x: fx, y: fy }
  }

  /** 鼠标/指针扰动 — 局部涡流 */
  function sampleWithPointer(
    x: number,
    y: number,
    time: number,
    pointer: Vec2 | null,
    pointerRadius = 120,
    pointerStrength = 2.5,
  ): Vec2 {
    const base = sample(x, y, time)
    if (!pointer) return base

    const dx = x - pointer.x
    const dy = y - pointer.y
    const distSq = dx * dx + dy * dy
    const rSq = pointerRadius * pointerRadius
    if (distSq > rSq) return base

    const dist = Math.sqrt(distSq) || 1
    const falloff = 1 - dist / pointerRadius
    const swirl = pointerStrength * falloff * falloff

    return {
      x: base.x + (-dy / dist) * swirl,
      y: base.y + (dx / dist) * swirl * 0.5,
    }
  }

  return { sample, sampleWithPointer }
}

export function useWindField(config?: Partial<WindFieldConfig>) {
  return createWindField(config)
}
