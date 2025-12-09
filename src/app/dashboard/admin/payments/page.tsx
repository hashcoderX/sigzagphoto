"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, X, ArrowLeft, DollarSign, CalendarDays } from "lucide-react";
import dynamic from "next/dynamic";
const ChartLine: any = dynamic(() => import('@/components/ChartLine'), { ssr: false });
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Customer { id: number; name: string; }
interface Booking { id: number; }
interface JobCard { id: number; title: string }
interface Payment { id: number; customer_id: number; booking_id?: number | null; amount: number; currency: string; method?: string; status: string; paid_at?: string | null; customer?: Customer; booking?: Booking; payment_type?: string }
interface Page<T> { data: T[]; current_page: number; last_page: number; }
interface PaymentsSummary { today_total: number; month_total: number; currency?: string }

export default function PaymentsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page<Payment> | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [series, setSeries] = useState<{ labels: string[]; data: number[]; currency?: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Payment>>({ currency: 'USD', status: 'pending' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Payment>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<number | "">("");
  const [jobCardFilter, setJobCardFilter] = useState<number | "">("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("");

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
    fetchSummary(t);
    fetchTimeseries(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCustomers = async (t: string) => {
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); setCustomers(data.data || []); } catch {}
  };
  const fetchBookings = async (t: string) => {
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); setBookings(data.data || []); } catch {}
  };
  const fetchList = async (t: string, p: number) => {
    setLoading(true); setError(null);
    try {
      const query = new URLSearchParams({ per_page: '10', page: String(p) });
      if (q) query.set('q', q);
      if (statusFilter) query.set('status', statusFilter);
      if (customerFilter) query.set('customer_id', String(customerFilter));
      if (jobCardFilter) query.set('job_card_id', String(jobCardFilter));
      if (paymentTypeFilter) query.set('payment_type', paymentTypeFilter);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments?${query.toString()}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) throw new Error('Failed to load payments'); const data = await res.json(); setPage(data);
    }
    catch (e: any) { setError(e?.message || 'Failed to load payments'); } finally { setLoading(false); }
  };
  const fetchJobCards = async (t: string) => {
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); const list = (data.data || []).map((j: any) => ({ id: j.id, title: j.title })); setJobCards(list); } catch {}
  };
  const fetchSummary = async (t: string) => {
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments/summary`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); setSummary(data); } catch {}
  };
  const fetchTimeseries = async (t: string) => {
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments/timeseries`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); setSeries(data); } catch {}
  };

  const createItem = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      const data = await res.json(); if (!res.ok) { if (res.status === 422 && data?.errors) { const errs: Record<string, string> = {}; Object.entries<any>(data.errors).forEach(([k, v]) => errs[k] = Array.isArray(v) ? v.join(' ') : String(v)); setFormErrors(errs); throw new Error('Please fix the highlighted errors'); } throw new Error(data?.message || 'Create failed'); } setCreating(false); setFormErrors({}); setForm({ currency: 'USD', status: 'pending' }); fetchList(token, 1);
    } catch (e: any) { setError(e?.message || 'Create failed'); }
  };

  const startEdit = (it: Payment) => { setEditId(it.id); setEditForm({ ...it }); };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };
  const saveEdit = async (id: number) => {
    if (!token) return; try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(editForm) }); const data = await res.json(); if (!res.ok) throw new Error(data?.message || 'Update failed'); cancelEdit(); fetchList(token, page?.current_page || 1); } catch (e: any) { setError(e?.message || 'Update failed'); }
  };
  const remove = async (id: number) => {
    if (!token) return; if (!confirm('Delete this payment?')) return; try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments/${id}`, { method: 'DELETE', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }); if (!res.ok) throw new Error('Delete failed'); fetchList(token, page?.current_page || 1); } catch (e: any) { setError(e?.message || 'Delete failed'); }
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
                      <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-pink-100">Payments</h1>
                      <p className="text-xs text-indigo-100 mt-1">Track, filter and manage all payment activity</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-start">
                    <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-white/40">
                      <input className="bg-transparent placeholder-indigo-200 text-indigo-50 text-sm focus:outline-none w-40" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && token) fetchList(token, 1); }} />
                    </div>
                    <select className="filterSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                    </select>
                    <select className="filterSelect" value={customerFilter || ''} onChange={(e) => setCustomerFilter(e.target.value ? Number(e.target.value) : '')}>
                      <option value="">All Customers</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="filterSelect" value={jobCardFilter || ''} onChange={(e) => setJobCardFilter(e.target.value ? Number(e.target.value) : '')}>
                      <option value="">All Job Cards</option>
                      {jobCards.map(j => <option key={j.id} value={j.id}>#{j.id} {j.title}</option>)}
                    </select>
                    <select className="filterSelect" value={paymentTypeFilter} onChange={(e) => setPaymentTypeFilter(e.target.value)}>
                      <option value="">All Types</option>
                      <option value="advance">Advance</option>
                      <option value="transport">Transport</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={() => token && fetchList(token, 1)} className="actionBtn">Apply</button>
                      <button onClick={() => { setQ(''); setStatusFilter(''); setCustomerFilter(''); setJobCardFilter(''); setPaymentTypeFilter(''); token && fetchList(token, 1); }} className="actionBtn">Reset</button>
                      <button onClick={() => setCreating(true)} className="newBtn flex items-center gap-2"><Plus className="w-4 h-4" /> New Payment</button>
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
                  <select className="input" value={form.customer_id || ''} onChange={(e) => setForm({ ...form, customer_id: Number(e.target.value) })}>
                    <option value="">Select customer *</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {formErrors.customer_id && <p className="mt-1 text-sm text-red-600">{formErrors.customer_id}</p>}
                  </div>
                  <select className="input" value={form.booking_id || ''} onChange={(e) => setForm({ ...form, booking_id: e.target.value ? Number(e.target.value) : undefined })}>
                    <option value="">(Optional) Booking</option>
                    {bookings.map(b => <option key={b.id} value={b.id}>#{b.id}</option>)}
                  </select>
                  <div>
                    <input type="number" step="0.01" className="input" placeholder="Amount" value={form.amount?.toString() || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
                    {formErrors.amount && <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>}
                  </div>
                  <input className="input" placeholder="Currency (e.g., USD)" value={form.currency || 'USD'} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
                  <input className="input" placeholder="Method" value={form.method || ''} onChange={(e) => setForm({ ...form, method: e.target.value })} />
                  <select className="input" value={form.status || 'pending'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                  <input type="datetime-local" step="1" className="input md:col-span-2" value={form.paid_at || ''} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} />
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={createItem} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
                  <button onClick={() => setCreating(false)} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                </div>
              </div>
            )}

            {loading ? <p className="text-gray-600">Loading...</p> : (
              <div className="overflow-x-auto">
                <table className="adminTable" role="table" aria-label="Payments table">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">Customer</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Paid At</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page?.data?.map(p => (
                      <tr key={p.id}>
                        <td className="py-2 pr-4">{p.customer?.name || `#${p.customer_id}`}</td>
                        <td className="py-2 pr-4">{p.currency} {Number(p.amount).toFixed(2)}</td>
                        <td className="py-2 pr-4">{p.payment_type ? p.payment_type.charAt(0).toUpperCase() + p.payment_type.slice(1) : '-'}</td>
                        <td className="py-2 pr-4">{editId === p.id ? (
                          <select className="input" value={editForm.status || p.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                          </select>
                        ) : p.status}</td>
                        <td className="py-2 pr-4">{p.paid_at ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(p.paid_at)) : '-'}</td>
                        <td className="py-2 pr-4">
                          {editId === p.id ? (
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(p.id)} className="btn-primary flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                              <button onClick={cancelEdit} className="btn-secondary flex items-center gap-1"><X className="w-4 h-4" /> Cancel</button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(p)} className="btn-secondary">Edit</button>
                              <button onClick={async () => {
                                if (!token) return; try { const pdfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments/${p.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } }); if (!pdfRes.ok) throw new Error('Failed to load receipt'); const blob = await pdfRes.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `payment-${p.id}.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); } catch (e) { setError((e as any)?.message || 'Failed to download receipt'); }
                              }} className="btn-secondary">View Receipt</button>
                              <button onClick={() => remove(p.id)} className="btn-danger flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
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
                {summary && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {/* Today card */}
                    <div className="group rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-[2px] shadow-xl hover:shadow-2xl transition-all duration-300">
                      <div className="rounded-2xl bg-white/90 backdrop-blur px-5 py-4 flex items-center gap-4">
                        <div className="shrink-0 rounded-xl p-2 bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 ring-1 ring-indigo-200">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-indigo-700 tracking-wide">Today's Payments</div>
                          <div className="mt-0.5 text-2xl font-extrabold text-slate-900">
                            {(summary.currency || 'USD')} {Number(summary.today_total || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Month card */}
                    <div className="group rounded-2xl bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 p-[2px] shadow-xl hover:shadow-2xl transition-all duration-300">
                      <div className="rounded-2xl bg-white/90 backdrop-blur px-5 py-4 flex items-center gap-4">
                        <div className="shrink-0 rounded-xl p-2 bg-gradient-to-br from-pink-50 to-pink-100 text-pink-700 ring-1 ring-pink-200">
                          <CalendarDays className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-pink-700 tracking-wide">This Month's Payments</div>
                          <div className="mt-0.5 text-2xl font-extrabold text-slate-900">
                            {(summary.currency || 'USD')} {Number(summary.month_total || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {series && (
                  <div className="mt-6">
                    <div className="group rounded-3xl bg-gradient-to-r from-slate-200 via-white to-slate-200 p-[2px] shadow-xl">
                      <div className="rounded-3xl bg-white/90 backdrop-blur px-4 py-4">
                        <div className="text-xs font-semibold text-slate-600 mb-2">Payments Trend (Last 30 days)</div>
                        <div className="w-full h-[220px] md:h-[300px] overflow-hidden">
                          <ChartLine
                            data={{
                              labels: series.labels.map(d => new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' }).format(new Date(d))),
                              datasets: [{
                                label: `Payments (${series.currency || 'USD'})`,
                                data: series.data,
                                borderColor: 'rgba(99,102,241,1)',
                                backgroundColor: (context: any) => {
                                  const chart = context.chart;
                                  const { ctx, chartArea } = chart || {};
                                  if (!ctx || !chartArea) {
                                    return 'rgba(99,102,241,0.15)';
                                  }
                                  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                                  g.addColorStop(0, 'rgba(99,102,241,0.35)');
                                  g.addColorStop(1, 'rgba(99,102,241,0.02)');
                                  return g;
                                },
                                tension: 0.35,
                                fill: true,
                                pointRadius: 2.5,
                                pointHoverRadius: 4,
                                pointBackgroundColor: '#ffffff',
                                pointBorderColor: 'rgba(99,102,241,1)',
                                borderWidth: 2.5,
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              interaction: { mode: 'index' as const, intersect: false },
                              animation: { duration: 900, easing: 'easeOutQuart' },
                              plugins: {
                                legend: { display: false },
                                tooltip: {
                                  enabled: true,
                                  backgroundColor: '#111827',
                                  borderColor: 'rgba(255,255,255,0.15)',
                                  borderWidth: 1,
                                  titleColor: '#e5e7eb',
                                  bodyColor: '#f3f4f6',
                                  padding: 10,
                                  callbacks: {
                                    label: (tt: any) => {
                                      const cur = series.currency || 'USD';
                                      const v = typeof tt.parsed.y === 'number' ? tt.parsed.y : Number(tt.parsed.y || 0);
                                      return `${cur} ${v.toFixed(2)}`;
                                    }
                                  }
                                }
                              },
                              scales: {
                                x: {
                                  grid: { display: false },
                                  ticks: { color: '#6b7280', maxTicksLimit: 7 }
                                },
                                y: {
                                  beginAtZero: true,
                                  grid: { color: 'rgba(17,24,39,0.06)' },
                                  ticks: {
                                    color: '#6b7280',
                                    callback: (val: any) => `${series.currency || 'USD'} ${Number(val).toFixed(0)}`
                                  }
                                }
                              },
                              elements: { line: { borderJoinStyle: 'round' }, point: { hitRadius: 8 } }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
        .filterSelect { background: rgba(255,255,255,0.15); color: #F0F5FF; font-size: 0.75rem; padding: 0.55rem 0.7rem; border-radius: 0.75rem; border: 1px solid rgba(255,255,255,0.3); backdrop-filter: blur(4px); }
        .filterSelect option { color: #111827; }
        .filterSelect:focus { outline: none; box-shadow: 0 0 0 2px rgba(255,255,255,0.5); }
        .actionBtn { background: rgba(255,255,255,0.15); color: #F0F5FF; padding: 0.55rem 0.85rem; border-radius: 0.75rem; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.35); transition: background .2s, transform .2s; }
        .actionBtn:hover { background: rgba(255,255,255,0.25); transform: translateY(-2px); }
        .newBtn { background: linear-gradient(90deg,#0f172a,#1e3a8a); color: #ffffff; padding: 0.55rem 1rem; border-radius: 0.85rem; font-size: 0.75rem; font-weight: 600; box-shadow: 0 4px 12px -2px rgba(30,58,138,0.5); transition: box-shadow .25s, transform .25s; }
        .newBtn:hover { box-shadow: 0 6px 18px -2px rgba(30,58,138,0.6); transform: translateY(-2px); }
      `}</style>
    </main>
  );
}
