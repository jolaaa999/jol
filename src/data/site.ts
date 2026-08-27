/** 站点全局配置 — 单一数据源 */
export const SITE = {
  name: 'JOL',
  title: 'JOL — Developer & Creator',
  description:
    'Developer & creator building digital experiences with technical precision and fluid aesthetics. Blog, works, and reflections.',
  url: 'https://jol.vercel.app',
  locale: 'zh-CN',
  author: {
    name: 'JOL',
    email: '2843422418@qq.com',
    phone: '13035103738',
    github: 'jolaaa999',
    githubUrl: 'https://github.com/jolaaa999',
    bio: 'Developer & creator. Building digital experiences that merge technical precision with fluid aesthetics.',
    avatar: '/avatar.svg',
  },
  resumeUrl: '/resume.pdf',
  social: {
    github: 'https://github.com/jolaaa999',
    email: 'mailto:2843422418@qq.com',
  },
  giscus: {
    repo: 'jolaaa999/jol',
    repoId: '',
    category: 'Announcements',
    categoryId: '',
    mapping: 'pathname',
    theme: 'dark_dimmed',
  },
  umami: {
    websiteId: import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined,
    src: import.meta.env.VITE_UMAMI_SRC as string | undefined,
  },
  newsletter: {
    enabled: true,
    endpoint: '/api/newsletter',
  },
} as const

/** 技能标签 */
export const SKILLS = [
  { name: 'Vue / TypeScript', level: 92 },
  { name: 'React / Next.js', level: 78 },
  { name: 'Go / Serverless', level: 75 },
  { name: 'GSAP / Canvas', level: 88 },
  { name: 'Three.js / WebGL', level: 70 },
  { name: 'Tailwind CSS', level: 90 },
] as const

/** 工作经历 */
export const EXPERIENCE = [
  {
    id: 'exp-1',
    period: '2024 — Present',
    role: 'Full-Stack Developer',
    org: 'Independent / Open Source',
    description: 'Personal portfolio, blog platform, and interactive web experiences with Vue 3 + Go serverless.',
  },
  {
    id: 'exp-2',
    period: '2022 — 2024',
    role: 'Frontend Developer',
    org: 'Various Projects',
    description: 'Component systems, animation pipelines, and performance-focused SPAs.',
  },
] as const

/** 关于页扩展文案 */
export const ABOUT_COPY = {
  headline: '在光与噪声之间，构建有温度的界面。',
  lead: '我关注动效物理、视觉层次与工程整洁度。相信好的界面像好的诗——每个元素都有存在的理由。',
  values: [
    { id: 'v1', label: 'Precision', text: '数值积分驱动的动效，拒绝廉价线性插值。' },
    { id: 'v2', label: 'Restraint', text: '克制配色与高对比排版，留白即内容。' },
    { id: 'v3', label: 'Craft', text: '高内聚低耦合，Composable 优先的架构。' },
  ],
} as const
