"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, X } from "lucide-react";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Booking { id: number; customer_id: number; location?: string | null; event_date?: string; customer?: { id: number; name: string }; }
interface JobCardItem { id?: number; service: string; qty: number; amount: number; sub_amount?: number; subamount?: number }
interface JobCard { id: number; booking_id: number; title: string; description?: string; status: string; assigned_to?: string; due_date?: string | null; confirmed_amount?: number | string | null; advance_payment?: number | string | null; discount?: number | string | null; booking?: Booking; items?: JobCardItem[] }
type LineItem = { service: string; qty: number; amount: number; subamount: number };
interface Page<T> { data: T[]; current_page: number; last_page: number; }

export default function JobCardsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page<JobCard> | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<JobCard>>({ status: 'open' });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<JobCard>>({});
  const [editItems, setEditItems] = useState<JobCardItem[]>([]);
  const [editDiscount, setEditDiscount] = useState<string>('');
  const [editLineService, setEditLineService] = useState('');
  const [editLineQty, setEditLineQty] = useState('');
  const [editLineAmount, setEditLineAmount] = useState('');
  const [editLineError, setEditLineError] = useState<string | null>(null);
  // Items & currency state
  const [items, setItems] = useState<LineItem[]>([]);
  const [lineService, setLineService] = useState<string>('');
  const [lineQty, setLineQty] = useState<string>('');
  const [lineAmount, setLineAmount] = useState<string>('');
  const [lineError, setLineError] = useState<string | null>(null);
  const [userCurrency, setUserCurrency] = useState<string>('USD');
  const [discount, setDiscount] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Advance collection modal state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceTarget, setAdvanceTarget] = useState<JobCard | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advanceMethod, setAdvanceMethod] = useState<string>('cash');
  const [advanceReference, setAdvanceReference] = useState<string>('');
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  // Invoice modal state for In Progress
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceTarget, setInvoiceTarget] = useState<JobCard | null>(null);
  const [invoiceCollect, setInvoiceCollect] = useState<string>('');
  const [invoiceDue, setInvoiceDue] = useState<number>(0);
  const [invoiceRemaining, setInvoiceRemaining] = useState<number>(0);
  const [invoiceMethod, setInvoiceMethod] = useState<string>('cash');
  const [invoiceReference, setInvoiceReference] = useState<string>('');
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [tempDue, setTempDue] = useState<Record<number, number>>({});

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!t) { router.replace('/login'); return; }
    // Enforce plan gating for business suite
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    setToken(t);
    fetchList(t, 1);
    fetchBookings(t);
    fetchProfile(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBookings = async (t: string) => {
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); setBookings(data.data || []); } catch {}
  };
  const fetchList = async (t: string, p: number) => {
    setLoading(true); setError(null);
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards?per_page=10&page=${p}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) throw new Error('Failed to load job cards'); const data = await res.json(); setPage(data); }
    catch (e: any) { setError(e?.message || 'Failed to load job cards'); } finally { setLoading(false); }
  };
  const fetchProfile = async (t: string) => {
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); if (data?.currency) setUserCurrency(data.currency); } catch {}
  };

  const formatCurrency = (value: number): string => {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: userCurrency }).format(value); }
    catch { return `${userCurrency} ${value.toFixed(2)}`; }
  };

  // Derived totals
  const itemsSubtotal = items.reduce((s, it) => s + it.subamount, 0);
  const discountNum = (() => { const n = Number(discount); return Number.isFinite(n) && n > 0 ? +n.toFixed(2) : 0; })();
  const finalAmount = Math.max(0, +(itemsSubtotal - discountNum).toFixed(2));

  // Note: We no longer auto-sync confirmed_amount; user can set advance payment separately.

  const addLineItem = () => {
    setLineError(null);
    const svc = lineService.trim();
    const qty = Number(lineQty);
    const amt = Number(lineAmount);
    if (!svc) { setLineError('Item is required'); return; }
    if (!Number.isFinite(qty) || qty <= 0) { setLineError('Qty must be a positive number'); return; }
    if (!Number.isFinite(amt) || amt < 0) { setLineError('Amount must be 0 or more'); return; }
    const sub = +(amt * qty).toFixed(2);
    const item: LineItem = { service: svc, qty, amount: +amt.toFixed(2), subamount: sub };
    setItems(prev => [...prev, item]);
    setLineService(''); setLineQty(''); setLineAmount('');
  };

  const createItem = async () => {
    if (!token) return;
    setError(null); setSuccessMessage(null);
    try {
      const payload: any = {
        ...form,
        discount: (discount && Number(discount) >= 0) ? Number(discount) : undefined,
        items: items.map(it => ({ service: it.service, qty: it.qty, amount: it.amount, subamount: it.subamount })),
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Create failed');
      setCreating(false);
      setForm({ status: 'open' });
      setItems([]); setLineService(''); setLineQty(''); setLineAmount(''); setDiscount('');
      fetchList(token, 1);
      setSuccessMessage('Job card created successfully.');
      // Auto-download Job Card PDF after create
      try {
        if (data?.id) {
          const pdfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${data.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
          if (pdfRes.ok) {
            const blob = await pdfRes.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `job-card-${data.id}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
          }
        }
      } catch {}
    }
    catch (e: any) { setError(e?.message || 'Create failed'); }
  };

  const startEdit = (it: JobCard) => {
    setEditId(it.id);
    setEditForm({ ...it });
    // Initialize editable items list
    const mapped = (it.items || []).map(item => ({
      id: item.id,
      service: item.service,
      qty: Number(item.qty),
      amount: Number(item.amount),
      sub_amount: Number(item.sub_amount ?? item.subamount ?? (Number(item.amount) * Number(item.qty))),
      subamount: Number(item.sub_amount ?? item.subamount ?? (Number(item.amount) * Number(item.qty)))
    }));
    setEditItems(mapped);
    setEditDiscount(it.discount ? String(it.discount) : '');
  };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };
  const saveEdit = async (id: number) => {
    if (!token) return;
    setError(null); setSuccessMessage(null);
    try {
      // Prepare items payload
      const preparedItems = editItems.map(it => ({
        service: it.service,
        qty: it.qty,
        amount: Number(it.amount),
        subamount: Number((it.sub_amount ?? it.subamount ?? (it.amount * it.qty)).toFixed(2))
      }));
      const payload: any = { ...editForm };
      payload.items = preparedItems;
      payload.discount = editDiscount !== '' ? Number(editDiscount) : undefined;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Update failed');
      cancelEdit();
      fetchList(token, page?.current_page || 1);
      setSuccessMessage('Job card updated successfully.');
    } catch (e: any) { setError(e?.message || 'Update failed'); }
  };
    const addEditLineItem = () => {
      setEditLineError(null);
      const svc = editLineService.trim();
      const qty = Number(editLineQty);
      const amt = Number(editLineAmount);
      if (!svc) { setEditLineError('Item is required'); return; }
      if (!Number.isFinite(qty) || qty <= 0) { setEditLineError('Qty must be positive'); return; }
      if (!Number.isFinite(amt) || amt < 0) { setEditLineError('Amount must be >= 0'); return; }
      const sub = +(amt * qty).toFixed(2);
      setEditItems(prev => [...prev, { service: svc, qty, amount: +amt.toFixed(2), sub_amount: sub, subamount: sub }]);
      setEditLineService(''); setEditLineQty(''); setEditLineAmount('');
    };

    const removeEditItem = (idx: number) => {
      setEditItems(prev => prev.filter((_, i) => i !== idx));
    };

    const editItemsSubtotal = editItems.reduce((s, it) => s + Number(it.sub_amount ?? it.subamount ?? (it.amount * it.qty)), 0);
    const editDiscountNum = (() => { const n = Number(editDiscount); return Number.isFinite(n) && n > 0 ? +n.toFixed(2) : 0; })();
    const editFinalAmount = Math.max(0, +(editItemsSubtotal - editDiscountNum).toFixed(2));
    const editAdvance = Number(editForm.advance_payment ?? 0);
    const editDueAmount = Math.max(0, editFinalAmount - editAdvance);
  const remove = async (id: number) => { if (!token) return; if (!confirm('Delete this job card?')) return; try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${id}`, { method: 'DELETE', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }); if (!res.ok) throw new Error('Delete failed'); fetchList(token, page?.current_page || 1); setSuccessMessage('Job card deleted.'); } catch (e: any) { setError(e?.message || 'Delete failed'); } };

  const collectAdvance = async (it: JobCard) => {
    if (!token) return;
    const amtStr = window.prompt('Enter advance amount to collect:', '0.00');
    if (amtStr === null) return;
    const amount = Number(amtStr);
    if (!Number.isFinite(amount) || amount <= 0) { setError('Amount must be a positive number'); return; }
    const method = window.prompt('Payment method (e.g., cash, card, bank):', 'cash') || 'cash';
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_id: it.booking?.customer?.id || it.booking?.customer_id || 0,
          booking_id: it.booking?.id || it.booking_id,
          job_card_id: it.id,
          amount,
          method,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to record payment');
      setSuccessMessage('Advance payment recorded.');
      if (token) fetchList(token, page?.current_page || 1);
      // Download payment receipt PDF
      try {
        const pdfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments/${data.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `payment-${data.id}.pdf`;
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        }
      } catch {}
    } catch (e: any) { setError(e?.message || 'Failed to record payment'); }
  };

  const viewJobCardPdf = async (it: JobCard) => {
    if (!token) return;
    try {
      const pdfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${it.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!pdfRes.ok) throw new Error('Failed to load job card PDF');
      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      // Try to open in new tab for viewing; fallback to download
      const opened = window.open(url, '_blank');
      if (!opened) {
        const a = document.createElement('a');
        a.href = url; a.download = `job-card-${it.id}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e: any) {
      setError(e?.message || 'Could not open Job Card PDF');
    }
  };

  const openAdvanceModal = (it: JobCard) => {
    // Only allow if current advance is zero
    const adv = Number((it as any).advance_payment ?? 0);
    if (adv > 0) return; // hidden in UI, but double guard
    setAdvanceTarget(it);
    const c = Number((it as any).confirmed_amount ?? 0);
    const due = Math.max(0, c - adv);
    setAdvanceAmount(due > 0 ? due.toFixed(2) : '0.00');
    setAdvanceMethod('cash');
    setAdvanceReference('');
    setAdvanceError(null);
    setShowAdvanceModal(true);
  };

  const submitAdvance = async () => {
    if (!token || !advanceTarget) return;
    setAdvanceError(null);
    const amount = Number(advanceAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setAdvanceError('Amount must be a positive number'); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_id: (advanceTarget as any).booking?.customer?.id || (advanceTarget as any).booking?.customer_id || 0,
          booking_id: (advanceTarget as any).booking?.id || advanceTarget.booking_id,
          job_card_id: advanceTarget.id,
          amount,
          currency: userCurrency,
          method: advanceMethod || 'cash',
          reference: advanceReference || undefined,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to record advance');
      setShowAdvanceModal(false);
      setAdvanceTarget(null);
      setSuccessMessage('Advance payment recorded.');
      if (token) fetchList(token, page?.current_page || 1);
      // Download receipt PDF
      try {
        const pdfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments/${data.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
        if (pdfRes.ok) {
          const blob = await pdfRes.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `payment-${data.id}.pdf`;
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(url);
        }
      } catch {}
    } catch (e: any) {
      setAdvanceError(e?.message || 'Failed to record advance');
    }
  };

  const openInvoiceModal = (it: JobCard) => {
    setInvoiceTarget(it);
    const final = Number((it as any).confirmed_amount ?? 0);
    const totalPaidRaw = typeof (it as any).total_paid === 'number' ? Number((it as any).total_paid) : null;
    const adv = Number((it as any).advance_payment ?? 0);
    const totalPaid = totalPaidRaw !== null && Number.isFinite(totalPaidRaw) ? totalPaidRaw : adv;
    const due = Math.max(0, final - totalPaid);
    if (due <= 0) {
      setSuccessMessage('No due remaining for this job card.');
      setInvoiceTarget(null);
      return;
    }
    setInvoiceDue(due);
    // Default collect to full remaining due, but user can lower it.
    setInvoiceCollect(due.toFixed(2));
    setInvoiceRemaining(0);
    setInvoiceMethod('cash');
    setInvoiceReference('');
    setInvoiceError(null);
    setShowInvoiceModal(true);
  };

  const submitInvoice = async () => {
    if (!token || !invoiceTarget) return;
    setInvoiceError(null);
    const collect = Number(invoiceCollect);
    if (!Number.isFinite(collect) || collect <= 0) { setInvoiceError('Collect amount must be greater than zero'); return; }
    if (collect > invoiceDue) { setInvoiceError('Collect amount cannot exceed current due'); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${invoiceTarget.id}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ collect_amount: collect, currency: userCurrency, method: invoiceMethod || 'cash', reference: invoiceReference || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to create invoice');
      // Compute remaining due using API response if available
      const newDue = typeof data?.due_amount === 'number' ? Number(data.due_amount) : Math.max(0, invoiceDue - (Number(invoiceCollect) || 0));
      if (invoiceTarget) {
        setTempDue(prev => ({ ...prev, [invoiceTarget.id]: newDue }));
      }
      setShowInvoiceModal(false);
      setInvoiceTarget(null);
      setSuccessMessage(`Invoice created. Remaining due: ${formatCurrency(newDue)}`);
      // Optional refetch to sync other fields; UI due is already updated instantly
      if (token) fetchList(token, page?.current_page || 1);
      // Download invoice PDF
      try {
        if (data?.id) {
          const pdfRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoices/${data.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
          if (pdfRes.ok) {
            const blob = await pdfRes.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `invoice-${data.number || data.id}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
          }
        }
      } catch {}
    } catch (e: any) {
      setInvoiceError(e?.message || 'Failed to create invoice');
    }
  };

  const computeRowDue = (it: JobCard): number => {
    const id = it.id;
    if (typeof tempDue[id] === 'number') return Math.max(0, Number(tempDue[id]));
    const c = Number((it as any).confirmed_amount ?? 0);
    const cNum = Number.isFinite(c) ? c : 0;
    const totalPaid = typeof (it as any).total_paid === 'number' ? Number((it as any).total_paid) : null;
    if (totalPaid !== null && Number.isFinite(totalPaid)) {
      return Math.max(0, cNum - totalPaid);
    }
    const adv = Number((it as any).advance_payment ?? 0);
    const advNum = Number.isFinite(adv) ? adv : 0;
    return Math.max(0, cNum - advNum);
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <AdminSectionHeader
              title="Job Cards"
              subtitle="Create, track and invoice production work"
            >
              <button
                onClick={() => setCreating(true)}
                className="newBtn flex items-center gap-2"
                aria-label="Create new job card"
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> New Job Card
              </button>
            </AdminSectionHeader>
            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>}
            {creating && (
              <div className="mb-6 p-4 border-2 border-gray-100 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select className="input" value={form.booking_id || ''} onChange={(e) => setForm({ ...form, booking_id: Number(e.target.value) })}>
                    <option value="">Select booking *</option>
                    {bookings.map(b => {
                      const label = `${b.customer?.name || `#${b.customer_id}`}${b.location ? ` @ ${b.location}` : ''}`;
                      return (
                        <option key={b.id} value={b.id}>{label}</option>
                      );
                    })}
                  </select>
                  <input className="input" placeholder="Title *" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <textarea className="input md:col-span-2" placeholder="Description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <select className="input" value={form.status || 'open'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  <input className="input" placeholder="Assigned To" value={form.assigned_to || ''} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
                  {/* Items card below Assigned To */}
                  <div className="md:col-span-2 mt-2 p-3 border-2 border-gray-100 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-2">Items</h4>
                    {lineError && <div className="mb-2 text-sm text-red-600">{lineError}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                      <input className="input md:col-span-2" placeholder="Item" value={lineService} onChange={(e) => setLineService(e.target.value)} />
                      <input type="number" step="1" className="input" placeholder="Qty" value={lineQty} onChange={(e) => setLineQty(e.target.value)} />
                      <input type="number" step="0.01" className="input" placeholder="Amount" value={lineAmount} onChange={(e) => setLineAmount(e.target.value)} />
                    </div>
                    <button type="button" onClick={addLineItem} className="btn-secondary">Add +</button>
                    <div className="overflow-x-auto mt-3">
                      <table className="adminTable" role="table" aria-label="Job card creation items table">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="py-2 pr-4">Item</th>
                            <th className="py-2 pr-4">Qty</th>
                            <th className="py-2 pr-4">Amount</th>
                            <th className="py-2 pr-4">Sub Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr><td className="py-2 pr-4 text-gray-500" colSpan={4}>No items added.</td></tr>
                          ) : items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-2 pr-4">{it.service}</td>
                              <td className="py-2 pr-4">{it.qty}</td>
                              <td className="py-2 pr-4">{formatCurrency(it.amount)}</td>
                              <td className="py-2 pr-4">{formatCurrency(it.subamount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        {items.length > 0 && (
                          <tfoot>
                            <tr>
                              <td className="py-2 pr-4 font-semibold" colSpan={3}>Items Total</td>
                              <td className="py-2 pr-4 font-semibold">{formatCurrency(itemsSubtotal)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    {items.length > 0 && (
                      <div className="mt-3 flex flex-col items-end gap-2">
                        <div className="text-right">
                          <span className="text-sm text-gray-600 mr-2">Items Total:</span>
                          <span className="text-lg font-bold text-gray-900">{formatCurrency(itemsSubtotal)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Discount:</label>
                          <input type="number" step="0.01" className="input w-40" placeholder="0.00" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-600 mr-2">Final Amount:</span>
                          <span className="text-xl font-extrabold text-gray-900">{formatCurrency(finalAmount)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-600 mr-2">Due Amount:</span>
                          <span className="text-lg font-bold text-gray-900">{formatCurrency(Math.max(0, finalAmount - (Number(form.advance_payment) || 0)))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Confirmation Payment (Advance)"
                    value={(form.advance_payment as any) || ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm({ ...form, advance_payment: v === '' ? undefined : Number(v) });
                    }}
                  />
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={createItem} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
                  <button onClick={() => setCreating(false)} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                </div>
              </div>
            )}

            {successMessage && <div className="mb-4 bg-green-50 border-2 border-green-200 text-green-800 px-6 py-3 rounded-xl">{successMessage}</div>}
            {editId && (
              <div className="mb-12 p-5 border-2 border-indigo-100 rounded-xl bg-indigo-50">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Job Card Items</h2>
                {editLineError && <div className="mb-3 text-sm text-red-600">{editLineError}</div>}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <input className="input md:col-span-2" placeholder="Item" value={editLineService} onChange={e => setEditLineService(e.target.value)} />
                  <input type="number" className="input" placeholder="Qty" value={editLineQty} onChange={e => setEditLineQty(e.target.value)} />
                  <input type="number" step="0.01" className="input" placeholder="Amount" value={editLineAmount} onChange={e => setEditLineAmount(e.target.value)} />
                </div>
                <button type="button" onClick={addEditLineItem} className="btn-secondary mb-4">Add +</button>
                <div className="overflow-x-auto mb-4">
                  <table className="adminTable" role="table" aria-label="Job card editing items table">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-2 pr-4">Item</th>
                        <th className="py-2 pr-4">Qty</th>
                        <th className="py-2 pr-4">Amount</th>
                        <th className="py-2 pr-4">Sub Amount</th>
                        <th className="py-2 pr-4">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editItems.length === 0 ? (
                        <tr><td className="py-2 pr-4 text-gray-500" colSpan={5}>No items.</td></tr>
                      ) : editItems.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 pr-4">
                            <input className="input" value={it.service} onChange={e => {
                              const v = e.target.value; setEditItems(prev => prev.map((p,i) => i===idx?{...p,service:v}:p));
                            }} />
                          </td>
                          <td className="py-2 pr-4">
                            <input type="number" className="input" value={it.qty} onChange={e => {
                              const v = Number(e.target.value); setEditItems(prev => prev.map((p,i) => i===idx?{...p,qty:v,sub_amount: +(p.amount * v).toFixed(2), subamount: +(p.amount * v).toFixed(2)}:p));
                            }} />
                          </td>
                          <td className="py-2 pr-4">
                            <input type="number" step="0.01" className="input" value={it.amount} onChange={e => {
                              const v = Number(e.target.value); setEditItems(prev => prev.map((p,i) => i===idx?{...p,amount:v,sub_amount: +(v * p.qty).toFixed(2), subamount: +(v * p.qty).toFixed(2)}:p));
                            }} />
                          </td>
                          <td className="py-2 pr-4">{formatCurrency(Number(it.sub_amount ?? it.subamount ?? (it.amount * it.qty)))}</td>
                          <td className="py-2 pr-4"><button type="button" onClick={() => removeEditItem(idx)} className="btn-danger">Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                    {editItems.length > 0 && (
                      <tfoot>
                        <tr>
                          <td className="py-2 pr-4 font-semibold" colSpan={4}>Items Total</td>
                          <td className="py-2 pr-4 font-semibold">{formatCurrency(editItemsSubtotal)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-sm text-gray-600">Discount:</label>
                  <input type="number" step="0.01" className="input w-40" placeholder="0.00" value={editDiscount} onChange={e => setEditDiscount(e.target.value)} />
                </div>
                <div className="flex flex-col items-end gap-1 mb-4">
                  <div><span className="text-sm text-gray-600 mr-2">Final Amount:</span><span className="text-lg font-bold">{formatCurrency(editFinalAmount)}</span></div>
                  <div><span className="text-sm text-gray-600 mr-2">Advance:</span><span className="text-lg font-bold">{formatCurrency(editAdvance)}</span></div>
                  <div><span className="text-sm text-gray-600 mr-2">Due:</span><span className="text-lg font-bold">{formatCurrency(editDueAmount)}</span></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => editId && saveEdit(editId)} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Save Items</button>
                  <button onClick={cancelEdit} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel Edit</button>
                </div>
              </div>
            )}
            {/* Advance collection modal */}
            {showAdvanceModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Collect Advance</h3>
                  {advanceError && <div className="mb-3 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-2 rounded-xl">{advanceError}</div>}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Amount</label>
                      <input type="number" step="0.01" className="input" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Method</label>
                      <input className="input" placeholder="cash / card / bank" value={advanceMethod} onChange={e => setAdvanceMethod(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Reference (optional)</label>
                      <input className="input" placeholder="#ref" value={advanceReference} onChange={e => setAdvanceReference(e.target.value)} />
                    </div>
                    {advanceTarget && (
                      <div className="text-right text-sm text-gray-700">
                        <div><span className="mr-2">Final:</span><span className="font-semibold">{formatCurrency(Number((advanceTarget as any).confirmed_amount || 0))}</span></div>
                        <div><span className="mr-2">Current Advance:</span><span className="font-semibold">{formatCurrency(Number((advanceTarget as any).advance_payment || 0))}</span></div>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-end gap-3">
                    <button onClick={() => { setShowAdvanceModal(false); setAdvanceTarget(null); }} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                    <button onClick={submitAdvance} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Collect</button>
                  </div>
                </div>
              </div>
            )}
            {loading ? <p className="text-gray-600">Loading...</p> : (
              <div className="overflow-x-auto space-y-12">
                {(() => {
                  const all = page?.data || [];
                  const openJobs = all.filter(j => j.status === 'open');
                  const progressJobs = all.filter(j => j.status === 'in_progress');
                  const doneJobs = all.filter(j => j.status === 'done');
                  const renderTable = (title: string, rows: JobCard[]) => (
                    <div key={title}>
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
                      <table className="adminTable" role="table" aria-label={title + ' table'}>
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="py-2 pr-4">Booking</th>
                            <th className="py-2 pr-4">Title</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Final Amount</th>
                            <th className="py-2 pr-4">Advance</th>
                          <th className="py-2 pr-4">Total Paid</th>
                            <th className="py-2 pr-4">Due Amount</th>
                            <th className="py-2 pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr><td className="py-4 pr-4 text-gray-500" colSpan={7}>No records.</td></tr>
                          ) : rows.map(it => (
                            <tr key={it.id}>
                              <td className="py-2 pr-4">{
                                it.booking?.customer?.name || it.booking?.customer_id
                                  ? `${it.booking?.customer?.name || `#${it.booking?.customer_id}`}${it.booking?.location ? ` @ ${it.booking?.location}` : ''}`
                                  : `#${it.booking_id}`
                              }</td>
                              <td className="py-2 pr-4">{editId === it.id ? (
                                <input className="input" value={editForm.title || it.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                              ) : it.title}</td>
                              <td className="py-2 pr-4">{editId === it.id ? (
                                <select className="input" value={editForm.status || it.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                                  <option value="open">Open</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="done">Done</option>
                                </select>
                              ) : it.status}</td>
                              <td className="py-2 pr-4">{typeof it.confirmed_amount === 'number' ? formatCurrency(Number(it.confirmed_amount)) : (it.confirmed_amount ? String(it.confirmed_amount) : '-')}</td>
                              <td className="py-2 pr-4">{
                                editId === it.id ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    className="input"
                                    value={(editForm.advance_payment as any) ?? (it.advance_payment ?? '')}
                                    onChange={(e) => setEditForm({ ...editForm, advance_payment: e.target.value === '' ? null : Number(e.target.value) })}
                                  />
                                ) : (
                                  typeof it.advance_payment === 'number'
                                    ? formatCurrency(Number(it.advance_payment))
                                    : (it.advance_payment ? String(it.advance_payment) : '-')
                                )
                              }</td>
                              <td className="py-2 pr-4">{
                                (() => {
                                  const c = Number((it as any).confirmed_amount ?? 0);
                                  const rowDue = computeRowDue(it);
                                  const totalPaid = typeof (it as any).total_paid === 'number' ? Number((it as any).total_paid) : Math.max(0, c - rowDue);
                                  return formatCurrency(totalPaid);
                                })()
                              }</td>
                              <td className="py-2 pr-4">{
                                (() => {
                                  const due = computeRowDue(it);
                                  return formatCurrency(due);
                                })()
                              }</td>
                              <td className="py-2 pr-4">
                                {editId === it.id ? (
                                  <div className="flex gap-2">
                                    <button onClick={() => saveEdit(it.id)} className="btn-primary flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                                    <button onClick={cancelEdit} className="btn-secondary flex items-center gap-1"><X className="w-4 h-4" /> Cancel</button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <button onClick={() => startEdit(it)} className="btn-secondary">Edit</button>
                                    {Number((it as any).advance_payment ?? 0) <= 0 && (
                                      <button onClick={() => openAdvanceModal(it)} className="btn-secondary">Collect Advance</button>
                                    )}
                                    <button onClick={() => viewJobCardPdf(it)} className="btn-primary">View Job Card</button>
                                    <button onClick={() => remove(it.id)} className="btn-danger flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                  return (
                    <>
                      {renderTable('Open Job Cards', openJobs)}
                      {/* Custom renderer for In Progress to add Invoice button */}
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">In Progress Job Cards</h2>
                        <table className="adminTable" role="table" aria-label="In progress job cards table">
                          <thead>
                            <tr className="text-left text-gray-500">
                              <th className="py-2 pr-4">Booking</th>
                              <th className="py-2 pr-4">Title</th>
                              <th className="py-2 pr-4">Status</th>
                              <th className="py-2 pr-4">Final Amount</th>
                              <th className="py-2 pr-4">Advance</th>
                            <th className="py-2 pr-4">Total Paid</th>
                              <th className="py-2 pr-4">Due Amount</th>
                              <th className="py-2 pr-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {progressJobs.length === 0 ? (
                              <tr><td className="py-4 pr-4 text-gray-500" colSpan={7}>No records.</td></tr>
                            ) : progressJobs.map(it => (
                              <tr key={it.id}>
                                <td className="py-2 pr-4">{
                                  it.booking?.customer?.name || it.booking?.customer_id
                                    ? `${it.booking?.customer?.name || `#${it.booking?.customer_id}`}${it.booking?.location ? ` @ ${it.booking?.location}` : ''}`
                                    : `#${it.booking_id}`
                                }</td>
                                <td className="py-2 pr-4">{editId === it.id ? (
                                  <input className="input" value={editForm.title || it.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                                ) : it.title}</td>
                                <td className="py-2 pr-4">{editId === it.id ? (
                                  <select className="input" value={editForm.status || it.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="done">Done</option>
                                  </select>
                                ) : it.status}</td>
                                <td className="py-2 pr-4">{typeof it.confirmed_amount === 'number' ? formatCurrency(Number(it.confirmed_amount)) : (it.confirmed_amount ? String(it.confirmed_amount) : '-')}</td>
                                <td className="py-2 pr-4">{
                                  editId === it.id ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="input"
                                      value={(editForm.advance_payment as any) ?? (it.advance_payment ?? '')}
                                      onChange={(e) => setEditForm({ ...editForm, advance_payment: e.target.value === '' ? null : Number(e.target.value) })}
                                    />
                                  ) : (
                                    typeof it.advance_payment === 'number'
                                      ? formatCurrency(Number(it.advance_payment))
                                      : (it.advance_payment ? String(it.advance_payment) : '-')
                                  )
                                }</td>
                                <td className="py-2 pr-4">{
                                  (() => {
                                    const c = Number((it as any).confirmed_amount ?? 0);
                                    const rowDue = computeRowDue(it);
                                    const totalPaid = typeof (it as any).total_paid === 'number' ? Number((it as any).total_paid) : Math.max(0, c - rowDue);
                                    return formatCurrency(totalPaid);
                                  })()
                                }</td>
                                <td className="py-2 pr-4">{
                                  (() => {
                                    const due = computeRowDue(it);
                                    return formatCurrency(due);
                                  })()
                                }</td>
                                <td className="py-2 pr-4">
                                  {editId === it.id ? (
                                    <div className="flex gap-2">
                                      <button onClick={() => saveEdit(it.id)} className="btn-primary flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                                      <button onClick={cancelEdit} className="btn-secondary flex items-center gap-1"><X className="w-4 h-4" /> Cancel</button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <button onClick={() => startEdit(it)} className="btn-secondary">Edit</button>
                                      <button onClick={() => openInvoiceModal(it)} className="btn-secondary">Invoice</button>
                                      <button onClick={() => viewJobCardPdf(it)} className="btn-primary">View Job Card</button>
                                      <button onClick={() => remove(it.id)} className="btn-danger flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {renderTable('Done Job Cards', doneJobs)}
                    </>
                  );
                })()}
                <div className="mt-4 flex items-center gap-3">
                  <button disabled={(page?.current_page || 1) <= 1} onClick={() => token && fetchList(token, (page!.current_page - 1))} className="btn-secondary">Prev</button>
                  <span className="text-sm text-gray-600">Page {page?.current_page} of {page?.last_page}</span>
                  <button disabled={(page?.current_page || 1) >= (page?.last_page || 1)} onClick={() => token && fetchList(token, (page!.current_page + 1))} className="btn-secondary">Next</button>
                </div>
              </div>
            )}
            {/* Invoice modal */}
            {showInvoiceModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Create Invoice</h3>
                  {invoiceError && <div className="mb-3 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-2 rounded-xl">{invoiceError}</div>}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Collect Now (optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        max={invoiceDue}
                        min={0.01}
                        value={invoiceCollect}
                        onChange={e => {
                          const raw = Number(e.target.value);
                          let val = Number.isFinite(raw) ? raw : 0;
                          if (val > invoiceDue) {
                            val = invoiceDue;
                            setInvoiceError('Amount reduced to current due');
                            setTimeout(() => setInvoiceError(null), 1500);
                          }
                          if (val < 0.01) { val = 0.01; }
                          setInvoiceCollect(val.toFixed(2));
                          setInvoiceRemaining(Math.max(0, invoiceDue - val));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Method</label>
                      <input className="input" placeholder="cash / card / bank" value={invoiceMethod} onChange={e => setInvoiceMethod(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Reference (optional)</label>
                      <input className="input" placeholder="#ref" value={invoiceReference} onChange={e => setInvoiceReference(e.target.value)} />
                    </div>
                    {invoiceTarget && (
                      <div className="text-right text-sm text-gray-700">
                        <div><span className="mr-2">Final:</span><span className="font-semibold">{formatCurrency(Number((invoiceTarget as any).confirmed_amount || 0))}</span></div>
                        <div><span className="mr-2">Total Paid:</span><span className="font-semibold">{formatCurrency(typeof (invoiceTarget as any).total_paid === 'number' ? Number((invoiceTarget as any).total_paid) : Number((invoiceTarget as any).advance_payment || 0))}</span></div>
                        <div><span className="mr-2">Current Due:</span><span className="font-semibold">{formatCurrency(invoiceDue)}</span></div>
                        <div><span className="mr-2">Remaining Due:</span><span className="font-semibold">{formatCurrency(invoiceRemaining)}</span></div>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-end gap-3">
                    <button onClick={() => { setShowInvoiceModal(false); setInvoiceTarget(null); }} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                    <button onClick={submitInvoice} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Create</button>
                  </div>
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
