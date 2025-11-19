"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, X } from "lucide-react";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { Calendar as RBCalendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addHours, isAfter } from 'date-fns';
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Customer { id: number; name: string; }
interface NewCustomerPayload { name: string; email?: string; phone?: string; whatsapp?: string; company?: string; nic_or_dl?: string; address?: string; notes?: string; }
interface Booking { id: number; customer_id: number; event_date: string; location?: string; status: string; notes?: string; customer?: Customer }
interface Page<T> { data: T[]; current_page: number; last_page: number; }

export default function BookingsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page<Booking> | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Booking>>({ status: 'scheduled' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Booking>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [calDate, setCalDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [calLoading, setCalLoading] = useState<boolean>(false);
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [cancelledCount, setCancelledCount] = useState<number>(0);
  // Quick customer registration modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState<NewCustomerPayload>({ name: '' });
  const [customerFormErrors, setCustomerFormErrors] = useState<Record<string, string>>({});
  const [savingCustomer, setSavingCustomer] = useState(false);

  const locales = useMemo(() => ({ 'en-US': undefined as any }), []);
  const localizer = useMemo(() => dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    getDay,
    locales,
  }), [locales]);

  const eventStyleGetter = (event: any) => {
    const status = event?.resource?.status || 'scheduled';
    let gradient = 'linear-gradient(135deg,#6366f1,#8b5cf6)';
    if (status === 'completed') gradient = 'linear-gradient(135deg,#059669,#10b981)';
    if (status === 'cancelled') gradient = 'linear-gradient(135deg,#dc2626,#f97316)';
    return {
      style: {
        background: gradient,
        borderRadius: 10,
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.25)',
        padding: '4px 8px',
        boxShadow: '0 4px 12px -2px rgba(0,0,0,0.15)',
        fontSize: '0.65rem',
        letterSpacing: '.5px'
      }
    };
  };

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!t) { router.replace("/login"); return; }
    // Enforce plan gating for business suite
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    setToken(t);
    fetchList(t, 1);
    fetchCustomers(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!token) return;
    loadCalendar(token, calDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, calDate]);

  const fetchCustomers = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      if (!res.ok) return;
      const data = await res.json();
      setCustomers(data.data || []);
    } catch {}
  };

  const fetchList = async (t: string, p: number) => {
    setLoading(true); setError(null);
    try {
      const query = new URLSearchParams({ per_page: '10', page: String(p), ...(q ? { q } : {}) });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings?${query.toString()}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to load bookings');
      const data = await res.json();
      setPage(data);
    } catch (e: any) { setError(e?.message || 'Failed to load bookings'); }
    finally { setLoading(false); }
  };

  const loadCalendar = async (t: string, current: Date) => {
    setCalLoading(true);
    try {
      const start = startOfMonth(current).toISOString();
      const end = endOfMonth(current).toISOString();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Failed to load calendar');
      const data: Booking[] = await res.json();
      const mapped = data.map(b => ({
        id: b.id,
        title: `${b.customer?.name ? b.customer.name : `#${b.customer_id}`} — ${b.status}` + (b.location ? ` @ ${b.location}` : ''),
        start: new Date(b.event_date),
        end: addHours(new Date(b.event_date), 1),
        resource: b,
      }));
      setEvents(mapped);
      // compute next upcoming booking from now
      const now = new Date();
      const future = data.filter(b => isAfter(new Date(b.event_date), now)).sort((a,b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
      setNextBooking(future[0] || null);
  // compute counts for current range
  setTotalCount(data.length);
  setCompletedCount(data.filter(b => b.status === 'completed').length);
  setCancelledCount(data.filter(b => b.status === 'cancelled').length);
    } catch (e) {
      // noop; error box handled by main error
    } finally {
      setCalLoading(false);
    }
  };

  const openCustomerModal = () => { setCustomerForm({ name: '' }); setCustomerFormErrors({}); setShowCustomerModal(true); };
  const createCustomerQuick = async () => {
    if (!token) return;
    setSavingCustomer(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(customerForm),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data?.errors) {
          const errs: Record<string, string> = {};
          Object.entries<any>(data.errors).forEach(([k, v]) => (errs[k] = Array.isArray(v) ? v.join(' ') : String(v)));
          setCustomerFormErrors(errs);
          throw new Error('Please fix the highlighted errors');
        }
        throw new Error(data?.message || 'Create failed');
      }
      // Success: refresh customers and preselect the new one in the booking form
      await fetchCustomers(token);
      setForm(prev => ({ ...prev, customer_id: data.id }));
      setShowCustomerModal(false);
    } catch (e) {
      // Error message surfaced via validation or global error if needed
    } finally { setSavingCustomer(false); }
  };

  const createItem = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data?.errors) {
          const errs: Record<string, string> = {};
          Object.entries<any>(data.errors).forEach(([k, v]) => (errs[k] = Array.isArray(v) ? v.join(' ') : String(v)));
          setFormErrors(errs);
          throw new Error('Please fix the highlighted errors');
        }
        throw new Error(data?.message || 'Create failed');
      }
      setCreating(false); setForm({ status: 'scheduled' }); fetchList(token, 1);
    } catch (e: any) { setError(e?.message || 'Create failed'); }
  };

  const startEdit = (b: Booking) => { setEditId(b.id); setEditForm({ ...b }); };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };
  const saveEdit = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422 && data?.errors) {
          const errs: Record<string, string> = {};
          Object.entries<any>(data.errors).forEach(([k, v]) => (errs[k] = Array.isArray(v) ? v.join(' ') : String(v)));
          setEditErrors(errs);
          throw new Error('Please fix the highlighted errors');
        }
        throw new Error(data?.message || 'Update failed');
      }
      cancelEdit(); fetchList(token, page?.current_page || 1);
    } catch (e: any) { setError(e?.message || 'Update failed'); }
  };

  const remove = async (id: number) => {
    if (!token) return; if (!confirm('Delete this booking?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings/${id}`, { method: 'DELETE', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      fetchList(token, page?.current_page || 1);
    } catch (e: any) { setError(e?.message || 'Delete failed'); }
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <AdminSectionHeader title="Bookings" subtitle="Manage events, schedule, and customer reservations">
              <div className="flex flex-wrap gap-2 items-start">
                <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-white/40">
                  <input className="bg-transparent placeholder-indigo-200 text-indigo-50 text-xs focus:outline-none w-40" placeholder="Search bookings..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && token) fetchList(token, 1); }} />
                </div>
                <button onClick={() => token && fetchList(token, 1)} className="actionBtn" aria-label="Search bookings">Search</button>
                <button onClick={() => { setQ(''); token && fetchList(token,1); }} className="actionBtn" aria-label="Reset search">Reset</button>
                <button onClick={() => setCreating(true)} className="newBtn flex items-center gap-2" aria-label="Create booking"><Plus className="w-4 h-4" aria-hidden="true" /> New Booking</button>
              </div>
            </AdminSectionHeader>
            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>}
            {/* Calendar + Next booking banner and table side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="calendarPanel" role="region" aria-label="Bookings calendar and statistics">
                <div className="flex flex-wrap items-center gap-2 legendBar" aria-label="Calendar legend">
                  <span className="legendTitle">Legend:</span>
                  <span className="legendBadge scheduled">Scheduled</span>
                  <span className="legendBadge completed">Completed</span>
                  <span className="legendBadge cancelled">Cancelled</span>
                </div>
                {calLoading && (
                  <div className="w-full h-8 animate-pulse rounded-lg bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 mb-2" aria-label="Loading calendar" />
                )}
                <div className="calendarWrapper">
                  <RBCalendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: 450 }}
                    date={calDate}
                    onNavigate={(newDate: Date) => setCalDate(newDate)}
                    views={['month','week','day']}
                    popup
                    eventPropGetter={eventStyleGetter}
                  />
                </div>
                {/* Stats below the calendar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4" aria-label="Booking counts">
                  <div className="statCard">
                    <div className="statLabel">Total</div>
                    <div className="statValue text-indigo-700">{totalCount}</div>
                  </div>
                  <div className="statCard completed">
                    <div className="statLabel">Completed</div>
                    <div className="statValue">{completedCount}</div>
                  </div>
                  <div className="statCard cancelled">
                    <div className="statLabel">Cancelled</div>
                    <div className="statValue">{cancelledCount}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="nextBookingCard" role="region" aria-label="Next upcoming booking">
                  <div className="nextBookingHeader">Next Booking</div>
                  {nextBooking ? (
                    <div className="nextBookingBody">
                      <div className="nextBookingName">{nextBooking.customer?.name || `#${nextBooking.customer_id}`}</div>
                      <div className="nextBookingMeta">{new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(nextBooking.event_date))} {nextBooking.location ? `@ ${nextBooking.location}` : ''}</div>
                      <div className={`nextBookingStatus status-${nextBooking.status}`}>{nextBooking.status}</div>
                    </div>
                  ) : (
                    <div className="nextBookingEmpty">No upcoming bookings this month.</div>
                  )}
                  <div className="nextBookingGlow" aria-hidden="true" />
                </div>
                {/* Bookings list table on the right */}
                {loading ? <p className="text-gray-600">Loading...</p> : (
                  <div className="overflow-x-auto">
                    <table className="adminTable" role="table" aria-label="Bookings table">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="py-1 pr-2">Customer</th>
                          <th className="py-1 pr-2">Event Date</th>
                          <th className="py-1 pr-2">Location</th>
                          <th className="py-1 pr-2">Status</th>
                          <th className="py-1 pr-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {page?.data?.map(b => (
                          <tr key={b.id}>
                            <td className="py-1 pr-2">{editId === b.id ? (
                              <select className="input" value={editForm.customer_id || b.customer_id} onChange={(e) => setEditForm({ ...editForm, customer_id: Number(e.target.value) })}>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            ) : (b.customer?.name || `#${b.customer_id}`)}</td>
                            <td className="py-1 pr-2">{editId === b.id ? (
                              <input type="datetime-local" className="input" value={editForm.event_date || b.event_date} onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })} />
                            ) : new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(b.event_date))}</td>
                            <td className="py-1 pr-2">{editId === b.id ? (
                              <input className="input" value={editForm.location || b.location || ''} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
                            ) : (b.location || '-')}</td>
                            <td className="py-1 pr-2">{editId === b.id ? (
                              <select className="input" value={editForm.status || b.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                                <option value="scheduled">Scheduled</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            ) : b.status}</td>
                            <td className="py-1 pr-2">
                              {editId === b.id ? (
                                <div className="flex gap-2">
                                  <button onClick={() => saveEdit(b.id)} className="btn-primary flex items-center gap-1"><Save className="w-4 h-4" /> Save</button>
                                  <button onClick={cancelEdit} className="btn-secondary flex items-center gap-1"><X className="w-4 h-4" /> Cancel</button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button onClick={() => startEdit(b)} className="btn-secondary">Edit</button>
                                  <button onClick={() => remove(b.id)} className="btn-danger flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
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
            {creating && (
              <div className="mb-6 p-4 border-2 border-gray-100 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <select className="input" value={form.customer_id || ''} onChange={(e) => setForm({ ...form, customer_id: Number(e.target.value) })}>
                        <option value="">Select customer *</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button type="button" onClick={openCustomerModal} className="btn-secondary whitespace-nowrap">New Customer</button>
                    </div>
                    {formErrors.customer_id && <p className="mt-1 text-sm text-red-600">{formErrors.customer_id}</p>}
                  </div>
                  <div>
                  <input type="datetime-local" step="1" className="input" value={form.event_date || ''} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                  {formErrors.event_date && <p className="mt-1 text-sm text-red-600">{formErrors.event_date}</p>}
                  </div>
                  <input className="input" placeholder="Location" value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  <select className="input" value={form.status || 'scheduled'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <textarea className="input md:col-span-2" placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={createItem} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
                  <button onClick={() => setCreating(false)} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
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
        .actionBtn { background: rgba(255,255,255,0.15); color: #F0F5FF; padding: 0.55rem 0.85rem; border-radius: 0.75rem; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.35); transition: background .2s, transform .2s; }
        .actionBtn:hover { background: rgba(255,255,255,0.25); transform: translateY(-2px); }
        .newBtn { background: linear-gradient(90deg,#0f172a,#1e3a8a); color: #ffffff; padding: 0.55rem 1rem; border-radius: 0.85rem; font-size: 0.75rem; font-weight: 600; box-shadow: 0 4px 12px -2px rgba(30,58,138,0.5); transition: box-shadow .25s, transform .25s; }
        .newBtn:hover { box-shadow: 0 6px 18px -2px rgba(30,58,138,0.6); transform: translateY(-2px); }
        /* Calendar panel & legend */
        .calendarPanel { background: linear-gradient(135deg,#ffffff,#f5f3ff); border: 2px solid #ecebff; border-radius: 1.25rem; padding: 1rem; position: relative; box-shadow: 0 20px 40px -10px rgba(99,102,241,0.15); }
        .legendBar { background: rgba(255,255,255,0.6); backdrop-filter: blur(8px); padding: .5rem .75rem; border-radius: .75rem; border: 1px solid rgba(255,255,255,0.5); }
        .legendTitle { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #4b5563; }
        .legendBadge { display: inline-flex; align-items: center; gap: 4px; font-size: .65rem; font-weight: 600; letter-spacing: .5px; padding: 4px 8px; border-radius: 999px; color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
        .legendBadge.scheduled { background: linear-gradient(135deg,#6366f1,#8b5cf6); }
        .legendBadge.completed { background: linear-gradient(135deg,#059669,#10b981); }
        .legendBadge.cancelled { background: linear-gradient(135deg,#dc2626,#f97316); }
        .calendarWrapper { border-radius: 1rem; overflow: hidden; margin-top: .75rem; }
        /* Calendar overrides */
        .rbc-calendar { font-size: 0.85rem; }
        .rbc-toolbar { margin-bottom: 0.5rem; display: flex; gap: .5rem; flex-wrap: wrap; }
        .rbc-toolbar .rbc-toolbar-label { font-weight: 700; color: #111827; padding: .35rem .75rem; background: #f3f4f6; border-radius: .6rem; }
        .rbc-btn-group > button { background: linear-gradient(135deg,#f8fafc,#eef2ff); border: 1px solid #e2e8f0; padding: .35rem .7rem; border-radius: .6rem; color: #111827; font-size: .65rem; font-weight: 600; letter-spacing: .5px; transition: background .25s, transform .25s, box-shadow .25s; }
        .rbc-btn-group > button:hover { background: linear-gradient(135deg,#e0e7ff,#c7d2fe); box-shadow: 0 4px 10px -2px rgba(99,102,241,0.3); transform: translateY(-2px); }
        .rbc-btn-group > button.rbc-active { background: linear-gradient(135deg,#111827,#1f2937); color: #fff; border-color: #1f2937; box-shadow: 0 4px 12px -2px rgba(17,24,39,0.4); }
        .rbc-month-view, .rbc-time-view { border-radius: .75rem; overflow: hidden; border: 1px solid #e5e7eb; }
        .rbc-today { background: linear-gradient(135deg,#eef2ff,#fdf2f8); position: relative; }
        .rbc-today:after { content:''; position:absolute; inset:0; border:2px solid #6366f1; border-radius:4px; pointer-events:none; }
        .rbc-off-range-bg { background: #f9fafb; }
        .rbc-event { border: none; transition: transform .2s, box-shadow .2s; }
        .rbc-event:hover { transform: translateY(-2px); box-shadow: 0 6px 16px -4px rgba(0,0,0,0.25); }
        .rbc-event .rbc-event-content { font-weight: 600; }
        .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #f3f4f6; }
        .rbc-time-header, .rbc-header { background: #fafbff; color: #374151; }
        .statCard { background: linear-gradient(135deg,#f8fafc,#f3f4f6); border: 1px solid #e5e7eb; border-radius: 1rem; padding: .75rem .5rem; text-align: center; position: relative; overflow: hidden; }
        .statCard:before { content:''; position:absolute; inset:0; background: radial-gradient(circle at 30% 20%,rgba(255,255,255,0.6),transparent 70%); opacity:.7; }
        .statCard.completed { background: linear-gradient(135deg,#d1fae5,#6ee7b7); border-color:#6ee7b7; }
        .statCard.cancelled { background: linear-gradient(135deg,#fee2e2,#fca5a5); border-color:#fca5a5; }
        .statLabel { font-size:.55rem; text-transform:uppercase; font-weight:600; letter-spacing:.5px; color:#64748b; }
        .statValue { font-size:1.6rem; font-weight:700; line-height:1.1; }
        @media (prefers-reduced-motion: reduce) { .rbc-event, .rbc-btn-group > button, .statCard { transition: none !important; } }
        /* Next booking card */
        .nextBookingCard { position:relative; padding:1.1rem 1.15rem 1.25rem; border-radius:1.25rem; border:1px solid #c7d2fe; background:linear-gradient(145deg,#f5f7ff,#eef2ff); box-shadow:0 12px 28px -8px rgba(99,102,241,0.35),0 4px 10px -4px rgba(31,41,55,0.1); overflow:hidden; }
        .nextBookingCard:before { content:''; position:absolute; inset:0; background:radial-gradient(circle at 85% 15%,rgba(139,92,246,0.35),transparent 70%),radial-gradient(circle at 10% 90%,rgba(99,102,241,0.25),transparent 65%); pointer-events:none; }
        .nextBookingGlow { position:absolute; inset:0; background:linear-gradient(120deg,rgba(255,255,255,0.35),rgba(255,255,255,0)); mix-blend-mode:overlay; pointer-events:none; }
        .nextBookingHeader { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.65px; background:linear-gradient(90deg,#4f46e5,#7c3aed); -webkit-background-clip:text; color:transparent; margin-bottom:.55rem; }
        .nextBookingBody { display:flex; flex-direction:column; gap:.35rem; }
        .nextBookingName { font-size:1.05rem; font-weight:700; color:#1e293b; letter-spacing:.25px; }
        .nextBookingMeta { font-size:.72rem; font-weight:500; color:#334155; background:#ffffff80; padding:.35rem .6rem; border-radius:.65rem; border:1px solid #e0e7ff; backdrop-filter:blur(4px); }
        .nextBookingStatus { width:max-content; font-size:.6rem; font-weight:700; letter-spacing:.6px; text-transform:uppercase; padding:.35rem .55rem; border-radius:.55rem; margin-top:.15rem; color:#fff; box-shadow:0 2px 6px -2px rgba(0,0,0,0.4); }
        .nextBookingStatus.status-scheduled { background:linear-gradient(135deg,#6366f1,#8b5cf6); }
        .nextBookingStatus.status-completed { background:linear-gradient(135deg,#059669,#10b981); }
        .nextBookingStatus.status-cancelled { background:linear-gradient(135deg,#dc2626,#f97316); }
        .nextBookingEmpty { font-size:.75rem; font-weight:500; color:#475569; padding:.4rem .65rem; background:#ffffff70; border:1px dashed #cbd5e1; border-radius:.75rem; }
        .nextBookingCard:hover { box-shadow:0 18px 40px -10px rgba(99,102,241,0.45),0 6px 16px -6px rgba(31,41,55,0.12); transform:translateY(-3px); transition:box-shadow .35s, transform .35s; }
        @media (prefers-reduced-motion: reduce) { .nextBookingCard:hover { transform:none; } }
      `}</style>
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCustomerModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">New Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} className="btn-secondary flex items-center gap-1"><X className="w-4 h-4" /> Close</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input className="input" placeholder="Name *" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
                {customerFormErrors.name && <p className="mt-1 text-sm text-red-600">{customerFormErrors.name}</p>}
              </div>
              <div>
                <input className="input" placeholder="Email" value={customerForm.email || ''} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
                {customerFormErrors.email && <p className="mt-1 text-sm text-red-600">{customerFormErrors.email}</p>}
              </div>
              <div>
                <input className="input" placeholder="Phone" value={customerForm.phone || ''} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
                {customerFormErrors.phone && <p className="mt-1 text-sm text-red-600">{customerFormErrors.phone}</p>}
              </div>
              <div>
                <input className="input" placeholder="WhatsApp Number" value={customerForm.whatsapp || ''} onChange={(e) => setCustomerForm({ ...customerForm, whatsapp: e.target.value })} />
                {customerFormErrors.whatsapp && <p className="mt-1 text-sm text-red-600">{customerFormErrors.whatsapp}</p>}
              </div>
              <div>
                <input className="input" placeholder="Company" value={customerForm.company || ''} onChange={(e) => setCustomerForm({ ...customerForm, company: e.target.value })} />
                {customerFormErrors.company && <p className="mt-1 text-sm text-red-600">{customerFormErrors.company}</p>}
              </div>
              <div>
                <input className="input" placeholder="NIC or Driving License" value={customerForm.nic_or_dl || ''} onChange={(e) => setCustomerForm({ ...customerForm, nic_or_dl: e.target.value })} />
                {customerFormErrors.nic_or_dl && <p className="mt-1 text-sm text-red-600">{customerFormErrors.nic_or_dl}</p>}
              </div>
              <div className="md:col-span-2">
                <textarea className="input" placeholder="Address" value={customerForm.address || ''} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
                {customerFormErrors.address && <p className="mt-1 text-sm text-red-600">{customerFormErrors.address}</p>}
              </div>
              <div className="md:col-span-2">
                <textarea className="input" placeholder="Notes / Additional Info" value={customerForm.notes || ''} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} />
                {customerFormErrors.notes && <p className="mt-1 text-sm text-red-600">{customerFormErrors.notes}</p>}
              </div>
            </div>
            <div className="mt-4 flex gap-3 justify-end">
              <button onClick={() => setShowCustomerModal(false)} className="btn-secondary">Cancel</button>
              <button disabled={savingCustomer} onClick={createCustomerQuick} className="btn-primary">{savingCustomer ? 'Saving...' : 'Save Customer'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
