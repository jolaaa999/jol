import type { Vec2 } from './usePhysicsEngine'
import { PerlinNoise2D } from '@/utils/perlinNoise'

/** 风场配置参数 */
export interface WindFieldConfig {
  /** 基础风力强度倍率 */
  baseStrength: number
  /** 空间采样缩放（值越小风场越平缓） */
  spatialScale: number
  /** 时间演化缩放（值越大风场变化越快） */
  temporalScale: number
  /** fBm 叠加层数 */
  octaves: number
}

/** 默认风场参数 */
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
  /** 合并后的风场运行参数 */
  const cfg = { ...DEFAULT_WIND, ...config }
  /** Perlin 噪音实例（固定种子保证风场可复现） */
  const noise = new PerlinNoise2D(1337)

  /** 在坐标处采样风场向量 */
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

  /** 采样风场并叠加指针扰动 */
  function sampleWithPointer(
    x: number,
    y: number,
    time: number,
    pointer: Vec2 | null,
    /** 指针影响半径（像素） */
    pointerRadius = 120,
    /** 指针扰动强度 */
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

/** 风场 Composable — 封装 createWindField */
export function useWindField(config?: Partial<WindFieldConfig>) {
  return createWindField(config)
}
