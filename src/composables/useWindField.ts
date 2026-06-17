import type { Vec2 } from './usePhysicsEngine'
import { PerlinNoise2D } from '@/utils/perlinNoise'

export interface WindFieldConfig {
  baseStrength: number
  spatialScale: number
  temporalScale: number
  octaves: number
}

const DEFAULT_WIND: WindFieldConfig = {
  baseStrength: 1,
  spatialScale: 0.003,
  temporalScale: 0.35,
  octaves: 4,
}

/**
 * fBm Perlin 风场 — 连续、非线性流体扰动
 */
export function createWindField(config: Partial<WindFieldConfig> = {}) {
  const cfg = { ...DEFAULT_WIND, ...config }
  const noise = new PerlinNoise2D(1337)

  function sample(x: number, y: number, time: number): Vec2 {
    const wind = noise.sampleWindField(
      x,
      y,
      time * cfg.temporalScale,
      cfg.spatialScale,
      cfg.octaves,
    )
    return {
      x: wind.x * cfg.baseStrength,
      y: wind.y * cfg.baseStrength,
    }
  }

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

    const dx = pointer.x - x
    const dy = pointer.y - y
    const distSq = dx * dx + dy * dy
    const rSq = pointerRadius * pointerRadius
    if (distSq > rSq) return base

    const dist = Math.sqrt(distSq) || 1
    const falloff = (1 - dist / pointerRadius) ** 2
    const nx = dx / dist
    const ny = dy / dist

    return {
      x: base.x + nx * pointerStrength * falloff,
      y: base.y + ny * pointerStrength * falloff * 0.45,
    }
  }

  return { sample, sampleWithPointer, noise }
}

export function useWindField(config?: Partial<WindFieldConfig>) {
  return createWindField(config)
}
