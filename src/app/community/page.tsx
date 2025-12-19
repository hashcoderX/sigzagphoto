'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';

type Thread = {
  id: number;
  title: string;
  body: string;
  user_id: number;
  replies_count: number;
  last_post_at?: string;
  created_at: string;
  category?: string | null;
  tags?: string | null;
  user?: { id: number; name: string };
};

export default function CommunityPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (pageOverride?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('per_page', '20');
      params.set('page', String(pageOverride ?? page));
      if (q.trim()) params.set('q', q.trim());
      if (filterCategory.trim()) params.set('category', filterCategory.trim());
      if (filterTag.trim()) params.set('tag', filterTag.trim());
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forum/threads?${params.toString()}`, { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({} as any));
      const list: Thread[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setThreads(list);
      if (data && typeof data === 'object') {
        if (typeof data.current_page === 'number') setPage(data.current_page);
        if (typeof data.last_page === 'number') setLastPage(data.last_page);
        if (typeof data.total === 'number') setTotal(data.total);
      }
    } catch (e: any) {
      setError('Failed to load threads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); }, []);
  const handleSearch = async (e: React.FormEvent) => { e.preventDefault(); setPage(1); await load(1); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !body.trim()) return;
    setCreating(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) throw new Error('Please login to create a thread');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forum/threads`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body, category: category || null, tags: tags || null }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.message || 'Failed to create thread');
      setTitle(''); setBody(''); setCategory(''); setTags('');
      setPage(1);
      await load(1);
    } catch (e: any) {
      setError(e?.message || 'Failed to create thread');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Community Forum</h1>
            <Link href="/login" className="text-sm text-[#6C63FF] hover:text-[#FF6B6B]">Login</Link>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 mb-8">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
              <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search title or body" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              <input value={filterCategory} onChange={(e)=>setFilterCategory(e.target.value)} placeholder="Category (e.g., Gear, Editing)" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              <input value={filterTag} onChange={(e)=>setFilterTag(e.target.value)} placeholder="Tag (e.g., canon)" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} className="bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold">Search</motion.button>
            </form>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Start a new thread</h2>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <form onSubmit={handleCreate} className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Thread title" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={category} onChange={(e)=>setCategory(e.target.value)} placeholder="Category (optional)" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                <input value={tags} onChange={(e)=>setTags(e.target.value)} placeholder="Tags comma-separated (optional)" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
              </div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What do you want to discuss?" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" rows={4} />
              <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} disabled={creating} className="bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-60">{creating ? 'Posting...' : 'Post Thread'}</motion.button>
            </form>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-3">Latest threads</h2>
          {loading ? (
            <p className="text-gray-600">Loading threads...</p>
          ) : threads.length === 0 ? (
            <p className="text-gray-600">No threads yet. Be the first to post!</p>
          ) : (
            <div className="space-y-3">
              {threads.map((t) => (
                <Link key={t.id} href={`/community/${t.id}`} className="block bg-white rounded-xl border border-gray-200 hover:border-gray-300 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{t.title}</h3>
                    <span className="text-sm text-gray-500">{t.replies_count || 0} replies</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{t.body}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {t.category ? <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{t.category}</span> : null}
                    {t.tags?.split(',').map((tg)=>tg.trim()).filter(Boolean).slice(0,5).map((tg, idx)=>(
                      <span key={idx} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">#{tg}</span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">by {t.user?.name || 'User'} • {new Date(t.created_at).toLocaleString()}</div>
                </Link>
              ))}
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-600">Page {page} of {lastPage} • {total} total</div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 rounded border disabled:opacity-50"
                    disabled={page <= 1}
                    onClick={() => load(page - 1)}
                  >Previous</button>
                  <button
                    className="px-3 py-2 rounded border disabled:opacity-50"
                    disabled={page >= lastPage}
                    onClick={() => load(page + 1)}
                  >Next</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
