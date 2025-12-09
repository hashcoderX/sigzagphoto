"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Plus, Trash2, Save, X, ArrowLeft } from "lucide-react";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Item {
  id: number;
  name: string;
  code: string;
  description?: string;
  price?: number;
  notes?: string;
}

interface Page<T> {
  data: T[];
  current_page: number;
  last_page: number;
}


export default function ItemsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page<Item> | null>(null);
  const [perPage] = useState(10);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Item>>({ code: "", name: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [creatingSubmitting, setCreatingSubmitting] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Item>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [userCurrency, setUserCurrency] = useState<string>('USD');

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!t) { router.replace("/login"); return; }
    // Enforce plan gating for business suite
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    setToken(t);
    fetchList(t, 1);
    fetchUserCurrency(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safely parse JSON; if invalid return raw text for diagnostics
  const parseJsonSafe = async (res: Response) => {
    const text = await res.text();
    try {
      return text.length ? JSON.parse(text) : null;
    } catch (e) {
      return { _raw: text };
    }
  };

  const fetchList = async (t: string, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ per_page: String(perPage), page: String(pageNum), ...(q ? { q } : {}) });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/items?${query.toString()}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${t}` },
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        const message = (data && typeof data === 'object' && 'message' in data) ? (data as any).message : 'Failed to load items';
        throw new Error(message);
      }
      setPage(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCurrency = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${t}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.currency) setUserCurrency(data.currency);
    } catch { }
  };

  const formatCurrency = (value: number): string => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: userCurrency }).format(value);
    } catch {
      return `${userCurrency} ${value.toFixed(2)}`;
    }
  };

  const createItem = async () => {
    if (!token) return;
    setCreateSuccess(null);
    setError(null);
    setFormErrors({});
    if (!form.code || !form.code.trim()) {
      setFormErrors({ code: 'Code is required' });
      return;
    }
    if (!form.name || !form.name.trim()) {
      setFormErrors({ name: 'Name is required' });
      return;
    }
    if (creatingSubmitting) return;
    setCreatingSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        if (res.status === 422 && data && typeof data === 'object' && (data as any).errors) {
          const errs: Record<string, string> = {};
          Object.entries<any>((data as any).errors).forEach(([k, v]) => (errs[k] = Array.isArray(v) ? v.join(' ') : String(v)));
          setFormErrors(errs);
          throw new Error('Please fix the highlighted errors');
        }
        const msg = (data && typeof data === 'object' && 'message' in data) ? (data as any).message : 'Create failed';
        throw new Error(msg);
      }
      setForm({ code: "", name: "", description: "", price: undefined, notes: "" });
      setFormErrors({});
      setCreating(false);
      setCreateSuccess('Item saved successfully');
      fetchList(token, 1);
    } catch (e: any) {
      setError(e?.message || "Create failed");
    } finally {
      setCreatingSubmitting(false);
    }
  };

  const startEdit = (item: Item) => {
    setEditId(item.id);
    setEditForm({ ...item });
  };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };

  const saveEdit = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/items/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        if (res.status === 422 && data && typeof data === 'object' && (data as any).errors) {
          const errs: Record<string, string> = {};
          Object.entries<any>((data as any).errors).forEach(([k, v]) => (errs[k] = Array.isArray(v) ? v.join(' ') : String(v)));
          setEditErrors(errs);
          throw new Error('Please fix the highlighted errors');
        }
        const msg = (data && typeof data === 'object' && 'message' in data) ? (data as any).message : 'Update failed';
        throw new Error(msg);
      }
      setEditErrors({});
      cancelEdit();
      fetchList(token, page?.current_page || 1);
    } catch (e: any) {
      setError(e?.message || "Update failed");
    }
  };

  const remove = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/items/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchList(token, page?.current_page || 1);
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  const openDeleteModal = (item: Item) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <div className="relative mb-8">
              <div className="group rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-[2px] shadow-xl">
                <div className="rounded-3xl bg-white/10 backdrop-blur-xl px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard/admin')} className="transition-all duration-200 bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-inner">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div>
                      <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-pink-100">Photography Items</h1>
                      <p className="text-xs text-indigo-100 mt-1">Manage photography services & packages</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-start">
                    <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-white/40">
                      <input className="bg-transparent placeholder-indigo-200 text-indigo-50 text-sm focus:outline-none w-44" placeholder="Search items..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && token) fetchList(token, 1); }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => token && fetchList(token, 1)} className="actionBtn">Search</button>
                      <button onClick={() => { setQ(''); token && fetchList(token,1); }} className="actionBtn">Reset</button>
                      <button onClick={() => setCreating(true)} className="newBtn flex items-center gap-2"><Plus className="w-4 h-4" /> New Item</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>}

            {creating && (
              <div className="mb-6 p-4 border-2 border-gray-100 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input className="input" placeholder="Item Code *" value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                    {formErrors.code && <p className="mt-1 text-sm text-red-600">{formErrors.code}</p>}
                  </div>
                  <div>
                    <input className="input" placeholder="Item Name *" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                  </div>
                  <div>
                    <input className="input" type="number" step="0.01" placeholder="Price (optional)" value={form.price?.toString() || ""} onChange={(e) => setForm({ ...form, price: e.target.value ? parseFloat(e.target.value) : undefined })} />
                    {formErrors.price && <p className="mt-1 text-sm text-red-600">{formErrors.price}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <textarea className="input" placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    {formErrors.description && <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <textarea className="input" placeholder="Notes / Additional Info" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    {formErrors.notes && <p className="mt-1 text-sm text-red-600">{formErrors.notes}</p>}
                  </div>
                </div>
                <div className="mt-4 flex gap-3 items-center">
                  <button disabled={creatingSubmitting} onClick={createItem} className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save className="w-4 h-4" /> {creatingSubmitting ? 'Saving...' : 'Save'}
                  </button>
                  <button disabled={creatingSubmitting} onClick={() => { setCreating(false); setFormErrors({}); }} className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><X className="w-4 h-4" /> Cancel</button>
                  {createSuccess && <span className="text-sm text-green-600">{createSuccess}</span>}
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-gray-600">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="adminTable" role="table" aria-label="Items table">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 pr-4">Code</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Price</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page?.data?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-4">
                          {editId === item.id ? (
                            <div>
                              <input className="input" value={editForm.code || ""} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} />
                              {editErrors.code && <p className="mt-1 text-sm text-red-600">{editErrors.code}</p>}
                            </div>
                          ) : (
                            <span className="font-medium text-blue-600">{item.code}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {editId === item.id ? (
                            <div>
                              <input className="input" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                              {editErrors.name && <p className="mt-1 text-sm text-red-600">{editErrors.name}</p>}
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium">{item.name}</span>
                              {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {editId === item.id ? (
                            <div>
                              <input className="input" type="number" step="0.01" value={editForm.price?.toString() || ""} onChange={(e) => setEditForm({ ...editForm, price: e.target.value ? parseFloat(e.target.value) : undefined })} />
                              {editErrors.price && <p className="mt-1 text-sm text-red-600">{editErrors.price}</p>}
                            </div>
                          ) : (
                            item.price ? formatCurrency(Number(item.price)) : "-"
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {editId === item.id ? (
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(item.id)} className="btn-primary flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                              <button onClick={cancelEdit} className="btn-secondary flex items-center gap-1"><X className="w-4 h-4" /> Cancel</button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(item)} className="btn-secondary">Edit</button>
                              <button onClick={() => openDeleteModal(item)} className="btn-danger flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex items-center gap-3">
                  <button disabled={(page?.current_page || 1) <= 1} onClick={() => token && fetchList(token, (page!.current_page - 1))} className="btn-secondary">Prev</button>
                  <span className="text-sm text-gray-600">Page {page?.current_page} of {page?.last_page}</span>
                  <button disabled={(page?.current_page || 1) >= (page?.last_page || 1)} onClick={() => token && fetchList(token, (page!.current_page + 1))} className="btn-secondary">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Item</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <span className="font-medium text-gray-900">"{itemToDelete.name}"</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => remove(itemToDelete.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />

      <style jsx global>{`
        .input { width: 100%; padding: 0.5rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.75rem; }
        .input:focus { outline: none; border-color: #6C63FF; }
        .btn-primary { background: #111827; color: white; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .btn-secondary { background: #f3f4f6; color: #111827; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .btn-danger { background: #fee2e2; color: #991b1b; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .actionBtn { background: rgba(255,255,255,0.15); color: #F0F5FF; padding: 0.55rem 0.85rem; border-radius: 0.75rem; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.35); transition: background .2s, transform .2s; }
        .actionBtn:hover { background: rgba(255,255,255,0.25); transform: translateY(-2px); }
        .newBtn { background: linear-gradient(90deg,#0f172a,#1e3a8a); color: #ffffff; padding: 0.55rem 1rem; border-radius: 0.85rem; font-size: 0.75rem; font-weight: 600; box-shadow: 0 4px 12px -2px rgba(30,58,138,0.5); transition: box-shadow .25s, transform .25s; }
        .newBtn:hover { box-shadow: 0 6px 18px -2px rgba(30,58,138,0.6); transform: translateY(-2px); }
      `}</style>
    </main>
  );
}