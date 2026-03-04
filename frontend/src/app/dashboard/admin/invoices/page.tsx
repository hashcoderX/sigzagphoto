"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Trash2, Save, X } from "lucide-react";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Customer { id: number; name: string; }
interface Booking { id: number; customer_id: number; location?: string | null; }
interface JobCardLite { id: number; booking_id: number; confirmed_amount?: number | string | null; booking?: Booking }
interface Invoice {
  id: number;
  number: string;
  customer_id: number;
  booking_id?: number | null;
  amount: number;
  status: string;
  issued_at?: string | null;
  due_at?: string | null;
  discount?: number | null;
  advance_payment?: number | null;
  due_amount?: number | null;
}
type LineItem = { service: string; qty: number; amount: number; subamount: number };
interface Page<T> { data: T[]; current_page: number; last_page: number; }

export default function InvoicesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page<Invoice> | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [jobCards, setJobCards] = useState<JobCardLite[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Invoice>>({ status: 'draft' });
  const [selectedJobCardId, setSelectedJobCardId] = useState<number | ''>('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Invoice>>({});
  const [userCurrency, setUserCurrency] = useState<string>('USD');
  const [discount, setDiscount] = useState<string>('');
  const [advancePayment, setAdvancePayment] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Line items state
  const [items, setItems] = useState<LineItem[]>([]);
  const [lineService, setLineService] = useState<string>('');
  const [lineQty, setLineQty] = useState<string>('');
  const [lineAmount, setLineAmount] = useState<string>('');
  const [lineError, setLineError] = useState<string | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!t) { router.replace('/login'); return; }
    // Enforce plan gating for business suite
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    setToken(t);
    fetchList(t, 1);
    fetchCustomers(t);
    fetchBookings(t);
    fetchJobCards(t);
    fetchProfile(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCustomers = async (t: string) => { try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); setCustomers(data.data || []); } catch {} };
  const fetchBookings = async (t: string) => { try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); setBookings(data.data || []); } catch {} };
  const fetchJobCards = async (t: string) => { try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); setJobCards(data.data || []); } catch {} };
  const fetchList = async (t: string, p: number) => { setLoading(true); setError(null); try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoices?per_page=10&page=${p}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) throw new Error('Failed to load invoices'); const data = await res.json(); setPage(data); } catch (e: any) { setError(e?.message || 'Failed to load invoices'); } finally { setLoading(false); } };
  const fetchProfile = async (t: string) => { try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); if (data?.currency) setUserCurrency(data.currency); } catch {} };

  const formatCurrency = (value: number): string => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: userCurrency }).format(value);
    } catch {
      return `${userCurrency} ${value.toFixed(2)}`;
    }
  };

  // Auto-set invoice amount to (items total - discount)
  const itemsSubtotal = items.reduce((s, it) => s + it.subamount, 0);
  const discountValue = (() => { const n = Number(discount); return Number.isFinite(n) && n >= 0 ? n : 0; })();
  const finalAmount = +(Math.max(0, itemsSubtotal - discountValue)).toFixed(2);

  useEffect(() => {
    // Only adjust during create flow; editing existing invoices keeps manual control
    if (creating) {
      setForm(prev => ({ ...prev, amount: finalAmount }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSubtotal, discount, creating]);

    const createItem = async () => {
    if (!token) return;
    setError(null); setSuccessMessage(null);
    const advance = Number(advancePayment); const advanceVal = Number.isFinite(advance) && advance >= 0 ? +advance.toFixed(2) : 0;
    const discountVal = Number.isFinite(Number(discount)) && Number(discount) >= 0 ? +Number(discount).toFixed(2) : 0;
    const payload: any = {
      ...form,
      amount: finalAmount,
      discount: discountVal || undefined,
      advance_payment: advanceVal || undefined,
      items: items.map(it => ({ service: it.service, qty: it.qty, amount: it.amount, subamount: it.subamount }))
    };
    // due_amount is server-derived (amount - advance) but can send for clarity
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Create failed');
      setCreating(false);
      setForm({ status: 'draft' });
      setItems([]); setDiscount(''); setAdvancePayment(''); setSelectedJobCardId('');
      fetchList(token, 1);
      setSuccessMessage(`Invoice ${data.number} created successfully.`);
      // Auto-download PDF
      try {
        const pdfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoices/${data.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `${data.number || 'invoice'}.pdf`;
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        }
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Create failed');
    }
  };
  const startEdit = (it: Invoice) => { setEditId(it.id); setEditForm({ ...it }); };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };
  const saveEdit = async (id: number) => { if (!token) return; try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(editForm) }); const data = await res.json(); if (!res.ok) throw new Error(data?.message || 'Update failed'); cancelEdit(); fetchList(token, page?.current_page || 1); } catch (e: any) { setError(e?.message || 'Update failed'); } };
  const remove = async (id: number) => { if (!token) return; if (!confirm('Delete this invoice?')) return; try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoices/${id}`, { method: 'DELETE', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }); if (!res.ok) throw new Error('Delete failed'); fetchList(token, page?.current_page || 1); } catch (e: any) { setError(e?.message || 'Delete failed'); } };

  const addLineItem = () => {
    setLineError(null);
    const svc = lineService.trim();
    const qty = Number(lineQty);
    const amt = Number(lineAmount);
    if (!svc) { setLineError('Service is required'); return; }
    if (!Number.isFinite(qty) || qty <= 0) { setLineError('Qty must be a positive number'); return; }
    if (!Number.isFinite(amt) || amt < 0) { setLineError('Amount must be 0 or more'); return; }
    const sub = +(amt * qty).toFixed(2);
    const item: LineItem = { service: svc, qty, amount: +amt.toFixed(2), subamount: sub };
    setItems(prev => [...prev, item]);
    // clear inputs
    setLineService(''); setLineQty(''); setLineAmount('');
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <AdminSectionHeader
              title="Invoices"
              subtitle="Generate and track billing documents"
            />
            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>}
            {/* Creation form removed */}
            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>}
            {successMessage && <div className="mb-4 bg-green-50 border-2 border-green-200 text-green-800 px-6 py-3 rounded-xl">{successMessage}</div>}

            {loading ? <p className="text-gray-600">Loading...</p> : (
              <div className="overflow-x-auto">
                <table className="adminTable" role="table" aria-label="Invoices table">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">Number</th>
                      <th className="py-2 pr-4">Customer</th>
                      <th className="py-2 pr-4">Issued</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page?.data?.map(it => (
                      <tr key={it.id}>
                        <td className="py-2 pr-4">{editId === it.id ? (
                          <input className="input" value={editForm.number || it.number} onChange={(e) => setEditForm({ ...editForm, number: e.target.value })} />
                        ) : it.number}</td>
                        <td className="py-2 pr-4">{customers.find(c => c.id === it.customer_id)?.name || `#${it.customer_id}`}</td>
                        <td className="py-2 pr-4">{it.issued_at ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(it.issued_at)) : '-'}</td>
                        <td className="py-2 pr-4">{formatCurrency(Number(it.amount))}</td>
                        <td className="py-2 pr-4">{editId === it.id ? (
                          <select className="input" value={editForm.status || it.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                          </select>
                        ) : it.status}</td>
                        <td className="py-2 pr-4">
                          {editId === it.id ? (
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(it.id)} className="btn-primary flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                              <button onClick={cancelEdit} className="btn-secondary flex items-center gap-1"><X className="w-4 h-4" /> Cancel</button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(it)} className="btn-secondary">Edit</button>
                              <button onClick={() => remove(it.id)} className="btn-danger flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
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
      <style jsx global>{`
        .input { width: 100%; padding: 0.5rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.75rem; }
        .input:focus { outline: none; border-color: #6C63FF; }
        .btn-primary { background: #111827; color: white; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .btn-secondary { background: #f3f4f6; color: #111827; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .btn-danger { background: #fee2e2; color: #991b1b; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .newBtn { background: linear-gradient(90deg,#0f172a,#1e3a8a); color: #ffffff; padding: 0.55rem 1rem; border-radius: 0.85rem; font-size: 0.75rem; font-weight: 600; box-shadow: 0 4px 12px -2px rgba(30,58,138,0.5); transition: box-shadow .25s, transform .25s; }
        .newBtn:hover { box-shadow: 0 6px 18px -2px rgba(30,58,138,0.6); transform: translateY(-2px); }
      `}</style>
    </main>
  );
}
