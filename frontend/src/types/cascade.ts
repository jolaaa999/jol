/**
 * 级联堆叠面板（Cascading Stacked Panels）数据结构。
 *
 * 交互模型：每进入一级内容，就在左侧基准处推出一个新的纵向面板；
 * 上一层右移并让出一条窄条，形成层层递进的路径感与前后景深。
 * 点击父层窄条即可回退一级。
 */

/** 面板中的一个可点条目 */
export interface CascadeItem {
  /** 稳定标识，用于 key 与无障碍属性 */
  id: string
  /** 显示文案 */
  label: string
  /** 次要说明（可选，如日期、语言、星标数） */
  meta?: string
  /**
   * 点击行为：
   * - `panel`：推出下一级面板（需提供 `children`）
   * - `link`：站内跳转（`href` 为路径或锚点）
   * - `external`：新窗口打开外链
   */
  kind: 'panel' | 'link' | 'external'
  /** 跳转目标（kind 为 link / external 时使用） */
  href?: string
  /** 下一级面板内容（kind 为 panel 时使用） */
  children?: CascadeItem[]
}

/** 一层面板 */
export interface CascadePanel {
  /** 稳定标识 */
  id: string
  /** 面板标题，显示在面板头部 */
  title: string
  /** 面板条目 */
  items: CascadeItem[]
}
