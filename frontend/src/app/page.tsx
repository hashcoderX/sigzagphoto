'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Upload, Globe, Shield, Briefcase, TrendingUp, Users, Camera, Sparkles, DollarSign } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import FeatureCard from '@/components/FeatureCard';
import PhotoCard from '@/components/PhotoCard';
import PortraitModal, { PortraitPhoto } from '@/components/PortraitModal';
// Render slider on client only to avoid hydration attribute mismatches from extensions
const TestimonialSlider = dynamic(() => import('@/components/TestimonialSlider'), { ssr: false });
import Link from 'next/link';

const categories = [
  {
    name: 'Nature',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    count: '1.2M Photos',
  },
  {
    name: 'Travel',
    image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop',
    count: '980K Photos',
  },
  {
    name: 'Portraits',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop',
    count: '750K Photos',
  },
  {
    name: 'Abstract',
    image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&h=600&fit=crop',
    count: '640K Photos',
  },
  {
    name: 'Architecture',
    image: 'https://images.unsplash.com/photo-1486718448742-163732cd1544?w=800&h=600&fit=crop',
    count: '890K Photos',
  },
  {
    name: 'Wildlife',
    image: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800&h=600&fit=crop',
    count: '520K Photos',
  },
];

type ApiPhoto = { id:number; title:string; description?:string; category?:string; photographer:string; is_free:boolean; price?:number; downloads?:number; likes?:number; url:string };

const features = [
  {
    icon: Upload,
    title: 'Easy Photo Uploads',
    description: 'Upload your photos effortlessly with our intuitive interface. Support for bulk uploads and automatic metadata extraction.',
  },
  {
    icon: Globe,
    title: 'Global Exposure',
    description: 'Reach millions of potential buyers worldwide. Your photos are showcased to an international audience.',
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Safe and reliable payment processing. Get paid quickly with multiple payment options available.',
  },
  {
    icon: Briefcase,
    title: 'Business Registration',
    description: 'Register as a business and unlock advanced features. Perfect for photography studios and agencies.',
  },
  {
    icon: TrendingUp,
    title: 'Analytics & Insights',
    description: 'Track your performance with detailed analytics. Understand what works and grow your sales.',
  },
  {
    icon: Users,
    title: 'Community Support',
    description: 'Join a thriving community of photographers. Share tips, get feedback, and collaborate on projects.',
  },
];

export default function Home() {
  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [activePhoto, setActivePhoto] = useState<PortraitPhoto | null>(null);
  // Category explorer via external image API
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [catImages, setCatImages] = useState<Array<{ id: string; url: string; author: string }>>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catPage, setCatPage] = useState(1);
  const catSectionRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubscribeMessage('Please enter a valid email address.');
      return;
    }
    setSubscribing(true);
    setSubscribeMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const msg = data?.message || 'Subscription failed. Please try again later.';
        throw new Error(msg);
      }
      setSubscribeMessage('Thank you for subscribing!');
      setEmail('');
    } catch (err: any) {
      setSubscribeMessage(err?.message || 'Subscription failed. Please try again later.');
    } finally {
      setSubscribing(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingPhotos(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/photos?per_page=12`, { headers: { Accept: 'application/json' } });
        const data = await res.json().catch(() => ({} as any));
        const items: ApiPhoto[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : Array.isArray(data?.data?.data) ? data.data.data : []);
        setPhotos(items);
      } catch (e) {
        setPhotos([]);
      } finally {
        setLoadingPhotos(false);
      }
    };
    load();
  }, []);

  // Load external images for the selected category using Picsum (random images)
  useEffect(() => {
    if (!selectedCategory) return;
    const run = async () => {
      setCatLoading(true);
      try {
        const items: Array<{ id: string; url: string; author: string }> = [];
        for (let i = 0; i < 12; i++) {
          const sig = catPage * 1000 + i;
          const url = `https://picsum.photos/800/600?random=${sig}`;
          items.push({ id: `homepreview:${selectedCategory}:${sig}` , url, author: '' });
        }
        setCatImages(items);
      } finally {
        setCatLoading(false);
      }
    };
    run();
  }, [selectedCategory, catPage]);
  return (
    <main>
      <Navbar />
      
      <HeroSection />

      {/* Featured Categories */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Explore Popular Categories
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover stunning photography across various categories
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="relative h-64 rounded-2xl overflow-hidden cursor-pointer group"
                onClick={() => {
                  setSelectedCategory(category.name);
                  setCatPage(1);
                  setTimeout(() => {
                    if (catSectionRef.current) {
                      catSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                  style={{ backgroundImage: `url(${category.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-1">{category.name}</h3>
                  <p className="text-white/80">{category.count}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Uploads */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Latest Uploads
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Fresh photos from our community
            </p>
          </motion.div>
          {loadingPhotos ? (
            <div className="text-center text-gray-500">Loading photos...</div>
          ) : photos.length === 0 ? (
            <div className="text-center text-gray-500">No photos uploaded yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                const handleDownload = () => {
                  const portrait: PortraitPhoto = {
                    id: p.id,
                    title: p.title,
                    description: p.description,
                    url: img,
                    photographer: p.photographer,
                    category: p.category,
                    is_free: p.is_free,
                    price: (p.price as any) ?? undefined,
                  };
                  setActivePhoto(portrait);
                  setModalOpen(true);
                };
                const handleLike = async () => {
                  try {
                    const res = await fetch(`${base}/api/photos/${p.id}/like`, { method: 'POST', headers: { Accept: 'application/json' } });
                    const data = await res.json().catch(() => ({} as any));
                    const newLikes = data?.data?.likes ?? ((p.likes || 0) + 1);
                    setPhotos((prev) => {
                      const copy = [...prev];
                      const current = copy[idx];
                      if (current) current.likes = newLikes;
                      return copy;
                    });
                  } catch {
                    // noop on error
                  }
                };
                return (
                  <PhotoCard
                    key={String(p.id)}
                    id={String(p.id)}
                    imageUrl={img}
                    title={p.title}
                    photographer={p.photographer}
                    price={p.is_free ? undefined : (p.price as number | undefined)}
                    downloads={p.downloads || 0}
                    views={0}
                    likes={p.likes || 0}
                    onDownload={handleDownload}
                    onLike={handleLike}
                  />
                );
              })}
            </div>
          )}
          <PortraitModal
            open={modalOpen}
            photo={activePhoto}
            onClose={() => setModalOpen(false)}
            onDownload={() => {
              if (!activePhoto) return;
              const idStr = String(activePhoto.id);
              if (idStr.startsWith('unsrc:') || idStr.startsWith('preview:') || idStr.startsWith('homepreview:')) {
                const a = document.createElement('a');
                a.href = activePhoto.url;
                a.download = `sigzagphoto-${idStr.replace(/[:]/g,'-')}.jpg`;
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
              const idStr = String(activePhoto.id);
              if (idStr.startsWith('unsrc:') || idStr.startsWith('preview:') || idStr.startsWith('homepreview:')) {
                setModalOpen(false);
                return;
              }
              router.push(`/checkout?photo=${activePhoto.id}`);
              setModalOpen(false);
            }}
            onAIEnhance={async () => {
              const photo = activePhoto;
              if (!photo) return '';
              const idStr = String(photo.id);
              if (idStr.startsWith('unsrc:') || idStr.startsWith('preview:') || idStr.startsWith('homepreview:')) return '';
              try {
                const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
                const res = await fetch(`${base}/api/photos/${photo.id}/enhance`, { method: 'POST', headers: { Accept: 'application/json' } });
                const data = await res.json().catch(() => ({} as any));
                const url = data?.data?.url || data?.url || '';
                return url;
              } catch {
                return '';
              }
            }}
          />

          <div className="text-center">
            <Link href="/gallery">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                View All Photos
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* Management Suite Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Management Suite
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Capture, Create, Sell on sigzagphoto
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100"
            >
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Capture</h3>
              <p className="text-gray-600">
                Upload and organize your stunning photographs with our intuitive management tools.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-100"
            >
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Create</h3>
              <p className="text-gray-600">
                Enhance your photos with AI-powered tools to create professional-quality images.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center p-6 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100"
            >
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Sell</h3>
              <p className="text-gray-600">
                Monetize your photography by selling high-quality images on our global marketplace.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Management Suites Explanation */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Our Management Suites
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Simple tools to help you run your photography business
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Website Management Suite */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-lg"
            >
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-6">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Website Management Suite</h3>
              <div className="space-y-4 text-gray-600">
                <p>
                  This is for people who run the website. It helps them control everything on the site.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Manage users: Add, remove, or change user accounts.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Check photos: Look at all uploaded photos and approve them.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Handle payments: See money transactions and fix problems.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Site settings: Change how the website looks and works.</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Business Management Suite */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-lg"
            >
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-6">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Business Management Suite</h3>
              <div className="space-y-4 text-gray-600">
                <p>
                  This is for photographers who want to run their own business. It helps them organize work and make money.
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Client list: Keep track of your customers and their details.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Job calendar: Plan your photo shoots and appointments.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Send bills: Create invoices and get paid easily.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>Track money: See how much money you make and spend.</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Category Explorer Section (external images) */}
      <section ref={catSectionRef} className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">{selectedCategory ? `Explore ${selectedCategory}` : 'Explore by Category'}</h2>
            {selectedCategory && (
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  onClick={() => setCatPage((p) => Math.max(1, p - 1))}
                  disabled={catLoading || catPage === 1}
                >
                  Prev
                </button>
                <span className="text-sm text-gray-600 min-w-[3rem] text-center">{catPage}</span>
                <button
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  onClick={() => setCatPage((p) => p + 1)}
                  disabled={catLoading}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {!selectedCategory ? (
            <p className="text-gray-600">Click a category above to load a curated set of images.</p>
          ) : catLoading ? (
            <div className="text-center text-gray-500">Loading {selectedCategory} photos...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {catImages.map((img, idx) => (
                <PhotoCard
                  key={img.id}
                  id={img.id}
                  imageUrl={img.url}
                  title={`${selectedCategory} ${idx + 1}`}
                  photographer={img.author}
                  downloads={0}
                  views={0}
                  likes={0}
                  onClick={() => {
                    const portrait: PortraitPhoto = {
                      id: img.id,
                      title: `${selectedCategory} ${idx + 1}`,
                      url: img.url,
                      photographer: img.author,
                      is_free: true,
                    };
                    setActivePhoto(portrait);
                    setModalOpen(true);
                  }}
                  onDownload={() => {
                    const portrait: PortraitPhoto = {
                      id: img.id,
                      title: `${selectedCategory} ${idx + 1}`,
                      url: img.url,
                      photographer: img.author,
                      is_free: true,
                    };
                    setActivePhoto(portrait);
                    setModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Join Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Join sigzagphoto?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to succeed as a photographer
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What Photographers Say
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Join thousands of satisfied photographers worldwide
            </p>
          </motion.div>

          <TestimonialSlider />
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Stay Updated
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Get the latest news, tips, and exclusive offers delivered to your inbox
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto" suppressHydrationWarning>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-6 py-4 rounded-full text-gray-900 focus:outline-none focus:ring-4 focus:ring-white/50"
                disabled={subscribing}
                suppressHydrationWarning
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={subscribing}
                className="bg-white text-[#6C63FF] px-8 py-4 rounded-full font-bold hover:shadow-xl transition-all disabled:opacity-50"
                suppressHydrationWarning
              >
                {subscribing ? 'Subscribing...' : 'Subscribe'}
              </motion.button>
            </form>
            {subscribeMessage && (
              <p className="mt-4 text-white/90">{subscribeMessage}</p>
            )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
