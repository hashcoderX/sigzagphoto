"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PhotoCard from '@/components/PhotoCard';
import PortraitModal, { PortraitPhoto } from '@/components/PortraitModal';
import { motion } from 'framer-motion';
import { Filter, Sparkles, Search, Camera, Users, Download, Heart } from 'lucide-react';

type ApiPhoto = {
  id: number;
  title: string;
  description?: string;
  category?: string;
  file_type?: string;
  photographer: string;
  is_free: boolean;
  price?: number;
  downloads?: number;
  likes?: number;
  url: string;
};

// Simple deterministic title generator for preview photos
const PREVIEW_ADJECTIVES = [
  'Golden', 'Silent', 'Wandering', 'Vivid', 'Ethereal', 'Azure', 'Crimson', 'Luminous', 'Serene', 'Nocturnal',
  'Velvet', 'Radiant', 'Rustic', 'Misty', 'Neon', 'Emerald', 'Amber', 'Celestial', 'Urban', 'Wild'
];
const PREVIEW_NOUNS = [
  'Horizon', 'Journey', 'Portrait', 'Forest', 'Coastline', 'Twilight', 'Echoes', 'Cityscape', 'Dreamscape', 'Reflections',
  'Valley', 'Skylines', 'Wilderness', 'Harbor', 'Dunes', 'Boulevard', 'Summit', 'Cascade', 'Grove', 'Odyssey'
];
function makePreviewTitle(id: string) {
  const num = Number(id.replace(/[^0-9]/g, '')) || 0;
  const a = PREVIEW_ADJECTIVES[num % PREVIEW_ADJECTIVES.length];
  const n = PREVIEW_NOUNS[(num >> 2) % PREVIEW_NOUNS.length];
  return `${a} ${n}`;
}

const categories = [
  'All',
  'Nature',
  'Landscape',
  'Portrait',
  'Architecture',
  'Street',
  'Travel',
  'Wildlife',
  'Food',
  'Fashion',
  'Sports',
  'Abstract',
  'Aerial',
  'Night',
  'Macro',
  'Minimal',
];

const fileTypes = ['All', 'jpg', 'jpeg', 'png', 'webp'];

function GalleryInner() {
  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Array<{ id: string; author: string; url: string; category: string }>>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewCategory, setPreviewCategory] = useState<string>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState<PortraitPhoto | null>(null);
  const [filters, setFilters] = useState({
    category: 'All',
    is_free: 'All', // All, true, false
    file_type: 'All',
    search: '',
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const category = searchParams.get('category') || 'All';
    const is_free = searchParams.get('is_free') || 'All';
    const file_type = searchParams.get('file_type') || 'All';
    const search = searchParams.get('search') || '';
    setFilters({ category, is_free, file_type, search });
    loadPhotos({ category, is_free, file_type, search });
  }, [searchParams]);

  // Load free preview photos from a public API (Picsum) to fill the page
  useEffect(() => {
    const loadPreview = async (page: number) => {
      try {
        setLoadingPreview(true);
        const res = await fetch(`https://picsum.photos/v2/list?page=${page}&limit=24`);
        const list = await res.json().catch(() => [] as any[]);
        const mapped = Array.isArray(list)
          ? list.map((it: any) => {
              const id = String(it.id);
              const num = Number(id.replace(/[^0-9]/g, '')) || 0;
              const cats = categories.filter(c => c !== 'All');
              const category = cats[num % cats.length] || 'Nature';
              return { id, author: String(it.author || 'Unknown'), url: String(it.download_url || it.url), category };
            })
          : [];
        setPreview(mapped);
      } catch {
        setPreview([]);
      } finally {
        setLoadingPreview(false);
      }
    };
    loadPreview(previewPage);
  }, [previewPage]);

  const loadPhotos = async (f: typeof filters) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (f.category !== 'All') params.set('category', f.category);
      if (f.is_free !== 'All') params.set('is_free', f.is_free);
      if (f.file_type !== 'All') params.set('file_type', f.file_type);
      if (f.search) params.set('search', f.search);
      params.set('per_page', '48');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/photos?${params}`, { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({} as any));
      const items: ApiPhoto[] = Array.isArray(data?.data) ? data.data : [];
      setPhotos(items);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    const params = new URLSearchParams();
    if (updated.category !== 'All') params.set('category', updated.category);
    if (updated.is_free !== 'All') params.set('is_free', updated.is_free);
    if (updated.file_type !== 'All') params.set('file_type', updated.file_type);
    if (updated.search) params.set('search', updated.search);
    router.push(`/gallery?${params}`);
  };

  const handleDownload = (p: ApiPhoto) => {
    const portrait: PortraitPhoto = {
      id: p.id,
      title: p.title,
      description: p.description,
      url: p.url,
      photographer: p.photographer,
      category: p.category,
      is_free: p.is_free,
      price: p.price,
    };
    setActivePhoto(portrait);
    setModalOpen(true);
  };

  const handleLike = async (p: ApiPhoto, idx: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/photos/${p.id}/like`, { method: 'POST', headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({} as any));
      const newLikes = data?.data?.likes ?? ((p.likes || 0) + 1);
      setPhotos((prev) => {
        const copy = [...prev];
        if (copy[idx]) copy[idx].likes = newLikes;
        return copy;
      });
    } catch {
      // noop
    }
  };

  return (
    <main>
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-y-12"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6"
            >
              <Camera className="w-5 h-5 text-white" />
              <span className="text-white/90 font-medium">Professional Photography Gallery</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Discover Amazing
              <span className="block bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                Photography
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto mb-8 leading-relaxed">
              Explore millions of stunning photos from talented photographers worldwide. 
              Find the perfect image for your project with our advanced search and filtering tools.
            </p>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="max-w-2xl mx-auto mb-12"
            >
              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search photos, photographers, or descriptions..."
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="w-full pl-16 pr-6 py-5 rounded-2xl border-0 bg-white/95 backdrop-blur-sm shadow-2xl focus:ring-4 focus:ring-white/50 focus:outline-none text-lg placeholder-gray-500"
                />
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            >
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mx-auto mb-3">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white">10K+</div>
                <div className="text-white/70 text-sm">Photos</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mx-auto mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white">500+</div>
                <div className="text-white/70 text-sm">Photographers</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mx-auto mb-3">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white">50K+</div>
                <div className="text-white/70 text-sm">Downloads</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mx-auto mb-3">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white">100K+</div>
                <div className="text-white/70 text-sm">Likes</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {/* Sidebar Filters */}
            <aside className="w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
                <div className="flex items-center gap-2 mb-6">
                  <Filter className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={filters.category}
                      onChange={(e) => updateFilters({ category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <div className="space-y-2">
                      {['All', 'Free', 'Paid'].map((type) => (
                        <label key={type} className="flex items-center">
                          <input
                            type="radio"
                            name="type"
                            value={type === 'All' ? 'All' : type === 'Free' ? 'true' : 'false'}
                            checked={filters.is_free === (type === 'All' ? 'All' : type === 'Free' ? 'true' : 'false')}
                            onChange={(e) => updateFilters({ is_free: e.target.value })}
                            className="mr-2"
                          />
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">File Type</label>
                    <select
                      value={filters.file_type}
                      onChange={(e) => updateFilters({ file_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {fileTypes.map((ft) => (
                        <option key={ft} value={ft}>{ft.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {loading ? (
                <div className="text-center text-gray-500 py-12">Loading photos...</div>
              ) : photos.length === 0 ? (
                <div className="text-center text-gray-500 py-12">No photos found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {photos.map((p, idx) => {
                    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
                    let img = p.url;
                    try {
                      if (p.url && base) {
                        const u = new URL(p.url);
                        if (u.pathname.startsWith('/storage/')) {
                          img = `${base}${u.pathname}`;
                        }
                      }
                    } catch {
                      if (p.url?.startsWith('/storage/') && base) img = `${base}${p.url}`;
                    }
                    return (
                      <Link
                        key={String(p.id)}
                        href={`/photo/${p.id}`}
                        onClick={(e) => {
                          // Keep modal UX on normal left-click; allow new tab/middle clicks
                          if (
                            e.button === 0 &&
                            !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
                          ) {
                            e.preventDefault();
                            handleDownload(p);
                          }
                        }}
                        className="block"
                      >
                        <PhotoCard
                          id={String(p.id)}
                          imageUrl={img}
                          title={p.title}
                          photographer={p.photographer}
                          price={p.is_free ? undefined : (p.price as number | undefined)}
                          downloads={p.downloads || 0}
                          views={0}
                          likes={p.likes || 0}
                          onDownload={() => handleDownload(p)}
                          onLike={() => handleLike(p, idx)}
                          detailsUrl={`/photo/${p.id}`}
                        />
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Free Preview Photos (placeholder images) */}
              <div className="mt-14">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Free Preview Photos</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 hidden sm:inline">Powered by public image API</span>
                    <div className="hidden md:flex items-center gap-2">
                      <label className="text-sm text-gray-600">Category</label>
                      <select
                        className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={previewCategory}
                        onChange={(e) => setPreviewCategory(e.target.value)}
                      >
                        {categories.map((cat) => (
                          <option key={`pvcat-${cat}`} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        disabled={loadingPreview || previewPage === 1}
                        aria-label="Previous page"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-gray-600 min-w-[3rem] text-center">{previewPage}</span>
                      <button
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        onClick={() => setPreviewPage((p) => p + 1)}
                        disabled={loadingPreview}
                        aria-label="Next page"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
                {loadingPreview ? (
                  <div className="text-center text-gray-500 py-8">Loading preview photos...</div>
                ) : preview.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">No preview photos available at the moment.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {preview
                      .filter((ph) => previewCategory === 'All' || ph.category === previewCategory)
                      .map((ph) => {
                      // Use a fixed thumbnail size for consistent layout
                      const thumb = `https://picsum.photos/id/${ph.id}/600/400`;
                      return (
                        <PhotoCard
                          key={`preview-${ph.id}`}
                          id={`preview:${ph.id}`}
                          imageUrl={thumb}
                          title={makePreviewTitle(ph.id)}
                          photographer=''
                          downloads={0}
                          views={0}
                          likes={0}
                          detailsUrl={`https://picsum.photos/id/${ph.id}`}
                          onDownload={() => {
                            const portrait: PortraitPhoto = {
                              id: `preview:${ph.id}`,
                              title: makePreviewTitle(ph.id),
                              url: `https://picsum.photos/id/${ph.id}/2000/1333`,
                              photographer: ph.author,
                              category: ph.category,
                              is_free: true,
                            };
                            setActivePhoto(portrait);
                            setModalOpen(true);
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <PortraitModal
        open={modalOpen}
        photo={activePhoto}
        onClose={() => setModalOpen(false)}
        onDownload={() => {
          if (!activePhoto) return;
          // Handle preview photos download separately (direct download)
          if (String(activePhoto.id).startsWith('preview:')) {
            const a = document.createElement('a');
            a.href = activePhoto.url;
            a.download = `sigzagphoto-preview-${String(activePhoto.id).split(':')[1]}.jpg`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setModalOpen(false);
            return;
          }
          const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
          window.location.href = `${base}/api/photos/${activePhoto.id}/download`;
          setModalOpen(false);
        }}
        onCheckout={() => {
          if (!activePhoto) return;
          // No checkout for preview photos
          if (String(activePhoto.id).startsWith('preview:')) return;
          router.push(`/checkout?photo=${activePhoto.id}`);
          setModalOpen(false);
        }}
        onAIEnhance={async () => {
          if (!activePhoto) return '';
          if (String(activePhoto.id).startsWith('preview:')) return '';
          const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
          const res = await fetch(`${base}/api/photos/${activePhoto.id}/enhance`, {
            method: 'POST',
            headers: { Accept: 'application/json' },
          });
          const data = await res.json().catch(() => ({} as any));
          const url: string = data?.data?.url || '';
          return url;
        }}
      />

      <Footer />
    </main>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<main className="min-h-[60vh] pt-24 text-center text-gray-600">Loading gallery…</main>}>
      <GalleryInner />
    </Suspense>
  );
}
