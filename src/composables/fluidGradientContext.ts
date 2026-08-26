import type { InjectionKey } from 'vue'

/** 流体背景切换配色 — provide/inject */
export const FLUID_CYCLE_KEY: InjectionKey<() => void> = Symbol('fluidCycle')
