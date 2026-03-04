import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  title: 'Explore the Gallery',
  description: 'Browse curated photography across nature, portraits, travel, architecture, and more.',
  alternates: { canonical: `${siteUrl}/gallery` },
  openGraph: {
    url: `${siteUrl}/gallery`,
    title: 'Explore the Gallery | sigzagphoto',
    description: 'Browse curated photography across nature, portraits, travel, architecture, and more.',
    images: [
      { url: '/og-default.jpg', width: 1200, height: 630, alt: 'sigzagphoto gallery' },
    ],
  },
}

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return (
    <section>
      {/* Minimal CollectionPage JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'sigzagphoto Gallery',
          url: `${siteUrl}/gallery`,
          isPartOf: {
            '@type': 'WebSite',
            name: 'sigzagphoto',
            url: siteUrl,
          },
        }) }}
      />
      {children}
    </section>
  )
}
