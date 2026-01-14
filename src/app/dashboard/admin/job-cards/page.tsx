"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, X, Receipt, CheckSquare, FileText, DollarSign, Truck, Edit } from "lucide-react";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import InvoiceTemplatePreview from "@/components/InvoiceTemplatePreview";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Booking { id: number; customer_id: number; location?: string | null; earliest_date?: string; customer?: { id: number; name: string }; }
interface JobCardItem { id?: number; service: string; qty: number; amount: number; sub_amount?: number; subamount?: number }
interface Task { id?: number; title: string; description?: string; completed: boolean; completed_at?: string; created_at?: string }
interface JobCard { id: number; booking_id: number; title: string; description?: string; status: string; assigned_to?: string; due_date?: string | null; confirmed_amount?: number | string | null; advance_payment?: number | string | null; discount?: number | string | null; transport_charges?: number | string | null; transport_paid?: boolean; booking?: Booking; items?: JobCardItem[]; tasks?: Task[] }
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
  const [form, setForm] = useState<Partial<JobCard>>({ status: 'open', discount: 0 });
  // Items & currency state
  const [items, setItems] = useState<LineItem[]>([]);
  const [lineService, setLineService] = useState<string>('');
  const [lineQty, setLineQty] = useState<string>('');
  const [lineAmount, setLineAmount] = useState<string>('');
  const [lineError, setLineError] = useState<string | null>(null);
  const [userCurrency, setUserCurrency] = useState<string>('USD');
  const [user, setUser] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Advance collection modal state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceTarget, setAdvanceTarget] = useState<JobCard | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advanceMethod, setAdvanceMethod] = useState<string>('cash');
  const [advanceReference, setAdvanceReference] = useState<string>('');
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  // Transport collection modal state
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [transportTarget, setTransportTarget] = useState<JobCard | null>(null);
  const [transportAmount, setTransportAmount] = useState<string>('');
  const [transportMethod, setTransportMethod] = useState<string>('cash');
  const [transportReference, setTransportReference] = useState<string>('');
  const [transportError, setTransportError] = useState<string | null>(null);
  const [transportTemplateId, setTransportTemplateId] = useState<number | null>(null);
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
  // Invoice Templates state
  const [invoiceTemplates, setInvoiceTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedTemplateData, setSelectedTemplateData] = useState<any>(null);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  // Task tracking state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalTarget, setTaskModalTarget] = useState<JobCard | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  // Task add/edit modal state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormDescription, setTaskFormDescription] = useState('');
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  // Payment history modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalTarget, setPaymentModalTarget] = useState<JobCard | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  // Expenses modal state
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [expensesModalTarget, setExpensesModalTarget] = useState<JobCard | null>(null);
  const [expenses, setExpenses] = useState<JobCardExpense[]>([]);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  // Expense add/edit modal state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<JobCardExpense | null>(null);
  const [expenseFormEventType, setExpenseFormEventType] = useState('');
  const [expenseFormAmount, setExpenseFormAmount] = useState('');
  const [expenseFormDescription, setExpenseFormDescription] = useState('');
  const [expenseFormVendor, setExpenseFormVendor] = useState('');
  const [expenseFormDate, setExpenseFormDate] = useState('');
  const [expenseFormReceipt, setExpenseFormReceipt] = useState<File | null>(null);
  const [expenseFormError, setExpenseFormError] = useState<string | null>(null);
  const [expenseFormLoading, setExpenseFormLoading] = useState(false);
  // View job card modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewJobCard, setViewJobCard] = useState<JobCard | null>(null);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewPayments, setViewPayments] = useState<any[]>([]);

  const loadInvoiceTemplates = async (tokenParam?: string) => {
    const authToken = tokenParam || token;
    if (!authToken) {
      console.log('No token available for loading templates');
      return;
    }
    try {
      console.log('Loading invoice templates...');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoice-templates`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${authToken}` }
      });
      console.log('API response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('API response data:', data);
        // Since we changed to get() instead of paginate(), data is now the array directly
        setInvoiceTemplates(Array.isArray(data) ? data : data?.data || []);
        console.log('Templates loaded:', Array.isArray(data) ? data.length : (data?.data?.length || 0));
      } else {
        console.error('Failed to load templates, status:', res.status);
        const errorText = await res.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Failed to load invoice templates:', error);
    }
  };

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!t) { router.replace('/login'); return; }
    // Enforce plan gating for business suite
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    setToken(t);
    fetchList(t, 1);
    fetchBookings(t);
    fetchProfile(t);
    loadInvoiceTemplates(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openViewJobCardModal = async (jobOrId: JobCard | number) => {
    if (!token) return;
    setViewError(null);
    setViewLoading(true);
    try {
      const id = typeof jobOrId === 'number' ? jobOrId : jobOrId.id;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${id}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        cache: 'no-cache'
      });
      if (!res.ok) throw new Error('Failed to load job card details');
      const data = await res.json();
      setViewJobCard(data);
      // Fetch payments for summary
      try {
        const payRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${id}/payments`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
          cache: 'no-cache'
        });
        if (payRes.ok) {
          const payData = await payRes.json();
          setViewPayments(Array.isArray(payData) ? payData : (payData?.data || []));
        }
      } catch {}
      setShowViewModal(true);
    } catch (e: any) {
      setViewError(e?.message || 'Failed to load job card details');
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewJobCardModal = () => {
    setShowViewModal(false);
    setViewJobCard(null);
    setViewPayments([]);
    setViewError(null);
    setViewLoading(false);
  };

  const fetchBookings = async (t: string) => {
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) return; const data = await res.json(); setBookings(data.data || []); } catch { }
  };
  const fetchList = async (t: string, p: number) => {
    setLoading(true); setError(null);
    try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards?per_page=10&page=${p}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } }); if (!res.ok) throw new Error('Failed to load job cards'); const data = await res.json(); setPage(data); }
    catch (e: any) { setError(e?.message || 'Failed to load job cards'); } finally { setLoading(false); }
  };
  const fetchProfile = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${t}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setUser(data);
      if (data?.currency) setUserCurrency(data.currency);
    } catch { }
  };

  const formatCurrency = (value: number): string => {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: userCurrency }).format(value); }
    catch { return `${userCurrency} ${value.toFixed(2)}`; }
  };

  // Derived totals
  const itemsSubtotal = items.reduce((s, it) => s + it.subamount, 0);
  const discountNum = (() => { const n = Number(form.discount); return Number.isFinite(n) && n > 0 ? +n.toFixed(2) : 0; })();
  const transportChargesNum = (() => { const n = Number(form.transport_charges); return Number.isFinite(n) && n > 0 ? +n.toFixed(2) : 0; })();
  const finalAmount = Math.max(0, +(itemsSubtotal - discountNum + transportChargesNum).toFixed(2));

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
        discount: form.discount,
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
      setForm({ status: 'open', discount: 0 });
      setItems([]); setLineService(''); setLineQty(''); setLineAmount(''); setForm({ ...form, discount: 0 });
      setTasks([]); setNewTaskTitle(''); setNewTaskDescription('');
      fetchList(token, 1);
      setSuccessMessage('Job card created successfully.');
    }
    catch (e: any) { setError(e?.message || 'Create failed'); }
  };

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

  const openTaskModal = (jobCard: JobCard) => {
    setTaskModalTarget(jobCard);
    setShowTaskModal(true);
  };

  // Task CRUD functions
  const openAddTaskForm = () => {
    setEditingTask(null);
    setTaskFormTitle('');
    setTaskFormDescription('');
    setTaskFormError(null);
    setShowTaskForm(true);
  };

  const openEditTaskForm = (task: Task) => {
    setEditingTask(task);
    setTaskFormTitle(task.title);
    setTaskFormDescription(task.description || '');
    setTaskFormError(null);
    setShowTaskForm(true);
  };

  const closeTaskForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
    setTaskFormTitle('');
    setTaskFormDescription('');
    setTaskFormError(null);
  };

  const saveTask = async () => {
    if (!token || !taskModalTarget) return;

    if (!taskFormTitle.trim()) {
      setTaskFormError('Task title is required');
      return;
    }

    try {
      const taskData = {
        title: taskFormTitle.trim(),
        description: taskFormDescription.trim() || null,
      };

      let response;
      if (editingTask) {
        // Update existing task
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${taskModalTarget.id}/tasks/${editingTask.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(taskData)
        });
      } else {
        // Create new task
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${taskModalTarget.id}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(taskData)
        });
      }

      if (response.ok) {
        const updatedTask = await response.json();
        // Update local state
        const updatedTasks = [...(taskModalTarget.tasks || [])];
        if (editingTask) {
          const taskIndex = updatedTasks.findIndex(t => t.id === editingTask.id);
          if (taskIndex !== -1) {
            updatedTasks[taskIndex] = updatedTask;
          }
        } else {
          updatedTasks.push(updatedTask);
        }
        setTaskModalTarget({ ...taskModalTarget, tasks: updatedTasks });
        // Refresh the job cards list
        fetchList(token, page?.current_page || 1);
        closeTaskForm();
        setSuccessMessage(editingTask ? 'Task updated successfully' : 'Task added successfully');
      } else {
        const error = await response.json();
        setTaskFormError(error.message || 'Failed to save task');
      }
    } catch (error) {
      console.error('Failed to save task:', error);
      setTaskFormError('Failed to save task');
    }
  };

  const deleteTask = async (task: Task) => {
    if (!token || !taskModalTarget || !task.id) return;

    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${taskModalTarget.id}/tasks/${task.id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Update local state
        const updatedTasks = (taskModalTarget.tasks || []).filter(t => t.id !== task.id);
        setTaskModalTarget({ ...taskModalTarget, tasks: updatedTasks });
        // Refresh the job cards list
        fetchList(token, page?.current_page || 1);
        setSuccessMessage('Task deleted successfully');
      } else {
        setError('Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      setError('Failed to delete task');
    }
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

  // Expense CRUD functions
  const openAddExpenseForm = () => {
    setEditingExpense(null);
    setExpenseFormEventType('');
    setExpenseFormAmount('');
    setExpenseFormDescription('');
    setExpenseFormVendor('');
    setExpenseFormDate(new Date().toISOString().split('T')[0]);
    setExpenseFormReceipt(null);
    setExpenseFormError(null);
    setShowExpenseForm(true);
  };

  const openEditExpenseForm = (expense: JobCardExpense) => {
    setEditingExpense(expense);
    setExpenseFormEventType(expense.event_type);
    setExpenseFormAmount(expense.amount.toString());
    setExpenseFormDescription(expense.description);
    setExpenseFormVendor(expense.vendor || '');
    setExpenseFormDate(expense.expense_date.split('T')[0]);
    setExpenseFormReceipt(null);
    setExpenseFormError(null);
    setShowExpenseForm(true);
  };

  const closeExpenseForm = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
    setExpenseFormEventType('');
    setExpenseFormAmount('');
    setExpenseFormDescription('');
    setExpenseFormVendor('');
    setExpenseFormDate('');
    setExpenseFormReceipt(null);
    setExpenseFormError(null);
    setExpenseFormLoading(false);
  };

  const saveExpense = async () => {
    if (!token || !expensesModalTarget) return;

    if (!expenseFormEventType.trim() || !expenseFormAmount.trim() || !expenseFormDescription.trim() || !expenseFormDate) {
      setExpenseFormError('All fields except vendor and receipt are required');
      return;
    }

    const amount = parseFloat(expenseFormAmount);
    if (isNaN(amount) || amount <= 0) {
      setExpenseFormError('Amount must be a positive number');
      return;
    }

    setExpenseFormLoading(true);
    try {
      const formData = new FormData();
      formData.append('job_card_id', expensesModalTarget.id.toString());
      formData.append('event_type', expenseFormEventType.trim());
      formData.append('amount', amount.toString());
      formData.append('description', expenseFormDescription.trim());
      formData.append('expense_date', expenseFormDate);
      if (expenseFormVendor.trim()) {
        formData.append('vendor', expenseFormVendor.trim());
      }
      if (expenseFormReceipt) {
        formData.append('receipt', expenseFormReceipt);
      }

      let response;
      if (editingExpense) {
        // Update existing expense
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-card-expenses/${editingExpense.id}`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'X-HTTP-Method-Override': 'PATCH'
          },
          body: formData
        });
      } else {
        // Create new expense
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-card-expenses`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
      }

      if (response.ok) {
        const updatedExpense = await response.json();
        // Update local state
        const updatedExpenses = [...expenses];
        if (editingExpense) {
          const expenseIndex = updatedExpenses.findIndex(e => e.id === editingExpense.id);
          if (expenseIndex !== -1) {
            updatedExpenses[expenseIndex] = updatedExpense;
          }
        } else {
          updatedExpenses.push(updatedExpense);
        }
        setExpenses(updatedExpenses);
        closeExpenseForm();
        setSuccessMessage(editingExpense ? 'Expense updated successfully' : 'Expense added successfully');
      } else {
        const error = await response.json();
        setExpenseFormError(error.message || 'Failed to save expense');
      }
    } catch (error) {
      console.error('Failed to save expense:', error);
      setExpenseFormError('Failed to save expense');
    } finally {
      setExpenseFormLoading(false);
    }
  };

  const deleteExpense = async (expense: JobCardExpense) => {
    if (!token) return;

    if (!confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-card-expenses/${expense.id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Update local state
        const updatedExpenses = expenses.filter(e => e.id !== expense.id);
        setExpenses(updatedExpenses);
        setSuccessMessage('Expense deleted successfully');
      } else {
        setError('Failed to delete expense');
      }
    } catch (error) {
      console.error('Failed to delete expense:', error);
      setError('Failed to delete expense');
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
    } catch (e: any) { setError(e?.message || 'Failed to record payment'); }
  };

  const openAdvanceModal = (it: JobCard) => {
    // Only allow if current advance is zero and no advance already collected
    const adv = Number((it as any).advance_payment ?? 0);
    if (adv > 0) return; // hidden in UI, but double guard
    setAdvanceTarget(it);
    // Use computed due (includes transport and any paid amounts if available)
    const due = computeRowDue(it);
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
          payment_type: 'advance',
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to record advance');
      setShowAdvanceModal(false);
      setAdvanceTarget(null);
      setSuccessMessage('Advance payment recorded.');
      if (token) fetchList(token, page?.current_page || 1);
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

    // Fetch payments for the job card
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${it.id}/payments`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
    }).then(res => res.ok ? res.json() : []).then(async (paymentsData) => {
      setPayments(paymentsData || []);
      // Fetch booking and customer details
      let bookingData = null;
      let customerData = null;
      try {
        const bookingRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings/${it.booking_id}`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
        });
        if (bookingRes.ok) {
          bookingData = await bookingRes.json();
          if (bookingData.customer_id) {
            const customerRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers/${bookingData.customer_id}`, {
              headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
            });
            if (customerRes.ok) {
              customerData = await customerRes.json();
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch booking/customer data:', error);
      }
      // Construct invoiceData for preview
      if (it) {
        const items = it.items?.map(item => ({
          description: item.service,
          quantity: item.qty,
          unit_price: item.amount,
          total: item.qty * item.amount
        })) || [];
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const discount = Number(it.discount || 0);
        const transport = Number(it.transport_charges || 0);
        const total = subtotal + transport - discount;
        const paidAmount = (paymentsData || []).reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
        const outstandingAmount = Math.max(0, total - paidAmount);
      }
    }).catch(() => setPayments([]));
  };

  const submitInvoice = async () => {
    if (!token || !invoiceTarget) return;
    setInvoiceError(null);
    const collect = Number(invoiceCollect || 0);
    if (!Number.isFinite(collect) || collect < 0) { setInvoiceError('Collect amount must be 0 or greater'); return; }
    if (collect > invoiceDue) { setInvoiceError('Collect amount cannot exceed current due'); return; }
    if (!selectedTemplateId) { setInvoiceError('Please select an invoice template'); return; }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${invoiceTarget.id}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          collect_amount: collect, 
          currency: userCurrency, 
          method: invoiceMethod || 'cash', 
          reference: invoiceReference || undefined,
          template_id: selectedTemplateId
        })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to create invoice');
      }

      // Handle PDF download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Compute remaining due using API response if available
      // Since we're getting a PDF response, we can't get JSON data back
      // We'll need to refresh the data or estimate the new due
      const newDue = Math.max(0, invoiceDue - collect);
      if (invoiceTarget) {
        setTempDue(prev => ({ ...prev, [invoiceTarget.id]: newDue }));
      }
      setShowInvoiceModal(false);
      setInvoiceTarget(null);
      setSelectedTemplateId(null);
      setShowTemplatePreview(false);
      setSelectedTemplateData(null);
      setSuccessMessage(`Invoice created and PDF downloaded. Remaining due: ${formatCurrency(newDue)}`);
      // Optional refetch to sync other fields; UI due is already updated instantly
      if (token) fetchList(token, page?.current_page || 1);
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
    const transportCharges = Number((it as any).transport_charges ?? 0);

    if (totalPaid !== null && Number.isFinite(totalPaid)) {
      // Due Amount = (Photography Amount + Transport Charges) - Total Paid
      // confirmed_amount is photography subtotal only, transport_charges is separate
      const totalAmount = cNum + transportCharges;
      return Math.max(0, totalAmount - totalPaid);
    }
    const adv = Number((it as any).advance_payment ?? 0);
    const advNum = Number.isFinite(adv) ? adv : 0;
    return Math.max(0, cNum + transportCharges - advNum);
  };

  const openTransportModal = (it: JobCard) => {
    // Only allow if transport charges exist and haven't been paid yet
    const transport = Number((it as any).transport_charges ?? 0);
    if (transport <= 0) return; // hidden in UI, but double guard
    setTransportTarget(it);
    setTransportAmount(transport.toFixed(2));
    setTransportMethod('cash');
    setTransportReference('');
    setTransportError(null);
    // Default transport invoice template to selected one or first available
    setTransportTemplateId(selectedTemplateId || (invoiceTemplates[0]?.id ?? null));
    setShowTransportModal(true);
  };

  const submitTransport = async () => {
    if (!token || !transportTarget) return;
    setTransportError(null);
    const amount = Number(transportAmount);
    if (!Number.isFinite(amount) || amount <= 0) { setTransportError('Amount must be a positive number'); return; }
    if (!transportTemplateId) { setTransportError('Please select an invoice template'); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards/${transportTarget.id}/transport-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/pdf', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount,
          currency: userCurrency,
          method: transportMethod || 'cash',
          reference: transportReference || undefined,
          template_id: transportTemplateId,
        })
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to create transport invoice');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transport_invoice_${transportTarget.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowTransportModal(false);
      setTransportTarget(null);
      setSuccessMessage('Transport payment recorded and invoice downloaded.');
      if (token) fetchList(token, page?.current_page || 1);
    } catch (e: any) {
      setTransportError(e?.message || 'Failed to create transport invoice');
    }
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
              {process.env.NEXT_PUBLIC_SHOW_NEW_JOB_CARD === '1' && (
                <button
                  onClick={() => setCreating(true)}
                  className="newBtn flex items-center gap-2"
                  aria-label="Create new job card"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" /> New Job Card
                </button>
              )}
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
                          <input type="number" step="0.01" className="input w-40" placeholder="0.00" value={form.discount || 0} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) || 0 })} />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Transport Charges:</label>
                          <input type="number" step="0.01" className="input w-40" placeholder="0.00" value={(form.transport_charges as any) || ''} onChange={(e) => setForm({ ...form, transport_charges: e.target.value === '' ? undefined : Number(e.target.value) })} />
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-600 mr-2">Final Amount (incl. Transport):</span>
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
            {/* View Job Card Modal */}
            {showViewModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeViewJobCardModal}>
                <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto z-[100] relative" tabIndex={-1} style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                  <div className="p-8 border-2 border-gray-100 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl">🧾</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Job Card Details</h3>
                        <p className="text-gray-600">View full details for this job card</p>
                      </div>
                      <button className="absolute right-6 top-6 text-gray-500 hover:text-gray-700" onClick={closeViewJobCardModal} aria-label="Close"> <X className="w-6 h-6" /> </button>
                    </div>

                    {viewError && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{viewError}</div>}
                    {viewLoading ? (
                      <div className="px-6 py-8 text-center text-sm text-gray-500">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                          Loading job card...
                        </div>
                      </div>
                    ) : viewJobCard ? (
                      <div className="space-y-6 px-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-500">Job Card ID</div>
                            <div className="font-mono">#{viewJobCard.id}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Status</div>
                            <div className="font-medium">{viewJobCard.status}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Title</div>
                            <div className="font-medium">{viewJobCard.title}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Booking</div>
                            <div className="font-medium">{viewJobCard.booking?.customer?.name || `#${viewJobCard.booking_id}`}</div>
                          </div>
                          <div className="md:col-span-2">
                            <div className="text-sm text-gray-500">Description</div>
                            <div>{viewJobCard.description || '-'}</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold mb-2">Items</h4>
                          {viewJobCard.items && viewJobCard.items.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Amount</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {viewJobCard.items.map((li: any, idx: number) => (
                                    <tr key={li.id || idx}>
                                      <td className="px-4 py-2 text-sm">{li.service}</td>
                                      <td className="px-4 py-2 text-sm">{li.qty}</td>
                                      <td className="px-4 py-2 text-sm">{formatCurrency(Number(li.amount || 0))}</td>
                                      <td className="px-4 py-2 text-sm">{formatCurrency(Number(li.subamount || li.sub_amount || (Number(li.amount || 0) * Number(li.qty || 0))))}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-600">No items.</p>
                          )}
                        </div>

                        {viewJobCard.tasks && viewJobCard.tasks.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold mb-2">Tasks</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {viewJobCard.tasks.map((t: any, idx: number) => (
                                <li key={t.id || idx} className="text-sm">
                                  <span className="font-medium">{t.title}</span>{t.completed ? ' — Completed' : ''}
                                  {t.description ? <span className="text-gray-500"> — {t.description}</span> : null}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Payment Summary */}
                        <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                          <h4 className="text-lg font-semibold mb-2">Payment Summary</h4>
                          {(() => {
                            const itemsTotal = (viewJobCard.items || []).reduce((sum: number, li: any) => {
                              const unit = Number(li.amount || 0);
                              const qty = Number(li.qty || 0);
                              const sub = Number(li.subamount || li.sub_amount || unit * qty);
                              return sum + sub;
                            }, 0);
                            const confirmed = Number(viewJobCard.confirmed_amount || 0);
                            const transport = Number((viewJobCard as any).transport_charges || 0);
                            const totalPaid = (viewPayments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
                            const totalDue = Math.max(0, confirmed + transport - totalPaid);
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                                  <div className="text-xs text-gray-500">Items Total</div>
                                  <div className="text-base font-semibold">{formatCurrency(itemsTotal)}</div>
                                </div>
                                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                                  <div className="text-xs text-gray-500">Confirmed Amount</div>
                                  <div className="text-base font-semibold">{formatCurrency(confirmed)}</div>
                                </div>
                                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                                  <div className="text-xs text-gray-500">Transport</div>
                                  <div className="text-base font-semibold">{formatCurrency(transport)}</div>
                                </div>
                                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                                  <div className="text-xs text-gray-500">Total Paid</div>
                                  <div className="text-base font-semibold text-green-700">{formatCurrency(totalPaid)}</div>
                                </div>
                                <div className="p-3 bg-white border border-gray-200 rounded-lg md:col-span-2">
                                  <div className="text-xs text-gray-500">Total Due</div>
                                  <div className="text-base font-semibold text-indigo-700">{formatCurrency(totalDue)}</div>
                                  <p className="text-xs text-gray-500 mt-1">Due = Confirmed + Transport − Total Paid</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {successMessage && <div className="mb-4 bg-green-50 border-2 border-green-200 text-green-800 px-6 py-3 rounded-xl">{successMessage}</div>}
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
                        <div><span className="mr-2">Final (incl. Transport):</span><span className="font-semibold">{(() => { const ca = Number((advanceTarget as any).confirmed_amount || 0); const tc = Number((advanceTarget as any).transport_charges || 0); return formatCurrency(ca + tc); })()}</span></div>
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
                            <th className="py-2 pr-4">Final Amount (incl. Transport)</th>
                            <th className="py-2 pr-4">Advance</th>
                            <th className="py-2 pr-4 font-semibold text-blue-700">Transport</th>
                            <th className="py-2 pr-4">Total Paid</th>
                            <th className="py-2 pr-4">Due Amount</th>
                            <th className="py-2 pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length === 0 ? (
                            <tr><td className="py-4 pr-4 text-gray-500" colSpan={9}>No records.</td></tr>
                          ) : rows.map(it => (
                            <tr key={it.id} onClick={() => openViewJobCardModal(it)} className="cursor-pointer hover:bg-gray-50">
                              <td className="py-2 pr-4">{
                                it.booking?.customer?.name || it.booking?.customer_id
                                  ? `${it.booking?.customer?.name || `#${it.booking?.customer_id}`}${it.booking?.location ? ` @ ${it.booking?.location}` : ''}`
                                  : `#${it.booking_id}`
                              }</td>
                              <td className="py-2 pr-4">{it.title}</td>
                              <td className="py-2 pr-4">
                                {editingStatusId === it.id ? (
                                  <select
                                    className="input bg-white text-gray-900"
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
                              <td className="py-2 pr-4">{(() => { const ca = Number(it.confirmed_amount || 0); const tc = Number((it as any).transport_charges || 0); return formatCurrency(ca + tc); })()}</td>
                              <td className="py-2 pr-4">{
                                typeof it.advance_payment === 'number'
                                  ? formatCurrency(Number(it.advance_payment))
                                  : (it.advance_payment ? String(it.advance_payment) : '-')
                              }</td>
                              <td className="py-2 pr-4">{
                                <div className={`flex items-center gap-1 font-semibold ${it.transport_charges ? ((it as any).transport_paid ? 'text-green-600 bg-green-50 px-2 py-1 rounded' : 'text-blue-600 bg-blue-50 px-2 py-1 rounded') : 'text-gray-500'}`}>
                                  <DollarSign className="w-3 h-3" />
                                  <span>{it.transport_charges ? formatCurrency(parseFloat(String(it.transport_charges))) : '-'}</span>
                                  {it.transport_charges && (
                                    <span className={`text-xs px-1 rounded ${(it as any).transport_paid ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                      {(it as any).transport_paid ? 'Paid' : 'Transport'}
                                    </span>
                                  )}
                                </div>
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
                                <div className="flex gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); openTaskModal(it); }} className="btn-secondary" title="Tasks">
                                    <CheckSquare className="w-4 h-4" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); openPaymentModal(it); }} className="btn-secondary" title="View Payment History">
                                    <Receipt className="w-4 h-4" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); openExpensesModal(it); }} className="btn-secondary" title="View Expenses">
                                    <DollarSign className="w-4 h-4" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); openInvoiceModal(it); }} className="btn-secondary" title="Invoice">
                                    <FileText className="w-4 h-4" />
                                  </button>
                                  {(() => {
                                    const adv = Number((it as any).advance_payment ?? 0);
                                    const totalPaid = typeof (it as any).total_paid === 'number' ? Number((it as any).total_paid) : 0;
                                    const showCollectAdvance = adv <= 0 && totalPaid <= 0;
                                    return showCollectAdvance ? (
                                      <button onClick={(e) => { e.stopPropagation(); openAdvanceModal(it); }} className="btn-secondary">Collect Advance</button>
                                    ) : null;
                                  })()}
                                  {Number((it as any).transport_charges ?? 0) > 0 && (
                                    (it as any).transport_paid ? (
                                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Transport Paid</span>
                                    ) : (
                                      <button onClick={(e) => { e.stopPropagation(); openTransportModal(it); }} className="btn-secondary bg-blue-50 text-blue-700 hover:bg-blue-100">Collect Transport</button>
                                    )
                                  )}
                                </div>
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
                              <th className="py-2 pr-4">Final Amount (incl. Transport)</th>
                              <th className="py-2 pr-4">Advance</th>
                              <th className="py-2 pr-4 font-semibold text-blue-700">Transport</th>
                              <th className="py-2 pr-4">Total Paid</th>
                              <th className="py-2 pr-4">Due Amount</th>
                              <th className="py-2 pr-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {progressJobs.length === 0 ? (
                              <tr><td className="py-4 pr-4 text-gray-500" colSpan={9}>No records.</td></tr>
                            ) : progressJobs.map(it => (
                              <tr key={it.id} onClick={() => openViewJobCardModal(it)} className="cursor-pointer hover:bg-gray-50">
                                <td className="py-2 pr-4">{
                                  it.booking?.customer?.name || it.booking?.customer_id
                                    ? `${it.booking?.customer?.name || `#${it.booking?.customer_id}`}${it.booking?.location ? ` @ ${it.booking?.location}` : ''}`
                                    : `#${it.booking_id}`
                                }</td>
                                <td className="py-2 pr-4">{it.title}</td>
                                <td className="py-2 pr-4">
                                  {editingStatusId === it.id ? (
                                    <select
                                      className="input bg-white text-gray-900"
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
                                <td className="py-2 pr-4">{(() => { const ca = Number(it.confirmed_amount || 0); const tc = Number((it as any).transport_charges || 0); return formatCurrency(ca + tc); })()}</td>
                                <td className="py-2 pr-4">{
                                  typeof it.advance_payment === 'number'
                                    ? formatCurrency(Number(it.advance_payment))
                                    : (it.advance_payment ? String(it.advance_payment) : '-')
                                }</td>
                                <td className="py-2 pr-4">{
                                  <div className={`flex items-center gap-1 font-semibold ${it.transport_charges ? ((it as any).transport_paid ? 'text-green-600 bg-green-50 px-2 py-1 rounded' : 'text-blue-600 bg-blue-50 px-2 py-1 rounded') : 'text-gray-500'}`}>
                                    <DollarSign className="w-3 h-3" />
                                    <span>{it.transport_charges ? formatCurrency(parseFloat(String(it.transport_charges))) : '-'}</span>
                                    {it.transport_charges && (
                                      <span className={`text-xs px-1 rounded ${(it as any).transport_paid ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {(it as any).transport_paid ? 'Paid' : 'Transport'}
                                      </span>
                                    )}
                                  </div>
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
                                  <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); openTaskModal(it); }} className="btn-secondary" title="Tasks">
                                      <CheckSquare className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); openPaymentModal(it); }} className="btn-secondary" title="View Payment History">
                                      <Receipt className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); openExpensesModal(it); }} className="btn-secondary" title="View Expenses">
                                      <DollarSign className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); openInvoiceModal(it); }} className="btn-secondary" title="Invoice">
                                      <FileText className="w-4 h-4" />
                                    </button>
                                    {Number((it as any).transport_charges ?? 0) > 0 && (
                                      (it as any).transport_paid ? (
                                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium" title="Transport Paid">✓ Transport</span>
                                      ) : (
                                        <button onClick={(e) => { e.stopPropagation(); openTransportModal(it); }} className="btn-secondary bg-blue-50 text-blue-700 hover:bg-blue-100" title="Collect Transport">
                                          <Truck className="w-4 h-4" />
                                        </button>
                                      )
                                    )}
                                  </div>
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
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Create Invoice</h3>
                  {invoiceError && <div className="mb-3 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-2 rounded-xl">{invoiceError}</div>}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Invoice Template <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        <select
                          className="input flex-1"
                          value={selectedTemplateId || ''}
                          onChange={e => {
                            const id = e.target.value ? Number(e.target.value) : null;
                            setSelectedTemplateId(id);
                            setShowTemplatePreview(false); // Hide preview when template changes
                            setSelectedTemplateData(null);
                          }}
                        >
                          <option value="">Select a template... ({invoiceTemplates.length} available)</option>
                          {invoiceTemplates.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedTemplateId || !token) return;
                            try {
                              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoice-templates/${selectedTemplateId}`, {
                                headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
                              });
                              if (res.ok) {
                                const templateData = await res.json();
                                setSelectedTemplateData(templateData);
                                setShowTemplatePreview(true);
                              } else {
                                console.error('Failed to load template');
                              }
                            } catch (error) {
                              console.error('Error loading template:', error);
                            }
                          }}
                          className="btn-secondary px-4 py-2"
                          disabled={!selectedTemplateId}
                          title="Preview selected template"
                        >
                          Preview
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Choose an invoice template for invoice creation</p>
                    </div>
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
                        <div><span className="mr-2">Final (incl. Transport):</span><span className="font-semibold">{(() => { const ca = Number((invoiceTarget as any).confirmed_amount || 0); const tc = Number((invoiceTarget as any).transport_charges || 0); return formatCurrency(ca + tc); })()}</span></div>
                        <div><span className="mr-2">Total Paid:</span><span className="font-semibold">{formatCurrency(typeof (invoiceTarget as any).total_paid === 'number' ? Number((invoiceTarget as any).total_paid) : Number((invoiceTarget as any).advance_payment || 0))}</span></div>
                        <div><span className="mr-2">Current Due:</span><span className="font-semibold">{formatCurrency(invoiceDue)}</span></div>
                        <div><span className="mr-2">Remaining Due:</span><span className="font-semibold">{formatCurrency(invoiceRemaining)}</span></div>
                      </div>
                    )}
                  </div>

                  {/* Template Preview */}
                  {showTemplatePreview && selectedTemplateData && (
                    <div className="mt-6 border-t pt-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Template Preview</h4>
                      <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-auto">
                        <InvoiceTemplatePreview
                          templateData={{
                            layout: {
                              width: selectedTemplateData.page_width || 595,
                              height: selectedTemplateData.page_height || 842,
                              unit: 'px',
                              margin: selectedTemplateData.margins || { top: 10, right: 10, bottom: 10, left: 10 }
                            },
                            components: selectedTemplateData.elements || []
                          }}
                          zoom={0.5}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTemplatePreview(false)}
                        className="mt-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Hide Preview
                      </button>
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-end gap-3">
                    <button onClick={() => { setShowInvoiceModal(false); setInvoiceTarget(null); setSelectedTemplateId(null); setShowTemplatePreview(false); setSelectedTemplateData(null); }} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                    <button onClick={submitInvoice} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Create</button>
                  </div>
                </div>
              </div>
            )}
            {/* Transport Collection Modal */}
            {showTransportModal && transportTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    Collect Transport Payment
                  </h3>
                  {transportError && <div className="mb-3 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-2 rounded-xl">{transportError}</div>}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Transport Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        placeholder="0.00"
                        value={transportAmount}
                        onChange={e => setTransportAmount(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">Transport charges for this job card</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Invoice Template <span className="text-red-500">*</span></label>
                      <select
                        className="input"
                        value={transportTemplateId || ''}
                        onChange={e => setTransportTemplateId(e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Select a template... ({invoiceTemplates.length} available)</option>
                        {invoiceTemplates.map(template => (
                          <option key={template.id} value={template.id}>{template.name || `Template #${template.id}`}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
                      <input className="input" placeholder="cash / card / bank" value={transportMethod} onChange={e => setTransportMethod(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Reference (optional)</label>
                      <input className="input" placeholder="#ref" value={transportReference} onChange={e => setTransportReference(e.target.value)} />
                    </div>
                    {transportTarget && (
                      <div className="text-right text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                        <div><span className="mr-2">Job Card:</span><span className="font-semibold">{transportTarget.title}</span></div>
                        <div><span className="mr-2">Transport Charges:</span><span className="font-semibold text-blue-700">{formatCurrency(Number((transportTarget as any).transport_charges || 0))}</span></div>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex items-center justify-end gap-3">
                    <button onClick={() => { setShowTransportModal(false); setTransportTarget(null); }} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                    <button onClick={submitTransport} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Collect Payment</button>
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
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">Tasks</h4>
                      <button
                        onClick={openAddTaskForm}
                        className="btn-primary flex items-center gap-2 text-sm"
                      >
                        <Plus className="w-4 h-4" /> Add Task
                      </button>
                    </div>
                    {(taskModalTarget.tasks || []).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📝</div>
                        <div>No tasks added yet</div>
                        <div className="text-sm">Click "Add Task" to create your first task</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(taskModalTarget.tasks || []).map((task, idx) => (
                          <div key={task.id || idx} className={`p-4 rounded-xl border-2 transition-all duration-200 ${task.completed
                              ? 'bg-green-50 border-green-200'
                              : 'bg-white border-gray-200 hover:border-purple-300'
                            }`}>
                            <div className="flex items-start gap-3">
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
                                {!task.completed && (
                                  <div className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                                    ⏳ Pending
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={async () => {
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
                                  disabled={updatingTaskId === task.id}
                                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    task.completed
                                      ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                                  } disabled:opacity-50`}
                                  title={task.completed ? 'Mark as pending' : 'Mark as complete'}
                                >
                                  {updatingTaskId === task.id ? '...' : (task.completed ? 'Mark Pending' : 'Mark Complete')}
                                </button>
                                <button
                                  onClick={() => openEditTaskForm(task)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Edit task"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
            {/* Task Form Modal */}
            {showTaskForm && taskModalTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {editingTask ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {editingTask ? 'Edit Task' : 'Add New Task'}
                    </h3>
                    <button
                      onClick={closeTaskForm}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {taskFormError && (
                    <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-2 rounded-xl">
                      {taskFormError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Task Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Enter task title"
                        value={taskFormTitle}
                        onChange={(e) => setTaskFormTitle(e.target.value)}
                        maxLength={255}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        className="input"
                        placeholder="Enter task description"
                        value={taskFormDescription}
                        onChange={(e) => setTaskFormDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button onClick={closeTaskForm} className="btn-secondary flex items-center gap-2">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button onClick={saveTask} className="btn-primary flex items-center gap-2">
                      <Save className="w-4 h-4" /> {editingTask ? 'Update' : 'Add'} Task
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Expense Form Modal */}
            {showExpenseForm && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {editingExpense ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                    </h3>
                    <button
                      onClick={closeExpenseForm}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {expenseFormError && (
                    <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-2 rounded-xl">
                      {expenseFormError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Event Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="input"
                        value={expenseFormEventType}
                        onChange={(e) => setExpenseFormEventType(e.target.value)}
                      >
                        <option value="">Select event type</option>
                        <option value="Photography">Photography</option>
                        <option value="Videography">Videography</option>
                        <option value="Editing">Editing</option>
                        <option value="Travel">Travel</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Venue">Venue</option>
                        <option value="Catering">Catering</option>
                        <option value="Decorations">Decorations</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Accommodation">Accommodation</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input"
                        placeholder="0.00"
                        value={expenseFormAmount}
                        onChange={(e) => setExpenseFormAmount(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        className="input"
                        placeholder="Describe the expense"
                        value={expenseFormDescription}
                        onChange={(e) => setExpenseFormDescription(e.target.value)}
                        rows={3}
                        maxLength={1000}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vendor (Optional)
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Vendor name"
                        value={expenseFormVendor}
                        onChange={(e) => setExpenseFormVendor(e.target.value)}
                        maxLength={255}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expense Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        className="input"
                        value={expenseFormDate}
                        onChange={(e) => setExpenseFormDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Receipt (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="input"
                        onChange={(e) => setExpenseFormReceipt(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Accepted formats: JPG, PNG, PDF (max 5MB)
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button onClick={closeExpenseForm} className="btn-secondary flex items-center gap-2" disabled={expenseFormLoading}>
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button onClick={saveExpense} className="btn-primary flex items-center gap-2" disabled={expenseFormLoading}>
                      <Save className="w-4 h-4" /> {expenseFormLoading ? 'Saving...' : (editingExpense ? 'Update' : 'Add')} Expense
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

                  {/* Add Expense Button */}
                  <div className="mb-4 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openAddExpenseForm();
                      }}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Expense
                    </button>
                  </div>

                  {expenses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <div>No expenses recorded for this job card</div>
                      <div className="text-sm">Click "Add Expense" to record your first expense</div>
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
                            <th className="py-2 pr-4">Actions</th>
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
                              <td className="py-2 pr-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openEditExpenseForm(expense)}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="Edit expense"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteExpense(expense)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Delete expense"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
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
