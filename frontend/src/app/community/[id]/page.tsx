'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';

type Thread = {
  id: number;
  title: string;
  body: string;
  user?: { id: number; name: string };
  created_at: string;
};

type Post = {
  id: number;
  body: string;
  user?: { id: number; name: string };
  created_at: string;
};

export default function ThreadPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editingThread, setEditingThread] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [savingThread, setSavingThread] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editPostBody, setEditPostBody] = useState('');
  const [savingPost, setSavingPost] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forum/threads/${id}`, { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => ({} as any));
      setThread(data?.thread || null);
      const list = Array.isArray(data?.posts?.data) ? data.posts.data : [];
      setPosts(list);
    } catch (e: any) {
      setError('Failed to load thread');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } })
      .then(r=>r.json()).then(d=>{ if (d?.id) setCurrentUserId(d.id); }).catch(()=>{});
  }, []);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!reply.trim()) return;
    setSending(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) throw new Error('Please login to reply');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forum/threads/${id}/posts`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.message || 'Failed to post reply');
      setReply('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to post reply');
    } finally {
      setSending(false);
    }
  };

  const startEditThread = () => {
    if (!thread) return;
    setEditTitle(thread.title);
    setEditBody(thread.body);
    setEditingThread(true);
  };
  const cancelEditThread = () => { setEditingThread(false); setEditTitle(''); setEditBody(''); };
  const saveThread = async () => {
    if (!editTitle.trim() || !editBody.trim()) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) { setError('Please login'); return; }
    setSavingThread(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forum/threads/${id}`, {
        method: 'PATCH',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: editTitle, body: editBody })
      });
      const data = await res.json().catch(()=>({} as any));
      if (!res.ok) throw new Error(data?.message || 'Failed to update');
      setEditingThread(false);
      await load();
    } catch (e:any) { setError(e?.message || 'Failed to update'); }
    finally { setSavingThread(false); }
  };
  const deleteThread = async () => {
    if (!confirm('Delete this thread? This cannot be undone.')) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) { setError('Please login'); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forum/threads/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({} as any));
        throw new Error(data?.message || 'Failed to delete');
      }
      router.push('/community');
    } catch (e:any) { setError(e?.message || 'Failed to delete'); }
  };

  const startEditPost = (post: Post) => { setEditingPostId(post.id); setEditPostBody(post.body); };
  const cancelEditPost = () => { setEditingPostId(null); setEditPostBody(''); };
  const savePost = async (postId: number) => {
    if (!editPostBody.trim()) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) { setError('Please login'); return; }
    setSavingPost(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forum/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ body: editPostBody })
      });
      const data = await res.json().catch(()=>({} as any));
      if (!res.ok) throw new Error(data?.message || 'Failed to update');
      setEditingPostId(null); setEditPostBody('');
      await load();
    } catch (e:any) { setError(e?.message || 'Failed to update'); }
    finally { setSavingPost(false); }
  };
  const deletePost = async (postId: number) => {
    if (!confirm('Delete this reply?')) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) { setError('Please login'); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forum/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({} as any));
        throw new Error(data?.message || 'Failed to delete');
      }
      await load();
    } catch (e:any) { setError(e?.message || 'Failed to delete'); }
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <p className="text-gray-600">Loading…</p>
          ) : !thread ? (
            <p className="text-gray-600">Thread not found.</p>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow p-6">
                {!editingThread ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">{thread.title}</h1>
                        <div className="text-sm text-gray-500 mt-1">by {thread.user?.name || 'User'} • {new Date(thread.created_at).toLocaleString()}</div>
                      </div>
                      {currentUserId && thread.user && currentUserId === (thread.user as any).id ? (
                        <div className="flex gap-2">
                          <button onClick={startEditThread} className="text-sm text-blue-600 hover:underline">Edit</button>
                          <button onClick={deleteThread} className="text-sm text-red-600 hover:underline">Delete</button>
                        </div>
                      ) : null}
                    </div>
                    <p className="text-gray-700 mt-4 whitespace-pre-line">{thread.body}</p>
                  </>
                ) : (
                  <div className="space-y-3">
                    <input value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                    <textarea value={editBody} onChange={(e)=>setEditBody(e.target.value)} rows={5} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" />
                    <div className="flex gap-3">
                      <button onClick={saveThread} disabled={savingThread} className="bg-gray-900 text-white px-4 py-2 rounded-lg disabled:opacity-60">{savingThread ? 'Saving…' : 'Save'}</button>
                      <button onClick={cancelEditThread} className="px-4 py-2 rounded-lg border">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Replies</h2>
                {posts.length === 0 ? (
                  <p className="text-gray-600">No replies yet.</p>
                ) : (
                  <div className="space-y-4">
                    {posts.map((p) => (
                      <div key={p.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm text-gray-500">{p.user?.name || 'User'} • {new Date(p.created_at).toLocaleString()}</div>
                          {currentUserId && p.user && currentUserId === (p.user as any).id ? (
                            <div className="flex gap-2">
                              {editingPostId === p.id ? null : <button onClick={()=>startEditPost(p)} className="text-xs text-blue-600 hover:underline">Edit</button>}
                              <button onClick={()=>deletePost(p.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                            </div>
                          ) : null}
                        </div>
                        {editingPostId === p.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea value={editPostBody} onChange={(e)=>setEditPostBody(e.target.value)} rows={4} className="w-full px-3 py-2 rounded border" />
                            <div className="flex gap-2">
                              <button onClick={()=>savePost(p.id)} disabled={savingPost} className="bg-gray-900 text-white px-3 py-1 rounded disabled:opacity-60">{savingPost ? 'Saving…' : 'Save'}</button>
                              <button onClick={cancelEditPost} className="px-3 py-1 rounded border">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-800 whitespace-pre-line mt-2">{p.body}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Add a reply</h2>
                {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
                <form onSubmit={handleReply} className="space-y-3">
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write your reply" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]" rows={4} />
                  <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}} disabled={sending} className="bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-60">{sending ? 'Posting…' : 'Post Reply'}</motion.button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
