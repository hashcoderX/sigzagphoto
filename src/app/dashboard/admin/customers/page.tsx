"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, X, ArrowLeft } from "lucide-react";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  whatsapp?: string;
  address?: string;
  nic_or_dl?: string;
  notes?: string;
}

interface Page<T> {
  data: T[];
  current_page: number;
  last_page: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page<Customer> | null>(null);
  const [perPage] = useState(10);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Customer>>({ name: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [creatingSubmitting, setCreatingSubmitting] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  // View customer modal state
  const [viewCustomerModalOpen, setViewCustomerModalOpen] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!t) { router.replace("/login"); return; }
    // Enforce plan gating for business suite
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    setToken(t);
    fetchList(t, 1);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers?${query.toString()}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${t}` },
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        const message = (data && typeof data === 'object' && 'message' in data) ? (data as any).message : 'Failed to load customers';
        throw new Error(message);
      }
      setPage(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async () => {
    if (!token) return;
    setCreateSuccess(null);
    setError(null);
    setFormErrors({});
    if (!form.name || !form.name.trim()) {
      setFormErrors({ name: 'Name is required' });
      return;
    }
    if (creatingSubmitting) return;
    setCreatingSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers`, {
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
      setForm({ name: "" });
      setFormErrors({});
      setCreating(false);
      setCreateSuccess('Customer saved successfully');
      fetchList(token, 1);
    } catch (e: any) {
      setError(e?.message || "Create failed");
    } finally {
      setCreatingSubmitting(false);
    }
  };

  const startEdit = (c: Customer) => {
    setEditId(c.id);
    setEditForm({ ...c });
  };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };

  const saveEdit = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers/${id}`, {
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
    if (!confirm("Delete this customer?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchList(token, page?.current_page || 1);
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  const openViewCustomerModal = async (c: Customer) => {
    if (!token) return;
    try {
      // Fetch full customer details in case list view is partial
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers/${c.id}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        cache: 'no-cache'
      });
      let data: any = null;
      try { data = await res.json(); } catch { data = c; }
      const full = res.ok && data ? data : c;
      setViewCustomer(full);
      setViewCustomerModalOpen(true);
    } catch {
      setViewCustomer(c);
      setViewCustomerModalOpen(true);
    }
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <div className="relative mb-8">
              <div className="group rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-[2px] shadow-xl">
                <div className="rounded-3xl bg-white/10 backdrop-blur-xl px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard/admin')} className="transition-all duration-200 bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-inner">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div>
                      <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-pink-100">Customers</h1>
                      <p className="text-xs text-indigo-100 mt-1">Directory of client profiles & contacts</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-start">
                    <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-white/40">
                      <input className="bg-transparent placeholder-indigo-200 text-indigo-50 text-sm focus:outline-none w-44" placeholder="Search customers..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && token) fetchList(token, 1); }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => token && fetchList(token, 1)} className="actionBtn">Search</button>
                      <button onClick={() => { setQ(''); token && fetchList(token,1); }} className="actionBtn">Reset</button>
                      <button onClick={() => setCreating(true)} className="newBtn flex items-center gap-2"><Plus className="w-4 h-4" /> New Customer</button>
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
                    <input className="input" placeholder="Name *" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                  </div>
                  <div>
                    <input className="input" placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
                  </div>
                  <div>
                    <input className="input" placeholder="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    {formErrors.phone && <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>}
                  </div>
                  <div>
                    <input className="input" placeholder="WhatsApp Number" value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                    {formErrors.whatsapp && <p className="mt-1 text-sm text-red-600">{formErrors.whatsapp}</p>}
                  </div>
                  <div>
                    <input className="input" placeholder="Company" value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                    {formErrors.company && <p className="mt-1 text-sm text-red-600">{formErrors.company}</p>}
                  </div>
                  <div>
                    <input className="input" placeholder="NIC or Driving License" value={form.nic_or_dl || ""} onChange={(e) => setForm({ ...form, nic_or_dl: e.target.value })} />
                    {formErrors.nic_or_dl && <p className="mt-1 text-sm text-red-600">{formErrors.nic_or_dl}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <textarea className="input" placeholder="Address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    {formErrors.address && <p className="mt-1 text-sm text-red-600">{formErrors.address}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <textarea className="input" placeholder="Notes / Additional Info" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    {formErrors.notes && <p className="mt-1 text-sm text-red-600">{formErrors.notes}</p>}
                  </div>
                </div>
                <div className="mt-4 flex gap-3 items-center">
                  <button disabled={creatingSubmitting} onClick={createCustomer} className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
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
                <table className="adminTable" role="table" aria-label="Customers table">
                  <thead>
                        <tr className="text-left">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Phone</th>
                      <th className="py-2 pr-4">WhatsApp</th>
                      <th className="py-2 pr-4">Company</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page?.data?.map((c) => (
                      <tr key={c.id} onClick={() => openViewCustomerModal(c)} className="cursor-pointer hover:bg-gray-50">
                        <td className="py-2 pr-4">
                          {editId === c.id ? (
                            <div>
                              <input className="input" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                              {editErrors.name && <p className="mt-1 text-sm text-red-600">{editErrors.name}</p>}
                            </div>
                          ) : (
                            <span className="font-medium">{c.name}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {editId === c.id ? (
                            <div>
                              <input className="input" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                              {editErrors.email && <p className="mt-1 text-sm text-red-600">{editErrors.email}</p>}
                            </div>
                          ) : (
                            c.email || "-"
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {editId === c.id ? (
                            <div>
                              <input className="input" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                              {editErrors.phone && <p className="mt-1 text-sm text-red-600">{editErrors.phone}</p>}
                            </div>
                          ) : (
                            c.phone || "-"
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {editId === c.id ? (
                            <div>
                              <input className="input" value={editForm.whatsapp || ""} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} />
                              {editErrors.whatsapp && <p className="mt-1 text-sm text-red-600">{editErrors.whatsapp}</p>}
                            </div>
                          ) : (
                            c.whatsapp || "-"
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {editId === c.id ? (
                            <div>
                              <input className="input" value={editForm.company || ""} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
                              {editErrors.company && <p className="mt-1 text-sm text-red-600">{editErrors.company}</p>}
                            </div>
                          ) : (
                            c.company || "-"
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {editId === c.id ? (
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(c.id)} className="btn-primary flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                              <button onClick={cancelEdit} className="btn-secondary flex items-center gap-1"><X className="w-4 h-4" /> Cancel</button>
                            </div>
                          ) : (
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => startEdit(c)} className="btn-secondary">Edit</button>
                              <button onClick={() => remove(c.id)} className="btn-danger flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
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
          </motion.div>
        </div>
      </section>
      <Footer />

      {/* View Customer Modal */}
      {viewCustomerModalOpen && viewCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setViewCustomerModalOpen(false); setViewCustomer(null); }} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">👤</div>
                <div>
                  <h3 className="text-xl font-bold">Customer Details</h3>
                  <p className="text-indigo-100 text-xs">Profile overview</p>
                </div>
              </div>
              <button onClick={() => { setViewCustomerModalOpen(false); setViewCustomer(null); }} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Name</div>
                  <div className="text-base font-semibold text-gray-900">{viewCustomer.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Company</div>
                  <div className="text-base font-semibold text-gray-900">{viewCustomer.company || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="text-base font-semibold text-gray-900">{viewCustomer.email || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Phone</div>
                  <div className="text-base font-semibold text-gray-900">{viewCustomer.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">WhatsApp</div>
                  <div className="text-base font-semibold text-gray-900">{viewCustomer.whatsapp || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">NIC / Driving License</div>
                  <div className="text-base font-semibold text-gray-900">{viewCustomer.nic_or_dl || '-'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-gray-500">Address</div>
                  <div className="text-base font-semibold text-gray-900">{viewCustomer.address || '-'}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm text-gray-500">Notes</div>
                  <div className="text-base font-semibold text-gray-900 whitespace-pre-line">{viewCustomer.notes || '-'}</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => { setViewCustomerModalOpen(false); setViewCustomer(null); }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

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
