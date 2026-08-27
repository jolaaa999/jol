/** 博客文章条目 */
export interface BlogEntry {
  id: string
  title: string
  excerpt: string
  content: string
  date: string
  tags: string[]
  readingMinutes: number
}

/** 文章 API 单条响应 */
export interface ArticleApiItem {
  id: string
  title: string
  category: string
  content: string
  tags?: string[]
  created_at: string
}

/** 文章列表 API 响应 */
export interface ArticleListResponse {
  data: ArticleApiItem[]
  total: number
  category: string
}

/** 文章单条 API 响应 */
export interface ArticleDetailResponse {
  data: ArticleApiItem
}
