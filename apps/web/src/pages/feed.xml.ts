import type { APIRoute } from 'astro'
import { buildCompactSearchIndex } from '../lib/search-index'

export const prerender = true

const SITE_URL = 'https://legalize.crafter.ing'
const SITE_TITLE = 'Legalize PE - Legislacion Peruana'
const SITE_DESCRIPTION =
  'Ultimas normas legales peruanas publicadas en el Diario Oficial El Peruano'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export const GET: APIRoute = async () => {
  const laws = buildCompactSearchIndex()

  // Get the 50 most recent laws
  const recentLaws = laws
    .filter((l) => l.f) // Must have a date
    .sort((a, b) => b.f.localeCompare(a.f))
    .slice(0, 50)

  const items = recentLaws
    .map((law) => {
      const pubDate = new Date(law.f).toUTCString()
      const link = `${SITE_URL}/laws/${law.id}`

      return `
    <item>
      <title>${escapeXml(law.t)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(law.t)}. ${escapeXml(law.r)} publicada el ${law.f}.</description>
      <category>${escapeXml(law.r)}</category>
    </item>`
    })
    .join('')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>es-PE</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new Response(rss.trim(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  })
}
