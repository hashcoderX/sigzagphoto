"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Customer { id: number; name: string; }
interface Booking { id: number; date: string; customer: Customer; }

export default function RemindersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [sentTodayByBooking, setSentTodayByBooking] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!t) { router.replace('/login'); return; }
    // Enforce plan gating for business suite
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    setToken(t);
    fetchUpcomingBookings(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helpers: robust date parsing and formatting
  const parseBookingDate = (input?: string | null): Date | null => {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    // Try native parse first (handles ISO, RFC, etc.)
    const nativeTs = Date.parse(trimmed);
    if (!Number.isNaN(nativeTs)) return new Date(nativeTs);
    // Handle common Laravel formats
    // 1) YYYY-MM-DD HH:mm:ss (no timezone)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      const normalized = trimmed.replace(' ', 'T');
      const ts = Date.parse(normalized);
      if (!Number.isNaN(ts)) return new Date(ts);
    }
    // 2) YYYY-MM-DD (date only)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const normalized = `${trimmed}T00:00:00`;
      const ts = Date.parse(normalized);
      if (!Number.isNaN(ts)) return new Date(ts);
    }
    return null;
  };

  const formatDateTime = (d: Date | null): string => {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(d);
    } catch {
      return d.toISOString();
    }
  };

  const getDaysUntil = (d: Date | null): number | null => {
    if (!d) return null;
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const fetchUpcomingBookings = async (t: string) => {
    setLoading(true); setError(null);
    try {
      const now = new Date();
      const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      // Use calendar endpoint which supports date range filtering
      const start = now.toISOString().split('T')[0];
      const end = oneWeekLater.toISOString().split('T')[0];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings/calendar?start=${start}&end=${end}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to load upcoming bookings');
      const data = await res.json();
      const bookings: Booking[] = (data || []).map((b: any) => ({ id: b.id, date: b.event_date, customer: b.customer }));
      setUpcomingBookings(bookings);
      // After loading, check reminder status for these bookings
      if (bookings.length) {
        const ids = bookings.map(b => b.id).join(',');
        const res2 = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/reminders/sent-today?booking_ids=${ids}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
        if (res2.ok) {
          const statusJson = await res2.json();
          const map: Record<number, boolean> = {};
          (statusJson.data || []).forEach((row: any) => { map[row.booking_id] = !!row.sent_today; });
          setSentTodayByBooking(map);
        }
      } else {
        setSentTodayByBooking({});
      }
    } catch (e: any) { setError(e?.message || 'Failed to load upcoming bookings'); } finally { setLoading(false); }
  };
  const sendReminder = async (bookingId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings/${bookingId}/send-reminder`, { method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to send reminder');
      alert('Reminder sent successfully');
      // Mark as sent today locally
      setSentTodayByBooking(prev => ({ ...prev, [bookingId]: true }));
    } catch (e: any) { setError(e?.message || 'Failed to send reminder'); }
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <AdminSectionHeader title="Reminders" subtitle="Upcoming bookings within the next week">
            </AdminSectionHeader>
            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>}

            {loading ? <p className="text-gray-600">Loading...</p> : (
              <div className="overflow-x-auto">
                <table className="adminTable" role="table" aria-label="Upcoming bookings table">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">Booking ID</th>
                      <th className="py-2 pr-4">Customer</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Days Until</th>
                      <th className="py-2 pr-4">Reminder Sent Today</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingBookings.map((booking) => {
                      const parsed = parseBookingDate(booking.date);
                      const daysUntil = getDaysUntil(parsed);
                      const sentToday = !!sentTodayByBooking[booking.id];
                      return (
                        <tr key={booking.id}>
                          <td className="py-3 pr-4 font-medium text-gray-800">#{booking.id}</td>
                          <td className="py-3 pr-4">{booking.customer?.name || 'N/A'}</td>
                          <td className="py-3 pr-4">{formatDateTime(parsed)}</td>
                          <td className="py-3 pr-4">{daysUntil === null ? '—' : `${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`}</td>
                          <td className="py-3 pr-4">
                            <span className={`badge ${sentToday ? 'badge-green' : 'badge-gray'}`}>{sentToday ? 'Yes' : 'No'}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <button onClick={() => sendReminder(booking.id)} className="btn-primary">Send Reminder</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </section>
      <Footer />
      <style jsx global>{`
        .input { width: 100%; padding: 0.5rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.75rem; }
        .input:focus { outline: none; border-color: #6C63FF; }
        .btn-primary { background: #111827; color: white; padding: 0.5rem 0.75rem; border-radius: 0.75rem; transition: background-color .15s ease; }
        .btn-primary:hover { background: #0b1220; }
        .btn-secondary { background: #f3f4f6; color: #111827; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .btn-danger { background: #fee2e2; color: #991b1b; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }

        /* Table refinements */
        .adminTable { width: 100%; border-collapse: separate; border-spacing: 0; }
        .adminTable thead th { background: #f9fafb; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding: 0.75rem 1rem; }
        .adminTable tbody td { padding: 0.75rem 1rem; border-bottom: 1px solid #eef0f2; }
        .adminTable tbody tr { transition: background-color .15s ease; }
        .adminTable tbody tr:hover { background-color: #f3f4f6; }
        .adminTable tbody tr:hover td { color: #111827; }

        /* Status badge */
        .badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
        .badge-green { background: #ecfdf5; color: #065f46; }
        .badge-gray { background: #f3f4f6; color: #374151; }
      `}</style>
    </main>
  );
}
