import { onMounted, ref } from 'vue'
import type { WorkProject } from '@/types/work'

const GITHUB_USER = 'jolaaa999'
const EXCLUDED = new Set(['jolaaa999', 'VSCode', 'lunwen', 'flower', 'FK-valorant'])

/** 离线占位：GitHub API 不可用时展示 */
const FALLBACK_WORKS: WorkProject[] = [
  {
    id: 'tanktrouble',
    name: 'TankTrouble',
    description: '坦克动荡联机复刻 — 远程对战，与朋友在同一片战场上碰撞。',
    language: 'TypeScript',
    stars: 0,
    repoUrl: 'https://github.com/jolaaa999/TankTrouble',
    demoUrl: 'https://tank-trouble-ten.vercel.app',
    updatedAt: '2026-01-01',
  },
  {
    id: 'agent',
    name: 'AGENT',
    description: '基于 AI 的图谱提取与导航工具，生成专业图谱并规划个性化学习路径。',
    language: 'JavaScript',
    stars: 0,
    repoUrl: 'https://github.com/jolaaa999/AGENT',
    updatedAt: '2026-01-01',
  },
  {
    id: 'delicious',
    name: 'Delicious',
    description: '人间烟火 — 记录菜品、材料与烹饪过程，支持版本对比与菜谱百科检索。',
    language: 'Go',
    stars: 0,
    repoUrl: 'https://github.com/jolaaa999/Delicious',
    demoUrl: 'https://delicious-bay.vercel.app',
    updatedAt: '2026-01-01',
  },
  {
    id: 'tfmy',
    name: '塔菲喵译',
    description: '塔菲喵语加解密工具 — 将日常语句编码为独特的「喵」语表达。',
    language: 'Vue',
    stars: 1,
    repoUrl: 'https://github.com/jolaaa999/tfmy',
    demoUrl: 'https://tfmy.vercel.app',
    updatedAt: '2026-01-01',
  },
  {
    id: 'savepic',
    name: 'SavePic',
    description: '个人表情包与梗图收藏库 — 把散落在手机里的图像归档到云端。',
    language: 'Vue',
    stars: 0,
    repoUrl: 'https://github.com/jolaaa999/SavePic',
    demoUrl: 'https://save-pic.vercel.app',
    updatedAt: '2026-01-01',
  },
  {
    id: 'dianzibianzhong',
    name: '虚拟电子编钟',
    description: '用代码复刻编钟的音律结构，探索传统器乐的数字形态。',
    language: 'C',
    stars: 0,
    repoUrl: 'https://github.com/jolaaa999/dianzibianzhong',
    updatedAt: '2026-01-01',
  },
]

interface GithubRepo {
  id: number
  name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  stargazers_count: number
  fork: boolean
  archived: boolean
  updated_at: string
}

function toWork(repo: GithubRepo): WorkProject {
  return {
    id: repo.name.toLowerCase(),
    name: repo.name === 'tfmy' ? '塔菲喵译' : repo.name,
    description: repo.description?.trim() || '暂无描述',
    language: repo.language ?? '—',
    stars: repo.stargazers_count,
    repoUrl: repo.html_url,
    demoUrl: repo.homepage?.trim() || undefined,
    updatedAt: repo.updated_at.slice(0, 10),
  }
}

/** 拉取 GitHub 公开仓库并整理为作品列表 */
export function useGithubWorks() {
  const works = ref<WorkProject[]>([])
  const status = ref<'loading' | 'synced' | 'local'>('loading')

  onMounted(async () => {
    try {
      const res = await fetch(
        `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`,
      )
      if (!res.ok) throw new Error('offline')

      const repos = (await res.json()) as GithubRepo[]
      const filtered = repos
        .filter((repo) => !repo.fork && !repo.archived && !EXCLUDED.has(repo.name))
        .map(toWork)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

      works.value = filtered.length ? filtered : FALLBACK_WORKS
      status.value = filtered.length ? 'synced' : 'local'
    } catch {
      works.value = FALLBACK_WORKS
      status.value = 'local'
    }
  })

  return { works, status }
}
