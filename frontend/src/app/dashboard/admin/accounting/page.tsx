"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, X, ArrowUpRight, ArrowDownRight, Calendar, Filter, RefreshCw } from "lucide-react";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Entry { id: number; type: 'income' | 'expense'; amount: number; category?: string; date: string; notes?: string; is_payment?: boolean; balance: number; currency?: string }
interface Payment { id: number; amount: number; created_at: string; photo_title?: string; user_name?: string; currency?: string }
interface JobCardExpense { id: number; job_card_id: number; event_type: string; amount: number; description: string; expense_date: string; vendor?: string; receipt_path?: string; metadata?: any; job_card?: { id: number; title: string } }
interface Page<T> { data: T[]; current_page: number; last_page: number; }

export default function AccountingPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page<Entry> | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Entry>>({ type: 'expense' });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Entry>>({});
  const [creatingJobCardExpense, setCreatingJobCardExpense] = useState(false);
  const [jobCardExpenseForm, setJobCardExpenseForm] = useState<Partial<JobCardExpense & { receipt?: File }>>({});
  const [jobCards, setJobCards] = useState<Array<{id: number, title: string}>>([]);
  const [userCurrency, setUserCurrency] = useState<string>('USD');
  const [activeTab, setActiveTab] = useState<string>('entries');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showIncome, setShowIncome] = useState<boolean>(true);
  const [showExpense, setShowExpense] = useState<boolean>(true);
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [expenseType, setExpenseType] = useState<string>('general');
  const [jobCardExpenses, setJobCardExpenses] = useState<Page<JobCardExpense> | null>(null);
  const [eventTypes, setEventTypes] = useState<Record<string, string>>({});
  const chartRef = useRef<SVGSVGElement>(null as any);
  const donutRef = useRef<SVGSVGElement>(null as any);
  const [downloadingReport, setDownloadingReport] = useState<boolean>(false);
  // View modals
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [viewEntry, setViewEntry] = useState<Entry | null>(null);
  const [showJcExpenseModal, setShowJcExpenseModal] = useState(false);
  const [viewJcExpense, setViewJcExpense] = useState<JobCardExpense | null>(null);

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
    return symbols[currency] || currency;
  };

  const formatMoney = (amount: number, currency: string) => {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount)); }
    catch { return `${getCurrencySymbol(currency)}${Number(amount).toFixed(2)}`; }
  };

  const setQuickRange = (key: 'today' | 'last7' | 'month' | 'ytd' | 'clear') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if (key === 'clear') { setStartDate(''); setEndDate(''); return; }
    if (key === 'today') {
      const s = toStr(now); setStartDate(s); setEndDate(s); return;
    }
    if (key === 'last7') {
      const end = new Date(now); const start = new Date(now); start.setDate(start.getDate()-6);
      setStartDate(toStr(start)); setEndDate(toStr(end)); return;
    }
    if (key === 'month') {
      const end = new Date(now.getFullYear(), now.getMonth()+1, 0);
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(toStr(start)); setEndDate(toStr(end)); return;
    }
    if (key === 'ytd') {
      const end = now; const start = new Date(now.getFullYear(), 0, 1);
      setStartDate(toStr(start)); setEndDate(toStr(end)); return;
    }
  };

  const dateKey = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  };

  const buildDailySeries = (entries: Entry[], startTs: number, endTs: number) => {
    const byDay: Record<string, { income: number; expense: number }> = {};
    const sorted = [...entries].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (const e of sorted) {
      const t = new Date(e.date).getTime();
      if (t < startTs || t > endTs) continue;
      const k = dateKey(new Date(t));
      byDay[k] ||= { income: 0, expense: 0 };
      if (e.type === 'income') byDay[k].income += Number(e.amount); else byDay[k].expense += Number(e.amount);
    }
    // Build continuous labels from start to end
    const labels: string[] = [];
    const income: number[] = [];
    const expense: number[] = [];
    const balance: number[] = [];
    let run = 0;
    const dayMs = 24*60*60*1000;
    for (let t = startTs; t <= endTs; t += dayMs) {
      const k = dateKey(new Date(t));
      const val = byDay[k] || { income: 0, expense: 0 };
      run += (val.income - val.expense);
      labels.push(k);
      income.push(val.income);
      expense.push(val.expense);
      balance.push(run);
    }
    return { labels, income, expense, balance };
  };

  const ChartSVG = ({ labels, series, svgRef }: { labels: string[]; series: Array<{ name: string; color: string; data: number[] }>; svgRef?: React.RefObject<SVGSVGElement> }) => {
    const width = 900; const height = 260; const m = { top: 20, right: 24, bottom: 36, left: 48 };
    const W = width - m.left - m.right; const H = height - m.top - m.bottom;
    const allVals = series.flatMap(s => s.data);
    const minVal = Math.min(0, ...allVals);
    const maxVal = Math.max(0, ...allVals);
    const yScale = (v: number) => H - (H * (v - minVal)) / (maxVal - minVal || 1);
    const xScale = (i: number) => (W * (labels.length <= 1 ? 0 : i / (labels.length - 1)));
    const pathFor = (data: number[]) => data.map((v,i) => `${i===0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`).join(' ');
    const yTicks = 4;
    const tickVals = Array.from({ length: yTicks + 1 }, (_,i) => minVal + (i*(maxVal-minVal))/yTicks);
    const showEvery = Math.max(1, Math.floor(labels.length / 6));
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const onMove = (evt: React.MouseEvent<SVGRectElement, MouseEvent>) => {
      const wrap = wrapperRef.current; if (!wrap) return;
      const bounds = wrap.getBoundingClientRect();
      const x = evt.clientX - bounds.left - m.left;
      const clampedX = Math.max(0, Math.min(W, x));
      const idx = Math.round((clampedX / (W || 1)) * (labels.length - 1));
      setHoverIdx(Math.max(0, Math.min(labels.length - 1, idx)));
      const seriesYs = series.map(s => yScale(s.data[idx] ?? 0));
      const topY = Math.min(...seriesYs);
      setHoverPos({ x: m.left + xScale(idx), y: m.top + topY });
    };
    const onLeave = () => { setHoverIdx(null); setHoverPos(null); };

    return (
      <div ref={wrapperRef} className="w-full overflow-x-auto relative">
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full select-none">
          <g transform={`translate(${m.left},${m.top})`}>
            {/* Gridlines */}
            {tickVals.map((tv, idx) => (
              <line key={idx} x1={0} x2={W} y1={yScale(tv)} y2={yScale(tv)} stroke="#e5e7eb" strokeDasharray="4 4" />
            ))}
            {/* Axes */}
            <line x1={0} x2={W} y1={H} y2={H} stroke="#9ca3af" />
            <line x1={0} x2={0} y1={0} y2={H} stroke="#9ca3af" />
            {/* Series */}
            {series.map((s, idx) => (
              <g key={idx}>
                <path d={pathFor(s.data)} fill="none" stroke={s.color} strokeWidth={2} />
                {s.data.map((v,i) => (
                  <circle key={i} cx={xScale(i)} cy={yScale(v)} r={(hoverIdx===i)?3.5:2.5} fill={s.color} />
                ))}
              </g>
            ))}
            {/* Hover crosshair */}
            {hoverIdx !== null && (
              <line x1={xScale(hoverIdx)} x2={xScale(hoverIdx)} y1={0} y2={H} stroke="#d1d5db" strokeDasharray="4 4" />
            )}
            {/* Axis labels */}
            {labels.map((lab, i) => (
              i % showEvery === 0 ? (
                <text key={i} x={xScale(i)} y={H + 18} textAnchor="middle" fontSize="10" fill="#6b7280">{lab.slice(5)}</text>
              ) : null
            ))}
            {tickVals.map((tv, i) => (
              <text key={i} x={-8} y={yScale(tv)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#6b7280">{formatMoney(tv, userCurrency)}</text>
            ))}
            {/* Mouse capture */}
            <rect x={0} y={0} width={W} height={H} fill="transparent" onMouseMove={onMove} onMouseLeave={onLeave} />
          </g>
        </svg>
        {/* Tooltip */}
        {hoverIdx !== null && hoverPos && (
          <div style={{ left: hoverPos.x + 8, top: hoverPos.y + 8 }} className="absolute z-10 bg-white/95 backdrop-blur rounded-lg shadow-lg ring-1 ring-gray-200 p-2 text-xs">
            <div className="font-semibold text-gray-800 mb-1">{labels[hoverIdx]}</div>
            {series.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-gray-700">{s.name}:</span>
                <span className="font-semibold">{formatMoney(s.data[hoverIdx] ?? 0, userCurrency)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
          {series.map((s,i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>
    );
  };

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
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00000022" />
          </filter>
        </defs>
        <g filter="url(#softShadow)">
          {/* Track */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={thickness} />
          {/* Income segment */}
          {incFrac > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={colors.income}
              strokeWidth={thickness}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeDasharray={`${incFrac * C} ${C}`}
              strokeDashoffset={animated ? 0 : incFrac * C}
              style={{ transition: 'stroke-dashoffset 800ms ease' }}
            />
          )}
          {/* Expense segment */}
          {expFrac > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={colors.expense}
              strokeWidth={thickness}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeDasharray={`${expFrac * C} ${C}`}
              strokeDashoffset={animated ? incFrac * C : incFrac * C + expFrac * C}
              style={{ transition: 'stroke-dashoffset 800ms ease' }}
            />
          )}
        </g>
        {/* Labels on arcs */}
        {incFrac > 0 && (() => {
          const p = labelPos(0, incFrac);
          const pct = Math.round(incFrac * 100);
          return (
            <g key="inc-label" transform={`translate(${p.x},${p.y})`}>
              <rect x={-36} y={-18} rx={10} ry={10} width={72} height={36} fill="#ecfdf5" stroke="#a7f3d0" />
              <text x={0} y={-2} textAnchor="middle" fontSize="11" fill="#065f46" fontWeight={700}>{pct}%</text>
              <text x={0} y={12} textAnchor="middle" fontSize="10" fill="#065f46">{formatMoney(income, userCurrency)}</text>
            </g>
          );
        })()}
        {expFrac > 0 && (() => {
          const p = labelPos(incFrac, expFrac);
          const pct = Math.round(expFrac * 100);
          return (
            <g key="exp-label" transform={`translate(${p.x},${p.y})`}>
              <rect x={-36} y={-18} rx={10} ry={10} width={72} height={36} fill="#fef2f2" stroke="#fecaca" />
              <text x={0} y={-2} textAnchor="middle" fontSize="11" fill="#7f1d1d" fontWeight={700}>{pct}%</text>
              <text x={0} y={12} textAnchor="middle" fontSize="10" fill="#7f1d1d">{formatMoney(expense, userCurrency)}</text>
            </g>
          );
        })()}
        {/* Center label */}
        <g>
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fill="#6b7280">{centerTop || 'Net'}</text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="16" fontWeight={700} fill="#111827">{centerBottom || formatMoney((income - expense), userCurrency)}</text>
        </g>
      </svg>
    );
  };

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!t) { router.replace('/login'); return; }
    // Enforce plan gating for business suite
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    setToken(t);
    fetchUserCurrency(t).then(() => {
      fetchList(t, 1);
      fetchJobCardExpenses(t, 1);
      fetchEventTypes(t);
      fetchJobCards(t);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserCurrency = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setUserCurrency((data?.currency as string) || 'USD');
      }
    } catch (e) { /* ignore */ }
  };

  const fetchJobCardExpenses = async (t: string, p: number = 1) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({
        per_page: '1000',
        page: p.toString(),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-card-expenses?${params}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      const data = res.ok ? await res.json() : { data: [] };
      setJobCardExpenses(data);
    } catch (e: any) { setError(e?.message || 'Failed to load job card expenses'); } finally { setLoading(false); }
  };

  const fetchEventTypes = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-card-expenses/event-types`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setEventTypes(data);
      }
    } catch (e) { /* ignore */ }
  };

  const fetchJobCards = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-cards?per_page=1000`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setJobCards(data.data || []);
      }
    } catch (e) { /* ignore */ }
  };

  const fetchList = async (t: string, p: number) => {
    setLoading(true); setError(null);
    try {
      // Fetch payments as income
      const paymentsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments?per_page=1000&page=1`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      const paymentsData = paymentsRes.ok ? await paymentsRes.json() : { data: [] };
      const paymentEntries: Entry[] = paymentsData.data.map((pay: Payment) => ({
        id: pay.id,
        type: 'income' as const,
        amount: Number(pay.amount),
        category: 'Payment',
        date: pay.created_at,
        notes: `Payment for ${pay.photo_title || 'photo'} by ${pay.user_name || 'user'}`,
        is_payment: true,
        currency: userCurrency
      }));

      // Fetch manual entries
      const entriesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/accounting?per_page=1000&page=1&expense_type=general`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      const entriesData = entriesRes.ok ? await entriesRes.json() : { data: [] };

      // Combine and sort by date, force display currency to user's selected currency
      const allEntries = [
        ...paymentEntries,
        ...entriesData.data.map((e: any) => ({ ...e, currency: userCurrency }))
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let balance = 0;
      const entriesWithBalance = allEntries.map(entry => {
        if (entry.type === 'income') balance += Number(entry.amount);
        else balance -= Number(entry.amount);
        return { ...entry, balance };
      });
      
      setPage({
        data: entriesWithBalance.reverse(), // Show latest first
        current_page: 1,
        last_page: 1
      });
    } catch (e: any) { setError(e?.message || 'Failed to load entries'); } finally { setLoading(false); }
  };

  const createItem = async () => {
    if (!token) return; try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/accounting`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) }); const data = await res.json(); if (!res.ok) throw new Error(data?.message || 'Create failed'); setCreating(false); setForm({ type: 'expense' }); fetchList(token, 1); } catch (e: any) { setError(e?.message || 'Create failed'); }
  };
  const startEdit = (it: Entry) => { setEditId(it.id); setEditForm({ ...it }); };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };
  const saveEdit = async (id: number) => { if (!token) return; try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/accounting/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(editForm) }); const data = await res.json(); if (!res.ok) throw new Error(data?.message || 'Update failed'); cancelEdit(); fetchList(token, page?.current_page || 1); } catch (e: any) { setError(e?.message || 'Update failed'); } };
  const remove = async (id: number) => { if (!token) return; if (!confirm('Delete this entry?')) return; try { const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/accounting/${id}`, { method: 'DELETE', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } }); if (!res.ok) throw new Error('Delete failed'); fetchList(token, page?.current_page || 1); } catch (e: any) { setError(e?.message || 'Delete failed'); } };

  const openEntryModal = (entry: Entry) => { setViewEntry(entry); setShowEntryModal(true); };
  const closeEntryModal = () => { setShowEntryModal(false); setViewEntry(null); };
  const openJcExpenseModal = (expense: JobCardExpense) => { setViewJcExpense(expense); setShowJcExpenseModal(true); };
  const closeJcExpenseModal = () => { setShowJcExpenseModal(false); setViewJcExpense(null); };

  const createJobCardExpense = async () => {
    if (!token) return;
    try {
      const formData = new FormData();
      Object.entries(jobCardExpenseForm).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'receipt' && value instanceof File) {
            formData.append('receipt', value);
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/job-card-expenses`, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Create failed');
      setCreatingJobCardExpense(false);
      setJobCardExpenseForm({});
      fetchJobCardExpenses(token, 1);
    } catch (e: any) { setError(e?.message || 'Create failed'); }
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <AdminSectionHeader title="Accounting" subtitle="View all income from payments and manage expenses">
              {expenseType === 'general' ? (
                <button
                  onClick={() => setCreating(true)}
                  className="newBtn flex items-center gap-2"
                  aria-label="Add new expense"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add Expense
                </button>
              ) : (
                <button
                  onClick={() => setCreatingJobCardExpense(true)}
                  className="newBtn flex items-center gap-2"
                  aria-label="Add job card expense"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add Job Card Expense
                </button>
              )}
            </AdminSectionHeader>

            {/* Expense Type Selector */}
            <div className="mb-6">
              <div className="inline-flex p-1 rounded-xl bg-white ring-1 ring-gray-200 shadow-xs">
                <button
                  onClick={() => setExpenseType('general')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${expenseType === 'general' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  General Expenses
                </button>
                <button
                  onClick={() => setExpenseType('job_card')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${expenseType === 'job_card' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Job Card Expenses
                </button>
              </div>
            </div>
            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>}
            {creating && (
              <div className="mb-6 p-4 border-2 border-gray-100 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select className="input" value={form.type || 'income'} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                  <input type="number" step="0.01" className="input" placeholder="Amount" value={form.amount?.toString() || ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
                  <input className="input" placeholder="Category" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <input type="datetime-local" className="input" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  <textarea className="input md:col-span-2" placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={createItem} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
                  <button onClick={() => setCreating(false)} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                </div>
              </div>
            )}

            {/* Job Card Expense Creation Form */}
            {creatingJobCardExpense && (
              <div className="mb-6 p-4 border-2 border-gray-100 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    className="input"
                    value={jobCardExpenseForm.job_card_id?.toString() || ''}
                    onChange={(e) => setJobCardExpenseForm({ ...jobCardExpenseForm, job_card_id: Number(e.target.value) })}
                  >
                    <option value="">Select Job Card</option>
                    {jobCards.map(jobCard => (
                      <option key={jobCard.id} value={jobCard.id}>
                        #{jobCard.id} - {jobCard.title}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={jobCardExpenseForm.event_type || ''}
                    onChange={(e) => setJobCardExpenseForm({ ...jobCardExpenseForm, event_type: e.target.value })}
                  >
                    <option value="">Select Event Type</option>
                    <option value="wedding_shoot">Wedding shoot</option>
                    <option value="pre_shoot">Pre shoot</option>
                    <option value="homecoming_shoot">Home Comming</option>
                    <option value="other_shoot">Other Shoot</option>
                    {Object.entries(eventTypes).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Amount"
                    value={jobCardExpenseForm.amount?.toString() || ''}
                    onChange={(e) => setJobCardExpenseForm({ ...jobCardExpenseForm, amount: Number(e.target.value) })}
                  />
                  <input
                    type="datetime-local"
                    className="input"
                    value={jobCardExpenseForm.expense_date || ''}
                    onChange={(e) => setJobCardExpenseForm({ ...jobCardExpenseForm, expense_date: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Vendor (optional)"
                    value={jobCardExpenseForm.vendor || ''}
                    onChange={(e) => setJobCardExpenseForm({ ...jobCardExpenseForm, vendor: e.target.value })}
                  />
                  <input
                    type="file"
                    className="input"
                    accept="image/*,.pdf"
                    onChange={(e) => setJobCardExpenseForm({ ...jobCardExpenseForm, receipt: e.target.files?.[0] })}
                  />
                  <textarea
                    className="input md:col-span-2"
                    placeholder="Description"
                    value={jobCardExpenseForm.description || ''}
                    onChange={(e) => setJobCardExpenseForm({ ...jobCardExpenseForm, description: e.target.value })}
                  />
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={createJobCardExpense} className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save
                  </button>
                  <button onClick={() => setCreatingJobCardExpense(false)} className="btn-secondary flex items-center gap-2">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              </div>
            )}

            {loading ? <p className="text-gray-600">Loading...</p> : (
              <div className="overflow-x-auto">
                {/* Filters and Tabs */}
                <div className="mb-5">
                  <div className="rounded-2xl border-2 border-gray-100 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm">
                    <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                      <div className="flex items-end gap-3 flex-1">
                        <div className="w-full max-w-[260px]">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
                          <div className="relative">
                            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input type="date" className="input pl-9 focus:ring-2 focus:ring-indigo-200" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                          </div>
                        </div>
                        <div className="w-full max-w-[260px]">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
                          <div className="relative">
                            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input type="date" className="input pl-9 focus:ring-2 focus:ring-indigo-200" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                          </div>
                        </div>
                        <button onClick={() => setQuickRange('clear')} className="btn-secondary inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Reset</button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-gray-500 inline-flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Quick Ranges:</span>
                        <button onClick={() => setQuickRange('today')} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white ring-1 ring-gray-200 hover:bg-gray-50">Today</button>
                        <button onClick={() => setQuickRange('last7')} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white ring-1 ring-gray-200 hover:bg-gray-50">Last 7 Days</button>
                        <button onClick={() => setQuickRange('month')} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white ring-1 ring-gray-200 hover:bg-gray-50">This Month</button>
                        <button onClick={() => setQuickRange('ytd')} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white ring-1 ring-gray-200 hover:bg-gray-50">YTD</button>
                      </div>
                      <div className="flex items-center">
                        <div className="inline-flex p-1 rounded-xl bg-white ring-1 ring-gray-200 shadow-xs">
                          <button onClick={() => setActiveTab('entries')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${activeTab==='entries' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>Entries</button>
                          <button onClick={() => setActiveTab('pl')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${activeTab==='pl' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>P&L</button>
                          <button onClick={() => setActiveTab('balance')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${activeTab==='balance' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>Balance Sheet</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Derived data */}
                {(() => {
                  const all = page?.data || [];
                  const jobCardExpenseData = jobCardExpenses?.data || [];
                  const startTs = startDate ? new Date(startDate).getTime() : -Infinity;
                  const endTs = endDate ? new Date(endDate).getTime() + 24*60*60*1000 - 1 : Infinity; // inclusive end
                  const filtered = all.filter(e => {
                    const t = new Date(e.date).getTime();
                    return t >= startTs && t <= endTs;
                  });

                  // Filter job card expenses by date
                  const filteredJobCardExpenses = jobCardExpenseData.filter(e => {
                    const t = new Date(e.expense_date).getTime();
                    return t >= startTs && t <= endTs;
                  });

                  const totals = filtered.reduce((acc, e) => {
                    if (e.type === 'income') acc.income += Number(e.amount); else acc.expense += Number(e.amount);
                    return acc;
                  }, { income: 0, expense: 0 });

                  // Add job card expenses to total expenses
                  totals.expense += filteredJobCardExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

                  const net = totals.income - totals.expense;

                  const balanceAsOfEnd = all.reduce((bal, e) => {
                    const t = new Date(e.date).getTime();
                    if (t <= endTs) { return e.type === 'income' ? bal + Number(e.amount) : bal - Number(e.amount); }
                    return bal;
                  }, 0);

                  if (activeTab === 'pl') {
                    return (
                      <div className="rounded-2xl border-2 border-gray-100 overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                          <div className="p-6">
                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Income</div>
                            <div className="text-2xl font-bold text-emerald-700">{formatMoney(totals.income, userCurrency)}</div>
                          </div>
                          <div className="p-6">
                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Expenses</div>
                            <div className="text-2xl font-bold text-rose-700">{formatMoney(totals.expense, userCurrency)}</div>
                          </div>
                          <div className="p-6">
                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Net Profit</div>
                            <div className={`text-2xl font-bold ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatMoney(net, userCurrency)}</div>
                          </div>
                        </div>
                        {/* Donut chart: Income vs Expense */}
                        <div className="p-6 border-t-2 border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div className="flex items-center justify-center">
                              <DonutChart svgRef={donutRef} income={totals.income} expense={totals.expense} centerTop="Net" centerBottom={formatMoney(net, userCurrency)} />
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 rounded-xl ring-1 ring-emerald-200 bg-emerald-50">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                                  <span className="font-medium text-emerald-800">Income</span>
                                </div>
                                <div className="font-semibold text-emerald-700">{formatMoney(totals.income, userCurrency)}</div>
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-xl ring-1 ring-rose-200 bg-rose-50">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                                  <span className="font-medium text-rose-800">Expense</span>
                                </div>
                                <div className="font-semibold text-rose-700">{formatMoney(totals.expense, userCurrency)}</div>
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-xl ring-1 ring-indigo-200 bg-indigo-50">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                  <span className="font-medium text-indigo-800">Net</span>
                                </div>
                                <div className={`font-semibold ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatMoney(net, userCurrency)}</div>
                              </div>
                              <div>
                                <button onClick={() => {
                                  const svg = donutRef.current; if (!svg) return;
                                  const xml = new XMLSerializer().serializeToString(svg);
                                  const svg64 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
                                  const img = new Image();
                                  const width = svg.viewBox.baseVal.width || svg.clientWidth || 220;
                                  const height = svg.viewBox.baseVal.height || svg.clientHeight || 220;
                                  img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = width; canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,width,height); ctx.drawImage(img, 0, 0); }
                                    const a = document.createElement('a');
                                    a.href = canvas.toDataURL('image/png');
                                    a.download = `pl-donut-${Date.now()}.png`;
                                    a.click();
                                  };
                                  img.src = svg64;
                                }} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white ring-1 ring-gray-200 hover:bg-gray-50">Export PNG</button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="p-6 border-t-2 border-gray-100">
                          <div className="text-sm text-gray-500 mb-2">Breakdown by category</div>
                          <table className="w-full">
                            <thead>
                              <tr className="text-left text-gray-500">
                                <th className="py-2 pr-4">Category</th>
                                <th className="py-2 pr-4">Income</th>
                                <th className="py-2 pr-4">Expense</th>
                                <th className="py-2 pr-4">Net</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Combine general expenses and job card expenses
                                const generalByCategory = filtered.reduce((acc: any, e) => {
                                  const k = e.category || 'General';
                                  acc[k] ||= { income: 0, expense: 0 };
                                  if (e.type === 'income') acc[k].income += Number(e.amount); else acc[k].expense += Number(e.amount);
                                  return acc;
                                }, {});

                                const jobCardByCategory = filteredJobCardExpenses.reduce((acc: any, e) => {
                                  const k = eventTypes[e.event_type] || e.event_type;
                                  acc[k] ||= { income: 0, expense: 0 };
                                  acc[k].expense += Number(e.amount);
                                  return acc;
                                }, {});

                                // Merge the two
                                const allCategories = { ...generalByCategory, ...jobCardByCategory };
                                Object.keys(jobCardByCategory).forEach(cat => {
                                  if (generalByCategory[cat]) {
                                    allCategories[cat].expense += jobCardByCategory[cat].expense;
                                  }
                                });

                                return Object.entries(allCategories).map(([cat, v]: any) => {
                                  const nn = v.income - v.expense;
                                  return (
                                    <tr key={cat} className="border-t border-gray-100">
                                      <td className="py-2 pr-4">{cat}</td>
                                      <td className="py-2 pr-4 text-emerald-700 font-medium">{formatMoney(v.income, userCurrency)}</td>
                                      <td className="py-2 pr-4 text-rose-700 font-medium">{formatMoney(v.expense, userCurrency)}</td>
                                      <td className={`py-2 pr-4 font-semibold ${nn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatMoney(nn, userCurrency)}</td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }

                  if (activeTab === 'balance') {
                    return (
                      <div className="rounded-2xl border-2 border-gray-100 overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                          <div className="p-6">
                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">Assets</div>
                            <div className="flex items-center justify-between py-2">
                              <div className="font-medium">Cash</div>
                              <div className="font-semibold text-emerald-700">{formatMoney(balanceAsOfEnd, userCurrency)}</div>
                            </div>
                          </div>
                          <div className="p-6">
                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">Liabilities & Equity</div>
                            <div className="flex items-center justify-between py-2">
                              <div className="font-medium">Equity</div>
                              <div className="font-semibold">{formatMoney(balanceAsOfEnd, userCurrency)}</div>
                            </div>
                          </div>
                        </div>
                        {/* PDF generation button removed per request */}
                      </div>
                    );
                  }

                  return null;
                })()}

                {activeTab === 'entries' ? (
                <div>
                <div className="space-y-8">
                {expenseType === 'general' && (
                <table className="adminTable" role="table" aria-label="Accounting entries table">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Credit/Debit</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Currency</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Notes</th>
                      <th className="py-2 pr-4">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page?.data?.map((it: Entry) => {
                      const isIncome = it.type === 'income';
                      return (
                        <tr
                          key={it.id}
                          onClick={() => openEntryModal(it)}
                          className={`${isIncome ? 'hover:bg-emerald-50/50' : 'hover:bg-rose-50/50'} transition-colors cursor-pointer`}
                        >
                          <td className="py-2 pr-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${isIncome ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
                              {isIncome ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              )}
                              {it.type}
                            </span>
                          </td>
                          <td className={`py-2 pr-4 ${isIncome ? 'text-emerald-700' : 'text-rose-700'} font-medium`}>
                            {isIncome ? 'Credit' : 'Debit'}
                          </td>
                          <td className={`py-2 pr-4 tabular-nums ${isIncome ? 'text-emerald-700' : 'text-rose-700'} font-semibold`}>
                            {formatMoney(Number(it.amount), userCurrency)}
                          </td>
                          <td className="py-2 pr-4">{userCurrency}</td>
                          <td className="py-2 pr-4">{it.category || '-'}</td>
                          <td className="py-2 pr-4">{new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(it.date))}</td>
                          <td className="py-2 pr-4">{it.notes || '-'}</td>
                          <td className="py-2 pr-4 font-semibold">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full ring-1 ${it.balance >= 0 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
                              {formatMoney(it.balance, userCurrency)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                )}

                {/* Job Card Expenses Table */}
                {expenseType === 'job_card' && (
                <table className="adminTable" role="table" aria-label="Job card expenses table">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">Event Type</th>
                      <th className="py-2 pr-4">Job Card</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Description</th>
                      <th className="py-2 pr-4">Vendor</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobCardExpenses?.data?.map((expense: JobCardExpense) => (
                      <tr key={expense.id} onClick={() => openJcExpenseModal(expense)} className="hover:bg-rose-50/50 transition-colors cursor-pointer">
                        <td className="py-2 pr-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                            {eventTypes[expense.event_type] || expense.event_type}
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {expense.job_card ? (
                            <span className="font-medium text-gray-900">
                              #{expense.job_card.id} - {expense.job_card.title}
                            </span>
                          ) : (
                            <span className="text-gray-500">Unknown</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 tabular-nums text-rose-700 font-semibold">
                          {formatMoney(Number(expense.amount), userCurrency)}
                        </td>
                        <td className="py-2 pr-4">{expense.description}</td>
                        <td className="py-2 pr-4">{expense.vendor || '-'}</td>
                        <td className="py-2 pr-4">
                          {new Intl.DateTimeFormat('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            timeZone: 'UTC'
                          }).format(new Date(expense.expense_date))}
                        </td>
                        <td className="py-2 pr-4">
                          {expense.receipt_path ? (
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL}/storage/${expense.receipt_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              View Receipt
                            </a>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
                </div>
                {/* Entry Details Modal */}
                {showEntryModal && viewEntry && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeEntryModal}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden z-[100] relative" tabIndex={-1} style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Entry Details #{viewEntry.id}</h3>
                          <p className="text-gray-600 text-sm">Overview of the selected accounting entry</p>
                        </div>
                        <button className="text-gray-500 hover:text-gray-700" onClick={closeEntryModal} aria-label="Close"> <X className="w-6 h-6" /> </button>
                      </div>
                      <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500">Type</div>
                            <div className="font-semibold capitalize">{viewEntry.type}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Credit/Debit</div>
                            <div className="font-semibold">{viewEntry.type === 'income' ? 'Credit' : 'Debit'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Amount</div>
                            <div className={`font-semibold ${viewEntry.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>{formatMoney(Number(viewEntry.amount), userCurrency)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Currency</div>
                            <div className="font-semibold">{viewEntry.currency || userCurrency}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Category</div>
                            <div className="font-semibold">{viewEntry.category || '-'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Date</div>
                            <div className="font-semibold">{new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(viewEntry.date))}</div>
                          </div>
                          <div className="sm:col-span-2">
                            <div className="text-xs text-gray-500">Notes</div>
                            <div className="font-semibold">{viewEntry.notes || '-'}</div>
                          </div>
                          <div className="sm:col-span-2">
                            <div className="text-xs text-gray-500">Running Balance</div>
                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full ring-1 ${viewEntry.balance >= 0 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
                              {formatMoney(viewEntry.balance, userCurrency)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2">
                        <button className="btn-secondary" onClick={closeEntryModal}>Close</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Job Card Expense Details Modal */}
                {showJcExpenseModal && viewJcExpense && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeJcExpenseModal}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden z-[100] relative" tabIndex={-1} style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Job Card Expense #{viewJcExpense.id}</h3>
                          <p className="text-gray-600 text-sm">Details for this job card expense</p>
                        </div>
                        <button className="text-gray-500 hover:text-gray-700" onClick={closeJcExpenseModal} aria-label="Close"> <X className="w-6 h-6" /> </button>
                      </div>
                      <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500">Event Type</div>
                            <div className="font-semibold">{eventTypes[viewJcExpense.event_type] || viewJcExpense.event_type}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Job Card</div>
                            <div className="font-semibold">{viewJcExpense.job_card ? `#${viewJcExpense.job_card.id} - ${viewJcExpense.job_card.title}` : (viewJcExpense.job_card_id ? `#${viewJcExpense.job_card_id}` : '-')}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Amount</div>
                            <div className="font-semibold text-rose-700">{formatMoney(Number(viewJcExpense.amount), userCurrency)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Date</div>
                            <div className="font-semibold">{new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' }).format(new Date(viewJcExpense.expense_date))}</div>
                          </div>
                          <div className="sm:col-span-2">
                            <div className="text-xs text-gray-500">Description</div>
                            <div className="font-semibold">{viewJcExpense.description || '-'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Vendor</div>
                            <div className="font-semibold">{viewJcExpense.vendor || '-'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Receipt</div>
                            <div className="font-semibold">
                              {viewJcExpense.receipt_path ? (
                                <a href={`${process.env.NEXT_PUBLIC_API_URL}/storage/${viewJcExpense.receipt_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">View Receipt</a>
                              ) : (
                                '-' 
                              )}
                            </div>
                          </div>
                          {viewJcExpense.metadata && (
                            <div className="sm:col-span-2">
                              <div className="text-xs text-gray-500">Metadata</div>
                              <pre className="text-xs bg-gray-50 rounded-xl p-3 overflow-auto max-h-40 border border-gray-100">{JSON.stringify(viewJcExpense.metadata, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2">
                        <button className="btn-secondary" onClick={closeJcExpenseModal}>Close</button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-8">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm text-gray-600">Trends</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowIncome(v => !v)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${showIncome ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-white text-gray-600 ring-gray-200'}`}>Income</button>
                      <button onClick={() => setShowExpense(v => !v)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${showExpense ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-white text-gray-600 ring-gray-200'}`}>Expense</button>
                      <button onClick={() => setShowBalance(v => !v)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${showBalance ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-white text-gray-600 ring-gray-200'}`}>Balance</button>
                      <button onClick={() => {
                        const svg = chartRef.current; if (!svg) return;
                        const xml = new XMLSerializer().serializeToString(svg);
                        const svg64 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
                        const img = new Image();
                        const width = svg.viewBox.baseVal.width || svg.clientWidth || 900;
                        const height = svg.viewBox.baseVal.height || svg.clientHeight || 260;
                        img.onload = () => {
                          const canvas = document.createElement('canvas');
                          canvas.width = width; canvas.height = height;
                          const ctx = canvas.getContext('2d');
                          if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,width,height); ctx.drawImage(img, 0, 0); }
                          const a = document.createElement('a');
                          a.href = canvas.toDataURL('image/png');
                          a.download = `accounting-trends-${Date.now()}.png`;
                          a.click();
                        };
                        img.src = svg64;
                      }} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white ring-1 ring-gray-200 hover:bg-gray-50">Export PNG</button>
                    </div>
                  </div>
                  {(() => {
                    const all = page?.data || [];
                    if (!all.length && !jobCardExpenses?.data?.length) return <div className="text-gray-500">No data to chart.</div>;
                    // Determine range based on filters or dataset bounds
                    const minTs = Math.min(
                      all.reduce((min, e) => Math.min(min, new Date(e.date).getTime()), Infinity),
                      jobCardExpenses?.data?.reduce((min, e) => Math.min(min, new Date(e.expense_date).getTime()), Infinity) || Infinity
                    );
                    const maxTs = Math.max(
                      all.reduce((max, e) => Math.max(max, new Date(e.date).getTime()), -Infinity),
                      jobCardExpenses?.data?.reduce((max, e) => Math.max(max, new Date(e.expense_date).getTime()), -Infinity) || -Infinity
                    );
                    const startTs = startDate ? new Date(startDate).getTime() : minTs;
                    const endTs = endDate ? new Date(endDate).getTime() : maxTs;
                    const { labels, income, expense, balance } = buildDailySeries(all, startTs, endTs);

                    // Add job card expenses to the expense series
                    const jobCardExpenseSeries = buildDailySeries(
                      jobCardExpenses?.data?.map(e => ({
                        id: e.id,
                        type: 'expense' as const,
                        amount: e.amount,
                        category: eventTypes[e.event_type] || 'Job Card Expense',
                        date: e.expense_date,
                        notes: e.description,
                        balance: 0,
                        currency: userCurrency,
                        is_payment: false
                      })) || [],
                      startTs,
                      endTs
                    );

                    // Combine expenses
                    const combinedExpense = expense.map((exp, i) => exp + (jobCardExpenseSeries.expense[i] || 0));
                    const combinedBalance = balance.map((bal, i) => bal - (jobCardExpenseSeries.expense[i] || 0));

                    if (!labels.length) return <div className="text-gray-500">No data in selected range.</div>;
                    const series = [] as Array<{ name: string; color: string; data: number[] }>;
                    if (showIncome) series.push({ name: 'Income', color: '#059669', data: income });
                    if (showExpense) series.push({ name: 'Expense', color: '#e11d48', data: combinedExpense });
                    if (showBalance) series.push({ name: 'Balance', color: '#2563eb', data: combinedBalance });
                    if (!series.length) return <div className="text-gray-500">All series hidden. Toggle at least one.</div>;
                    return (
                      <div className="rounded-2xl border-2 border-gray-100 p-4 bg-white">
                          <ChartSVG labels={labels} series={series} svgRef={chartRef} />
                      </div>
                    );
                  })()}
                </div>
                </div>
                ) : null}
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
