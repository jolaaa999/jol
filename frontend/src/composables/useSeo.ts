import { useHead } from '@unhead/vue'
import { SITE } from '@/data/site'

export interface SeoOptions {
  title?: string
  description?: string
  path?: string
  type?: 'website' | 'article'
  image?: string
  publishedTime?: string
  tags?: string[]
}

export function useSeo(options: SeoOptions = {}): void {
  const title = options.title
    ? `${options.title} · ${SITE.name}`
    : SITE.title
  const description = options.description ?? SITE.description
  const url = options.path ? `${SITE.url}${options.path}` : SITE.url
  const image = options.image ?? `${SITE.url}/og-default.svg`
  const type = options.type ?? 'website'

  useHead({
    title,
    meta: [
      { name: 'description', content: description },
      { name: 'author', content: SITE.author.name },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:type', content: type },
      { property: 'og:image', content: image },
      { property: 'og:site_name', content: SITE.name },
      { property: 'og:locale', content: SITE.locale },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      ...(options.publishedTime
        ? [{ property: 'article:published_time', content: options.publishedTime }]
        : []),
      ...(options.tags?.map((t) => ({ property: 'article:tag', content: t })) ?? []),
    ],
    link: [{ rel: 'canonical', href: url }],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': type === 'article' ? 'BlogPosting' : 'WebSite',
          name: title,
          description,
          url,
          ...(type === 'article'
            ? {
                author: { '@type': 'Person', name: SITE.author.name },
                datePublished: options.publishedTime,
              }
            : {}),
        }),
      },
    ],
  })
}
