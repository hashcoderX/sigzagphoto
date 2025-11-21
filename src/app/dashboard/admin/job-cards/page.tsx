"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, X, Receipt, Edit, CheckSquare, FileText, Eye, DollarSign } from "lucide-react";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Booking { id: number; customer_id: number; location?: string | null; event_date?: string; customer?: { id: number; name: string }; }
interface JobCardItem { id?: number; service: string; qty: number; amount: number; sub_amount?: number; subamount?: number }
interface Task { id?: number; title: string; description?: string; completed: boolean; completed_at?: string; created_at?: string }
interface JobCard { id: number; booking_id: number; title: string; description?: string; status: string; assigned_to?: string; due_date?: string | null; confirmed_amount?: number | string | null; advance_payment?: number | string | null; discount?: number | string | null; booking?: Booking; items?: JobCardItem[]; tasks?: Task[] }
interface JobCardExpense { id: number; event_type: string; job_card_id: number; amount: number; description: string; vendor?: string; expense_date: string; receipt_path?: string; job_card?: { id: number; title: string } }
type LineItem = { service: string; qty: number; amount: number; subamount: number };
interface Page<T> { data: T[]; current_page: number; last_page: number; }

const DonutChart = ({ income, expense, colors = { income: '#059669', expense: '#e11d48' }, size = 220, thickness = 22, centerTop, centerBottom, svgRef }:
  { income: number; expense: number; colors?: { income: string; expense: string }; size?: number; thickness?: number; centerTop?: string; centerBottom?: string; svgRef?: React.RefObject<SVGSVGElement> }) => {
  const total = Math.max(0, Number(income)) + Math.max(0, Number(expense));
  const radius = (size / 2) - thickness / 2;
  const cx = size / 2; const cy = size / 2;
  const C = 2 * Math.PI * radius;
  const incFrac = total > 0 ? Math.max(0, Number(income)) / total : 0;
  const expFrac = total > 0 ? Math.max(0, Number(expense)) / total : 0;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setAnimated(true), 20);
    return () => clearTimeout(id);
  }, [income, expense]);

  const labelPos = (startFrac: number, frac: number, offset = 14) => {
    const midDeg = (startFrac + frac / 2) * 360; // from 0 at top
    const rad = (midDeg - 90) * Math.PI / 180;
    const rr = radius + thickness / 2 + offset;
    return { x: cx + rr * Math.cos(rad), y: cy + rr * Math.sin(rad) };
  };

  return (
    <svg ref={svgRef} viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[320px]">
      <defs>
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
        </filter>
      </defs>
      <g filter="url(#softShadow)">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={thickness} />
        {incFrac > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={colors.income}
            strokeWidth={thickness}
            strokeDasharray={`${incFrac * C} ${C}`}
            strokeDashoffset={0}
            style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}
        {expFrac > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={colors.expense}
            strokeWidth={thickness}
            strokeDasharray={`${expFrac * C} ${C}`}
            strokeDashoffset={-incFrac * C}
            style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        )}
        {/* Center label */}
        <g>
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fill="#6b7280">{centerTop}</text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="16" fontWeight={700} fill="#111827">{centerBottom}</text>
        </g>
      </g>
      {/* Labels on arcs */}
      {incFrac > 0 && (() => {
        const p = labelPos(0, incFrac);
        const pct = Math.round(incFrac * 100);
        return (
          <g key="inc-label" transform={`translate(${p.x},${p.y})`}>
            <rect x={-36} y={-18} rx={10} ry={10} width={72} height={36} fill="#ecfdf5" stroke="#a7f3d0" />
            <text x={0} y={-2} textAnchor="middle" fontSize="10" fill="#065f46">Income</text>
            <text x={0} y={10} textAnchor="middle" fontSize="12" fontWeight={700} fill="#065f46">{pct}%</text>
          </g>
        );
      })()}
      {expFrac > 0 && (() => {
        const p = labelPos(incFrac, expFrac);
        const pct = Math.round(expFrac * 100);
        return (
          <g key="exp-label" transform={`translate(${p.x},${p.y})`}>
            <rect x={-36} y={-18} rx={10} ry={10} width={72} height={36} fill="#fef2f2" stroke="#fecaca" />
            <text x={0} y={-2} textAnchor="middle" fontSize="10" fill="#991b1b">Expense</text>
            <text x={0} y={10} textAnchor="middle" fontSize="12" fontWeight={700} fill="#991b1b">{pct}%</text>
          </g>
        );
      })()}
    </svg>
  );
};

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
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  // Task tracking state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [editTasks, setEditTasks] = useState<Task[]>([]);
  const [editNewTaskTitle, setEditNewTaskTitle] = useState('');
  const [editNewTaskDescription, setEditNewTaskDescription] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalTarget, setTaskModalTarget] = useState<JobCard | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  // Payment history modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalTarget, setPaymentModalTarget] = useState<JobCard | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  // Expenses modal state
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [expensesModalTarget, setExpensesModalTarget] = useState<JobCard | null>(null);
  const [expenses, setExpenses] = useState<JobCardExpense[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);

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
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); setBookings(data.data || []); } catch { }
  };
  const fetchList = async (t: string, p: number) => {
    setLoading(true); setError(null);
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards?per_page=10&page=${p}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) throw new Error('Failed to load job cards'); const data = await res.json(); setPage(data); }
    catch (e: any) { setError(e?.message || 'Failed to load job cards'); } finally { setLoading(false); }
  };
  const fetchProfile = async (t: string) => {
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); if (data?.currency) setUserCurrency(data.currency); } catch { }
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
        tasks: tasks.map(task => ({
          title: task.title,
          description: task.description,
          completed: task.completed,
          completed_at: task.completed_at
        }))
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Create failed');
      setCreating(false);
      setForm({ status: 'open' });
      setItems([]); setLineService(''); setLineQty(''); setLineAmount(''); setDiscount('');
      setTasks([]); setNewTaskTitle(''); setNewTaskDescription('');
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
      } catch { }
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
    // Initialize editable tasks list
    setEditTasks(it.tasks || []);
  };
  const cancelEdit = () => { setEditId(null); setEditForm({}); setEditItems([]); setEditDiscount(''); setEditTasks([]); setEditNewTaskTitle(''); setEditNewTaskDescription(''); };
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
      payload.tasks = editTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        completed: task.completed,
        completed_at: task.completed_at
      }));
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

  const updateStatus = async (id: number, status: string) => {
    if (!token) return;
    setError(null); setSuccessMessage(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Update failed');
      setEditingStatusId(null);
      fetchList(token, page?.current_page || 1);
      setSuccessMessage('Status updated successfully.');
    } catch (e: any) { setError(e?.message || 'Update failed'); }
  };

  // Task management functions
  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      completed: false,
      created_at: new Date().toISOString()
    };
    setTasks(prev => [...prev, task]);
    setNewTaskTitle('');
    setNewTaskDescription('');
  };

  const toggleTaskCompletion = (taskIndex: number) => {
    setTasks(prev => prev.map((task, idx) =>
      idx === taskIndex
        ? {
          ...task,
          completed: !task.completed,
          completed_at: !task.completed ? new Date().toISOString() : undefined
        }
        : task
    ));
  };

  const removeTask = (taskIndex: number) => {
    setTasks(prev => prev.filter((_, idx) => idx !== taskIndex));
  };

  const addEditTask = () => {
    if (!editNewTaskTitle.trim()) return;
    const task: Task = {
      title: editNewTaskTitle.trim(),
      description: editNewTaskDescription.trim() || undefined,
      completed: false,
      created_at: new Date().toISOString()
    };
    setEditTasks(prev => [...prev, task]);
    setEditNewTaskTitle('');
    setEditNewTaskDescription('');
  };

  const toggleEditTaskCompletion = (taskIndex: number) => {
    setEditTasks(prev => prev.map((task, idx) =>
      idx === taskIndex
        ? {
          ...task,
          completed: !task.completed,
          completed_at: !task.completed ? new Date().toISOString() : undefined
        }
        : task
    ));
  };

  const removeEditTask = (taskIndex: number) => {
    setEditTasks(prev => prev.filter((_, idx) => idx !== taskIndex));
  };

  const openTaskModal = (jobCard: JobCard) => {
    setTaskModalTarget(jobCard);
    setShowTaskModal(true);
  };

  const openPaymentModal = async (jobCard: JobCard) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${jobCard.id}/payments`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
        setPaymentModalTarget(jobCard);
        setShowPaymentModal(true);
      } else {
        setError('Failed to load payment history');
        setTimeout(() => setError(null), 3000);
      }
    } catch (e) {
      setError('Failed to load payment history');
      setTimeout(() => setError(null), 3000);
    }
  };

  const openExpensesModal = async (jobCard: JobCard) => {
    if (!token) return;
    try {
      // Fetch expenses
      const expensesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-card-expenses?job_card_id=${jobCard.id}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      });
      const expensesData = expensesRes.ok ? await expensesRes.json() : { data: [] };
      setExpenses(expensesData.data || []);

      // Fetch payments (income)
      const paymentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${jobCard.id}/payments`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      });
      const paymentsData = paymentsRes.ok ? await paymentsRes.json() : [];
      const income = paymentsData.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      setTotalIncome(income);

      setExpensesModalTarget(jobCard);
      setShowExpensesModal(true);
    } catch (e) {
      setError('Failed to load expenses and income');
      setTimeout(() => setError(null), 3000);
    }
  };

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
      } catch { }
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
      } catch { }
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
    // Default collect to full remaining due, but user can set to 0 to collect later or any amount up to due.
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
    const collect = Number(invoiceCollect || 0);
    if (!Number.isFinite(collect) || collect < 0) { setInvoiceError('Collect amount must be 0 or greater'); return; }
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
      } catch { }
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
                  {/* Tasks section */}
                  <div className="md:col-span-2 mt-2 p-4 border-2 border-purple-100 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      Tasks & Milestones
                    </h4>
                    <div className="space-y-3 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          className="input"
                          placeholder="Task title *"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTask()}
                        />
                        <input
                          className="input"
                          placeholder="Description (optional)"
                          value={newTaskDescription}
                          onChange={(e) => setNewTaskDescription(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addTask()}
                        />
                      </div>
                      <button type="button" onClick={addTask} className="btn-secondary flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Task
                      </button>
                    </div>
                    {tasks.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">Added Tasks:</h5>
                        {tasks.map((task, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTaskCompletion(idx)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                            <div className="flex-1">
                              <div className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </div>
                              {task.description && (
                                <div className={`text-sm ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {task.description}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTask(idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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
                              const v = e.target.value; setEditItems(prev => prev.map((p, i) => i === idx ? { ...p, service: v } : p));
                            }} />
                          </td>
                          <td className="py-2 pr-4">
                            <input type="number" className="input" value={it.qty} onChange={e => {
                              const v = Number(e.target.value); setEditItems(prev => prev.map((p, i) => i === idx ? { ...p, qty: v, sub_amount: +(p.amount * v).toFixed(2), subamount: +(p.amount * v).toFixed(2) } : p));
                            }} />
                          </td>
                          <td className="py-2 pr-4">
                            <input type="number" step="0.01" className="input" value={it.amount} onChange={e => {
                              const v = Number(e.target.value); setEditItems(prev => prev.map((p, i) => i === idx ? { ...p, amount: v, sub_amount: +(v * p.qty).toFixed(2), subamount: +(v * p.qty).toFixed(2) } : p));
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
                {/* Edit Tasks Section */}
                <div className="mb-4 p-4 border-2 border-purple-100 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Tasks & Milestones
                  </h4>
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        className="input"
                        placeholder="Task title *"
                        value={editNewTaskTitle}
                        onChange={(e) => setEditNewTaskTitle(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addEditTask()}
                      />
                      <input
                        className="input"
                        placeholder="Description (optional)"
                        value={editNewTaskDescription}
                        onChange={(e) => setEditNewTaskDescription(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addEditTask()}
                      />
                    </div>
                    <button type="button" onClick={addEditTask} className="btn-secondary flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Add Task
                    </button>
                  </div>
                  {editTasks.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Tasks:</h5>
                      {editTasks.map((task, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleEditTaskCompletion(idx)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {task.title}
                            </div>
                            {task.description && (
                              <div className={`text-sm ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                                {task.description}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEditTask(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                            <tr><td className="py-4 pr-4 text-gray-500" colSpan={8}>No records.</td></tr>
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
                                    <button onClick={() => startEdit(it)} className="btn-secondary" title="Edit">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => openTaskModal(it)} className="btn-secondary" title="Tasks">
                                      <CheckSquare className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => openPaymentModal(it)} className="btn-secondary" title="View Payment History">
                                      <Receipt className="w-4 h-4" />
                                    </button>
                                    {Number((it as any).advance_payment ?? 0) <= 0 && (
                                      <button onClick={() => openAdvanceModal(it)} className="btn-secondary">Collect Advance</button>
                                    )}
                                    <button onClick={() => viewJobCardPdf(it)} className="btn-primary" title="View Job Card">
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => remove(it.id)} className="btn-danger" title="Delete">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
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
                              <tr><td className="py-4 pr-4 text-gray-500" colSpan={8}>No records.</td></tr>
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
                                <td className="py-2 pr-4">
                                  {editingStatusId === it.id ? (
                                    <select
                                      className="input"
                                      value={it.status}
                                      onChange={(e) => updateStatus(it.id, e.target.value)}
                                      onBlur={() => setEditingStatusId(null)}
                                    >
                                      <option value="open">Open</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="done">Done</option>
                                    </select>
                                  ) : (
                                    <button
                                      onClick={() => setEditingStatusId(it.id)}
                                      className="btn-secondary text-xs"
                                    >
                                      {it.status}
                                    </button>
                                  )}
                                </td>
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
                                      <button onClick={() => startEdit(it)} className="btn-secondary" title="Edit">
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => openTaskModal(it)} className="btn-secondary" title="Tasks">
                                        <CheckSquare className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => openPaymentModal(it)} className="btn-secondary" title="View Payment History">
                                        <Receipt className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => openExpensesModal(it)} className="btn-secondary" title="View Expenses">
                                        <DollarSign className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => openInvoiceModal(it)} className="btn-secondary" title="Invoice">
                                        <FileText className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => viewJobCardPdf(it)} className="btn-primary" title="View Job Card">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => remove(it.id)} className="btn-danger" title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
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
                      <label className="block text-sm text-gray-600 mb-1">Collect Payment Now (Optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        max={invoiceDue}
                        min={0}
                        placeholder="0.00"
                        value={invoiceCollect}
                        onChange={e => {
                          const inputValue = e.target.value;
                          // Allow empty input for better UX
                          if (inputValue === '') {
                            setInvoiceCollect('');
                            setInvoiceRemaining(invoiceDue);
                            return;
                          }
                          
                          const raw = Number(inputValue);
                          if (!Number.isFinite(raw)) return; // Invalid number, don't update
                          
                          let val = raw;
                          if (val > invoiceDue) {
                            val = invoiceDue;
                            setInvoiceError('Amount reduced to current due');
                            setTimeout(() => setInvoiceError(null), 1500);
                          }
                          if (val < 0) { val = 0; }
                          
                          setInvoiceCollect(val.toString());
                          setInvoiceRemaining(Math.max(0, invoiceDue - val));
                        }}
                        onBlur={e => {
                          // Format on blur
                          const raw = Number(e.target.value);
                          if (Number.isFinite(raw)) {
                            let val = raw;
                            if (val > invoiceDue) val = invoiceDue;
                            if (val < 0) val = 0;
                            setInvoiceCollect(val.toFixed(2));
                            setInvoiceRemaining(Math.max(0, invoiceDue - val));
                          } else {
                            setInvoiceCollect('0.00');
                            setInvoiceRemaining(invoiceDue);
                          }
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter amount to collect now (0 to collect later)</p>
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
            {/* Task Management Modal */}
            {showTaskModal && taskModalTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      📋 Task Tracker - {taskModalTarget.title}
                    </h3>
                    <button
                      onClick={() => { setShowTaskModal(false); setTaskModalTarget(null); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Task Statistics */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-blue-600">{(taskModalTarget.tasks || []).length}</div>
                      <div className="text-sm text-blue-700">Total Tasks</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-green-600">{(taskModalTarget.tasks || []).filter(t => t.completed).length}</div>
                      <div className="text-sm text-green-700">Completed</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-orange-600">{(taskModalTarget.tasks || []).filter(t => !t.completed).length}</div>
                      <div className="text-sm text-orange-700">Pending</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(taskModalTarget.tasks || []).length > 0 && (
                    <div className="mb-6">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress</span>
                        <span>{Math.round(((taskModalTarget.tasks || []).filter(t => t.completed).length / (taskModalTarget.tasks || []).length) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${((taskModalTarget.tasks || []).filter(t => t.completed).length / (taskModalTarget.tasks || []).length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Tasks List */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Tasks</h4>
                    {(taskModalTarget.tasks || []).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📝</div>
                        <div>No tasks added yet</div>
                        <div className="text-sm">Add tasks when creating or editing the job card</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(taskModalTarget.tasks || []).map((task, idx) => (
                          <div key={task.id || idx} className={`p-4 rounded-xl border-2 transition-all duration-200 ${task.completed
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-gray-200 hover:border-purple-300'
                            }`}>
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={task.completed}
                                disabled={updatingTaskId === task.id}
                                onChange={async () => {
                                  if (!task.id) return;
                                  setUpdatingTaskId(task.id);
                                  try {
                                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${taskModalTarget.id}/tasks/${task.id}/toggle`, {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        Accept: 'application/json',
                                        Authorization: `Bearer ${token}`
                                      }
                                    });
                                    if (response.ok) {
                                      const updatedTask = await response.json();
                                      // Update local state
                                      const updatedTasks = [...(taskModalTarget.tasks || [])];
                                      const taskIndex = updatedTasks.findIndex(t => t.id === task.id);
                                      if (taskIndex !== -1) {
                                        updatedTasks[taskIndex] = updatedTask;
                                        setTaskModalTarget({ ...taskModalTarget, tasks: updatedTasks });
                                      }
                                      // Refresh the job cards list to reflect changes
                                      if (token) fetchList(token, page?.current_page || 1);
                                    } else {
                                      console.error('Failed to toggle task:', response.statusText);
                                      // Show error message
                                      setError('Failed to update task status');
                                      setTimeout(() => setError(null), 3000);
                                    }
                                  } catch (error) {
                                    console.error('Failed to toggle task:', error);
                                    setError('Failed to update task status');
                                    setTimeout(() => setError(null), 3000);
                                  } finally {
                                    setUpdatingTaskId(null);
                                  }
                                }}
                                className="w-5 h-5 mt-0.5 text-purple-600 rounded focus:ring-purple-500 disabled:opacity-50"
                              />
                              <div className="flex-1">
                                <div className={`font-medium text-lg ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {task.title}
                                </div>
                                {task.description && (
                                  <div className={`text-sm mt-1 ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {task.description}
                                  </div>
                                )}
                                {task.completed && task.completed_at && (
                                  <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                    ✅ Completed {new Date(task.completed_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => { setShowTaskModal(false); setTaskModalTarget(null); }}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <X className="w-4 h-4" /> Close
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Payment History Modal */}
            {showPaymentModal && paymentModalTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Receipt className="w-5 h-5" />
                      Payment History - {paymentModalTarget.title}
                    </h3>
                    <button
                      onClick={() => { setShowPaymentModal(false); setPaymentModalTarget(null); setPayments([]); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <div>No payments recorded yet</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="adminTable" role="table" aria-label="Payment history table">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="py-2 pr-4">Date</th>
                            <th className="py-2 pr-4">Amount</th>
                            <th className="py-2 pr-4">Method</th>
                            <th className="py-2 pr-4">Reference</th>
                            <th className="py-2 pr-4">Invoice</th>
                            <th className="py-2 pr-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((payment, idx) => (
                            <tr key={payment.id || idx}>
                              <td className="py-2 pr-4">{new Date(payment.paid_at).toLocaleDateString()}</td>
                              <td className="py-2 pr-4">{formatCurrency(payment.amount)}</td>
                              <td className="py-2 pr-4">{payment.method || '-'}</td>
                              <td className="py-2 pr-4">{payment.reference || '-'}</td>
                              <td className="py-2 pr-4">{payment.invoice ? `INV-${payment.invoice.number}` : '-'}</td>
                              <td className="py-2 pr-4">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {payment.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => { setShowPaymentModal(false); setPaymentModalTarget(null); setPayments([]); }}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <X className="w-4 h-4" /> Close
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Expenses Modal */}
            {showExpensesModal && expensesModalTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Job Card Expenses - {expensesModalTarget.title}
                    </h3>
                    <button
                      onClick={() => { setShowExpensesModal(false); setExpensesModalTarget(null); setExpenses([]); setTotalIncome(0); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Financial Overview Chart */}
                  <div className="mb-6 flex justify-center">
                    <DonutChart
                      income={totalIncome}
                      expense={expenses.reduce((sum, e) => sum + Number(e.amount), 0)}
                      centerTop="Net"
                      centerBottom={formatCurrency(totalIncome - expenses.reduce((sum, e) => sum + Number(e.amount), 0))}
                    />
                  </div>

                  {expenses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <div>No expenses recorded for this job card</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="adminTable" role="table" aria-label="Job card expenses table">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="py-2 pr-4">Event Type</th>
                            <th className="py-2 pr-4">Amount</th>
                            <th className="py-2 pr-4">Description</th>
                            <th className="py-2 pr-4">Vendor</th>
                            <th className="py-2 pr-4">Date</th>
                            <th className="py-2 pr-4">Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map((expense, idx) => (
                            <tr key={expense.id || idx}>
                              <td className="py-2 pr-4">{expense.event_type}</td>
                              <td className="py-2 pr-4">{formatCurrency(expense.amount)}</td>
                              <td className="py-2 pr-4">{expense.description}</td>
                              <td className="py-2 pr-4">{expense.vendor || '-'}</td>
                              <td className="py-2 pr-4">{new Date(expense.expense_date).toLocaleDateString()}</td>
                              <td className="py-2 pr-4">
                                {expense.receipt_path ? (
                                  <a
                                    href={`${process.env.NEXT_PUBLIC_API_URL}/storage/${expense.receipt_path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline"
                                  >
                                    View
                                  </a>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td className="py-2 pr-4 font-semibold" colSpan={4}>Total Income</td>
                            <td className="py-2 pr-4 font-semibold">{formatCurrency(totalIncome)}</td>
                            <td className="py-2 pr-4"></td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4 font-semibold" colSpan={4}>Total Expenses</td>
                            <td className="py-2 pr-4"></td>
                            <td className="py-2 pr-4 font-semibold">{formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount), 0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => { setShowExpensesModal(false); setExpensesModalTarget(null); setExpenses([]); setTotalIncome(0); }}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <X className="w-4 h-4" /> Close
                    </button>
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
