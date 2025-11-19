import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')

type ApiPhoto = {
  id: number
  updated_at?: string
  created_at?: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const items: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/gallery`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  try {
    // Fetch multiple pages using API pagination meta; cap to 50 pages (~10k urls @ 200/page)
    const perPage = 200
    let page = 1
    let lastPage = 1
    const maxPages = 50
    const seen = new Set<string>()
    do {
      const res = await fetch(`${apiBase}/api/photos?per_page=${perPage}&page=${page}`, { next: { revalidate: 3600 } })
      if (!res.ok) break
      const data = await res.json().catch(() => ({} as any))
      const list: ApiPhoto[] = Array.isArray(data?.data) ? data.data : []
      lastPage = Number(data?.meta?.last_page || page)
      if (!list.length) break
      for (const p of list) {
        const url = `${siteUrl}/photo/${p.id}`
        if (seen.has(url)) continue
        seen.add(url)
        const last = p.updated_at || p.created_at || now.toISOString()
        items.push({
          url,
          lastModified: new Date(last),
          changeFrequency: 'weekly',
          priority: 0.8,
        })
      }
      page += 1
    } while (page <= lastPage && page <= maxPages)
  } catch {
    // ignore failures; base entries still returned
  }

  return items
}
