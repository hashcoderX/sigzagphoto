import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

type Photo = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  file_type?: string | null;
  photographer?: string | null;
  is_free?: boolean;
  price?: number | null;
  downloads?: number;
  likes?: number;
  url: string; // public/watermarked URL
  created_at?: string;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_URL = (() => {
  const trimmed = RAW_API_URL.replace(/\/$/, "");
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
})();
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";

async function fetchPhoto(id: string): Promise<Photo | null> {
  try {
    const res = await fetch(`${API_URL}/photos/${id}`, {
      // Photo pages change infrequently; allow brief caching on the server
      next: { revalidate: 3600 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = (await res.json()) as Photo;
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const photo = await fetchPhoto(id);
  if (!photo) return { title: "Photo not found" };

  const title = `${photo.title} | sigzagphoto`;
  const description = photo.description || "Explore premium stock photography on sigzagphoto.";
  const canonical = `${SITE_URL}/photo/${photo.id}`;
  const images = [photo.url];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

function jsonLdScript(obj: Record<string, any>) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
    />
  );
}

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = await fetchPhoto(id);
  if (!photo) notFound();

  const canonical = `${SITE_URL}/photo/${photo.id}`;

  // BreadcrumbList
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Gallery",
        item: `${SITE_URL}/gallery`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: photo.title,
        item: canonical,
      },
    ],
  };

  // Product (if priced) and Photograph
  const productLd = photo.is_free
    ? null
    : {
        "@context": "https://schema.org",
        "@type": "Product",
        name: photo.title,
        description: photo.description || undefined,
        image: [photo.url],
        brand: {
          "@type": "Brand",
          name: "sigzagphoto",
        },
        category: photo.category || undefined,
        offers: {
          "@type": "Offer",
          price: typeof photo.price === "number" ? photo.price.toFixed(2) : undefined,
          priceCurrency: CURRENCY,
          availability: "https://schema.org/InStock",
          url: canonical,
        },
      };

  const photoLd = {
    "@context": "https://schema.org",
    "@type": "Photograph",
    name: photo.title,
    description: photo.description || undefined,
    datePublished: photo.created_at || undefined,
    image: [photo.url],
    author: photo.photographer
      ? {
          "@type": "Person",
          name: photo.photographer,
        }
      : undefined,
    genre: photo.category || undefined,
    url: canonical,
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* JSON-LD */}
      {jsonLdScript(breadcrumbLd)}
      {productLd ? jsonLdScript(productLd) : null}
      {jsonLdScript(photoLd)}

      <article className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
          {/* Image */}
          <div className="overflow-hidden rounded-lg border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={photo.title}
              className="h-auto w-full object-cover"
              loading="eager"
            />
          </div>
        </div>
        <div className="md:col-span-2 flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">{photo.title}</h1>
          {photo.description ? (
            <p className="text-gray-700">{photo.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {photo.category ? (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1">{photo.category}</span>
            ) : null}
            {typeof photo.price === "number" && !photo.is_free ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                {new Intl.NumberFormat('en-US', { style: "currency", currency: CURRENCY }).format(
                  photo.price || 0
                )}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-blue-700">Free</span>
            )}
            {typeof photo.likes === "number" ? (
              <span className="inline-flex items-center rounded-full bg-gray-50 px-3 py-1">{photo.likes} likes</span>
            ) : null}
            {typeof photo.downloads === "number" ? (
              <span className="inline-flex items-center rounded-full bg-gray-50 px-3 py-1">{photo.downloads} downloads</span>
            ) : null}
          </div>

          {photo.is_free ? (
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
            >
              Download
            </a>
          ) : (
            <Link
              href={`/checkout?photo=${photo.id}`}
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            >
              Purchase
            </Link>
          )}
        </div>
      </article>

      <div className="mt-8 text-center text-xs text-gray-500">
        <a href={canonical} className="underline" aria-label="Canonical URL">
          {canonical}
        </a>
      </div>
    </main>
  );
}
