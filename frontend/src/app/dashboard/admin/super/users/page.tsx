"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import AdminSectionHeader from "@/components/AdminSectionHeader";

interface SuperUser { id: number; name: string; email: string; role: string; active?: boolean; premium_package?: boolean; created_at?: string }
interface Page<T> { data: T[]; current_page: number; last_page: number }

export default function SuperUsersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page<SuperUser> | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const authUserRaw = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    if (!t) { router.replace('/login'); return; }
    if (authUserRaw) {
      try {
        const u = JSON.parse(authUserRaw) as { role?: string };
        if (!['admin','super'].includes((u.role||'').toLowerCase())) {
          router.replace('/dashboard');
          return;
        }
      } catch {}
    }
    setToken(t);
    fetchUsers(t, 1, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async (t: string, p: number, search: string) => {
    setLoading(true); setError(null);
    try {
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/super/users`);
      url.searchParams.set('per_page','10');
      url.searchParams.set('page', String(p));
      if (search) url.searchParams.set('q', search);
      const res = await fetch(url.toString(), { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setPage(data);
    } catch (e: any) { setError(e?.message || 'Failed to load users'); } finally { setLoading(false); }
  };

  const toggleActive = async (userId: number, active: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/super/users/${userId}/active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active })
      });
      if (!res.ok) throw new Error('Update failed');
      fetchUsers(token, page?.current_page || 1, q);
    } catch (e: any) { setError(e?.message || 'Update failed'); }
  };

  const togglePremium = async (userId: number, premium: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/super/users/${userId}/premium`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ premium_package: premium })
      });
      if (!res.ok) throw new Error('Premium update failed');
      fetchUsers(token, page?.current_page || 1, q);
    } catch (e: any) { setError(e?.message || 'Premium update failed'); }
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <AdminSectionHeader title="Review Accounts" subtitle="Activate or deactivate photographers & businesses" />
            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>}

            <div className="mb-4 flex gap-3">
              <input value={q} onChange={(e)=>setQ(e.target.value)} className="input" placeholder="Search name/email/role" />
              <button onClick={()=> token && fetchUsers(token, 1, q)} className="btn-primary">Search</button>
            </div>

            {loading ? <p className="text-gray-600">Loading...</p> : (
              <div className="overflow-x-auto">
                <table className="adminTable" role="table" aria-label="Users table">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Premium</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(page?.data || []).map(u => (
                      <tr key={u.id}>
                        <td className="py-3 pr-4 font-medium text-gray-800">#{u.id}</td>
                        <td className="py-3 pr-4">{u.name}</td>
                        <td className="py-3 pr-4">{u.email}</td>
                        <td className="py-3 pr-4 capitalize">{u.role}</td>
                        <td className="py-3 pr-4"><span className={`badge ${u.active ? 'badge-green':'badge-gray'}`}>{u.active ? 'Active':'Inactive'}</span></td>
                        <td className="py-3 pr-4"><span className={`badge ${u.premium_package ? 'badge-premium':'badge-gray'}`}>{u.premium_package ? 'Premium':'Free'}</span></td>
                        <td className="py-3 pr-4">
                          {u.active ? (
                            <button onClick={()=>toggleActive(u.id, false)} className="btn-danger">Deactivate</button>
                          ) : (
                            <button onClick={()=>toggleActive(u.id, true)} className="btn-primary">Activate</button>
                          )}
                          {u.premium_package ? (
                            <button onClick={()=>togglePremium(u.id, false)} className="ml-2 btn-secondary">Remove Premium</button>
                          ) : (
                            <button onClick={()=>togglePremium(u.id, true)} className="ml-2 btn-secondary">Grant Premium</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </section>
      <Footer />
      <style jsx global>{`
        .input { width: 100%; padding: 0.5rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.75rem; }
        .input:focus { outline: none; border-color: #6C63FF; }
        .btn-primary { background: #111827; color: white; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .btn-secondary { background: #f3f4f6; color: #111827; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .btn-danger { background: #fee2e2; color: #991b1b; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .adminTable { width: 100%; border-collapse: separate; border-spacing: 0; }
        .adminTable thead th { background: #f9fafb; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding: 0.75rem 1rem; }
        .adminTable tbody td { padding: 0.75rem 1rem; border-bottom: 1px solid #eef0f2; }
        .adminTable tbody tr { transition: background-color .15s ease; }
        .adminTable tbody tr:hover { background-color: #f3f4f6; }
        .adminTable tbody tr:hover td { color: #111827; }
        .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
        .badge-green { background: #ecfdf5; color: #065f46; }
        .badge-gray { background: #f3f4f6; color: #374151; }
        .badge-premium { background: #fef3c7; color: #b45309; }
      `}</style>
    </main>
  );
}
