"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

type ApiUser = { id: number; name: string; email: string; role: string; currency?: string; privilege?: string };
type UserLite = { id: number; name: string; email: string; role: string; privilege?: string | null };

export default function AdminSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<{ name: string; email: string; password?: string; currency?: string } | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Users & privileges
  const [users, setUsers] = useState<UserLite[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{ name: string; email: string; password: string; privilege: string }>({ name: '', email: '', password: '', privilege: 'officer' });
  const [userActionMsg, setUserActionMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const cached = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
    if (cached) {
      try { const u = JSON.parse(cached); setUser(u); setProfileForm({ name: u?.name || '', email: u?.email || '', currency: u?.currency || undefined }); } catch {}
    }
    if (!token) { router.replace("/login"); return; }
    // Block free plan from business suite
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Unauthorized");
        const me = (await res.json()) as ApiUser;
        // Allow only photographer or business
        const r = (me.role || "").toLowerCase();
        if (!["business","photographer"].includes(r)) { router.replace("/dashboard"); return; }
        setUser(me);
        setProfileForm({ name: me.name, email: me.email, currency: me.currency });
        localStorage.setItem("auth_user", JSON.stringify(me));
      } catch {
        router.replace("/login");
      } finally { setLoading(false); }
    })();
  }, [router]);

  // Load users for privileges management
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;
    (async () => {
      setUsersLoading(true); setUserError(null);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const list: UserLite[] = data?.data || data || [];
        setUsers(list);
      } catch (e:any) { setUserError(e?.message || 'Failed to load users'); }
      finally { setUsersLoading(false); }
    })();
  }, []);

  const saveProfile = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token || !profileForm) return;
    setSavingProfile(true); setProfileError(null); setProfileSuccess(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Update failed');
      setProfileSuccess('Profile updated');
      // refresh local cache
      if (data?.name || data?.email) {
        const merged = { ...(user||{}), ...data } as ApiUser;
        setUser(merged);
        localStorage.setItem('auth_user', JSON.stringify(merged));
      }
    } catch (e:any) { setProfileError(e?.message || 'Update failed'); }
    finally { setSavingProfile(false); }
  };

  const createUser = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;
    setUserActionMsg(null); setUserError(null);
    try {
      const payload = { ...newUserForm };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Create failed');
      setUserActionMsg('User created');
      setCreatingUser(false);
      // refresh users
      setUsers(prev => [data, ...prev]);
    } catch (e:any) { setUserError(e?.message || 'Create failed'); }
  };

  const updateUser = async (id:number, patch: Partial<UserLite>) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;
    setUserActionMsg(null); setUserError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Update failed');
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
      setUserActionMsg('User updated');
    } catch (e:any) { setUserError(e?.message || 'Update failed'); }
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <AdminSectionHeader title="Settings" subtitle="Configure company profile, branding and preferences" />
            {loading ? (
              <p className="text-gray-600">Loading...</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile settings */}
                <div className="p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50">
                  <div className="text-sm text-indigo-700 font-semibold">Profile</div>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <input className="input" placeholder="Name" value={profileForm?.name || ''} onChange={(e)=>setProfileForm(f=>({...f!, name:e.target.value}))} />
                    <input className="input" placeholder="Email" value={profileForm?.email || ''} onChange={(e)=>setProfileForm(f=>({...f!, email:e.target.value}))} />
                    <input className="input" type="password" placeholder="New Password (optional)" value={profileForm?.password || ''} onChange={(e)=>setProfileForm(f=>({...f!, password:e.target.value}))} />
                    <input className="input" placeholder="Currency (e.g. USD)" value={profileForm?.currency || ''} onChange={(e)=>setProfileForm(f=>({...f!, currency:e.target.value}))} />
                    {profileError && <div className="text-sm text-red-700">{profileError}</div>}
                    {profileSuccess && <div className="text-sm text-emerald-700">{profileSuccess}</div>}
                    <div>
                      <button disabled={savingProfile} onClick={saveProfile} className="btn-primary">{savingProfile? 'Saving...' : 'Save Profile'}</button>
                    </div>
                  </div>
                </div>

                {/* Users & privileges */}
                <div className="p-4 rounded-xl border-2 border-pink-100 bg-pink-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-pink-700 font-semibold">Users & Privileges</div>
                    {user?.privilege?.toLowerCase() !== 'officer' && (
                      <button onClick={()=>setCreatingUser(v=>!v)} className="btn-secondary">{creatingUser? 'Close' : 'Register User'}</button>
                    )}
                  </div>
                  {creatingUser && (
                    <div className="registerCard" role="region" aria-label="Register user">
                      <div className="registerHeader">Register User</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="field">
                          <span className="fieldLabel">Full name</span>
                          <input className="input" placeholder="Jane Doe" value={newUserForm.name} onChange={(e)=>setNewUserForm({...newUserForm, name:e.target.value})} />
                        </label>
                        <label className="field">
                          <span className="fieldLabel">Email</span>
                          <input className="input" placeholder="jane@example.com" value={newUserForm.email} onChange={(e)=>setNewUserForm({...newUserForm, email:e.target.value})} />
                        </label>
                        <label className="field md:col-span-2">
                          <span className="fieldLabel">Password</span>
                          <input className="input" type="password" placeholder="••••••••" value={newUserForm.password} onChange={(e)=>setNewUserForm({...newUserForm, password:e.target.value})} />
                        </label>
                        <label className="field">
                          <span className="fieldLabel">Privilege</span>
                          <select className="input" value={newUserForm.privilege} onChange={(e)=>setNewUserForm({...newUserForm, privilege: e.target.value})}>
                            <option value="officer">Officer</option>
                            <option value="cashier">Cashier</option>
                          </select>
                        </label>
                        {userError && <div className="md:col-span-2 formError">{userError}</div>}
                        {userActionMsg && <div className="md:col-span-2 formSuccess">{userActionMsg}</div>}
                        <div className="md:col-span-2 flex items-center gap-3">
                          <button onClick={createUser} className="btn-primary">Create</button>
                          <span className="text-xs text-gray-500">User inherits your role; privilege defines access (Officer/Cashier).</span>
                        </div>
                      </div>
                      <div className="registerGlow" aria-hidden="true" />
                    </div>
                  )}
                  <div className="mt-4 overflow-x-auto">
                    {usersLoading ? (
                      <p className="text-gray-700">Loading users...</p>
                    ) : (
                      <table className="adminTable" role="table" aria-label="Users table">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="py-2 pr-4">Name</th>
                            <th className="py-2 pr-4">Email</th>
                            <th className="py-2 pr-4">Role</th>
                            <th className="py-2 pr-4">Privilege</th>
                            <th className="py-2 pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(u => (
                            <tr key={u.id}>
                              <td className="py-2 pr-4">{u.name}</td>
                              <td className="py-2 pr-4">{u.email}</td>
                              <td className="py-2 pr-4"><span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 border">{u.role}</span></td>
                              <td className="py-2 pr-4"><span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 border">{u.privilege || '(None)'}</span></td>
                              <td className="py-2 pr-4"><span className="text-xs text-gray-500">Auto-saves on change</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Preferences placeholder */}
                <div className="p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50">
                  <div className="text-sm text-emerald-700 font-semibold">Preferences</div>
                  <p className="mt-2 text-gray-700">Default currency, timezone, and notification options.</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
      <Footer />
      <style jsx global>{`
        /* Register card rich styling */
        .registerCard { position:relative; margin-top:.75rem; padding:1rem; border-radius:1.25rem; border:1px solid #fbcfe8; background:linear-gradient(145deg,#fff1f2,#fce7f3); box-shadow:0 14px 32px -10px rgba(236,72,153,.35), 0 6px 16px -8px rgba(31,41,55,.12); overflow:hidden; }
        .registerHeader { font-size:.7rem; font-weight:800; text-transform:uppercase; letter-spacing:.7px; background:linear-gradient(90deg,#db2777,#7c3aed); -webkit-background-clip:text; color:transparent; margin-bottom:.5rem; }
        .registerGlow { position:absolute; inset:0; background:radial-gradient(circle at 85% 10%,rgba(219,39,119,.25),transparent 60%), radial-gradient(circle at 10% 90%,rgba(124,58,237,.2),transparent 65%); pointer-events:none; }
        .field { display:flex; flex-direction:column; gap:.35rem; }
        .fieldLabel { font-size:.7rem; font-weight:700; letter-spacing:.4px; color:#7e22ce; }
        .formError { background:#fee2e2; border:1px solid #fecaca; color:#7f1d1d; padding:.5rem .75rem; border-radius:.75rem; }
        .formSuccess { background:#dcfce7; border:1px solid #bbf7d0; color:#065f46; padding:.5rem .75rem; border-radius:.75rem; }
        /* Inputs/buttons fallback if not globally defined */
        .input { width: 100%; padding: 0.55rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.75rem; }
        .input:focus { outline: none; border-color: #818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.15); }
        .btn-primary { background: #111827; color: white; padding: 0.55rem 0.9rem; border-radius: 0.75rem; font-weight:700; }
        .btn-secondary { background: #f3f4f6; color: #111827; padding: 0.5rem 0.9rem; border-radius: 0.75rem; }
        @media (prefers-reduced-motion: reduce) { .registerCard { transition:none; } }
      `}</style>
    </main>
  );
}
