export interface PoemArticle {
  id: string
  title: string
  content: string
}

export interface PoemCharSlot {
  char: string
  col: number
  row: number
  globalIndex: number
  isBlank: boolean
  filled: boolean
}

export interface PoemLayout {
  title: string
  lines: string[]
  slots: PoemCharSlot[]
  blankIndices: Set<number>
}

export interface GroundCharData {
  char: string
  isCorrect: boolean
  blankGlobalIndex: number | null
  position: { x: number; y: number; z: number }
}
