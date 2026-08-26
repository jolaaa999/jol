/** GitHub 作品条目 */
export interface WorkProject {
  id: string
  name: string
  description: string
  language: string
  stars: number
  repoUrl: string
  demoUrl?: string
  updatedAt: string
}
