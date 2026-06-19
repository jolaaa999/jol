/** 诗词文章数据 */
export interface PoemArticle {
  /** 文章唯一标识 */
  id: string
  /** 诗题 */
  title: string
  /** 正文（换行分隔诗句） */
  content: string
}

/** 单字槽位 — 竖排布局中的字符单元 */
export interface PoemCharSlot {
  /** 字符内容 */
  char: string
  /** 竖排列索引（右起为 0） */
  col: number
  /** 竖排行索引（上起为 0） */
  row: number
  /** 全局序号 */
  globalIndex: number
  /** 是否为挖空位 */
  isBlank: boolean
  /** 是否已填入正确答案 */
  filled: boolean
}

/** 诗词完整布局 — 含槽位与挖空索引 */
export interface PoemLayout {
  /** 诗题 */
  title: string
  /** 诗句行数组 */
  lines: string[]
  /** 全部字槽 */
  slots: PoemCharSlot[]
  /** 挖空位全局序号集合 */
  blankIndices: Set<number>
}

/** 地面散落字符数据 */
export interface GroundCharData {
  /** 字符内容 */
  char: string
  /** 是否为正确答案 */
  isCorrect: boolean
  /** 对应挖空位全局序号（干扰字为 null） */
  blankGlobalIndex: number | null
  /** 三维世界坐标 */
  position: { x: number; y: number; z: number }
}
