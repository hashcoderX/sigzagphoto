"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Plus, Trash2, Save, X, DollarSign, Package } from "lucide-react";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { Calendar as RBCalendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addHours, isAfter } from 'date-fns';
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Customer { id: number; name: string; }
interface NewCustomerPayload { name: string; email?: string; phone?: string; whatsapp?: string; company?: string; nic_or_dl?: string; address?: string; notes?: string; }
interface Package { id: number; name: string; description?: string; total_price?: number; }
interface Item { id: number; code: string; name: string; description?: string; price?: number; notes?: string; }
interface PackageItem { id: number; item_id: number; item: Item; quantity: number; unit_price?: number; subamount?: number; }
interface Booking { id: number; customer_id: number; package_id?: number; location?: string; status: string; notes?: string; customer?: Customer; package?: Package; bookingItems?: PackageItem[]; wedding_shoot_date?: string; preshoot_date?: string; homecoming_date?: string; function_date?: string; event_covering_date?: string; custom_plan_date?: string; wedding_shoot_location?: string; preshoot_location?: string; homecoming_location?: string; function_location?: string; event_covering_location?: string; custom_plan_location?: string; advance_payment?: number | string | null; transport_charges?: number | string | null; earliest_date?: string }
interface Page<T> { data: T[]; current_page: number; last_page: number; }

export default function BookingsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page<Booking> | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [creating, setCreating] = useState(false);
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [form, setForm] = useState<Partial<Booking>>({ status: 'scheduled' });
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
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  // Edit booking modal state
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  // Create booking modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  // User currency state
  const [userCurrency, setUserCurrency] = useState<string>('USD');
  // Package items management for booking
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [bookingPackageItems, setBookingPackageItems] = useState<PackageItem[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [packageLoading, setPackageLoading] = useState(false);
  // Payment details modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalTarget, setPaymentModalTarget] = useState<Booking | null>(null);
  const [bookingPayments, setBookingPayments] = useState<any[]>([]);
  // Edit booking items management
  const [editingBookingItems, setEditingBookingItems] = useState<PackageItem[]>([]);

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
    fetchPackages(t);
    fetchItems(t);
    fetchUserCurrency(t);
    loadNextBooking(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!token) return;
    loadCalendar(token, calDate);
   
  }, [token, calDate]);

  // Handle escape key to close create modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && createModalOpen) {
        setCreateModalOpen(false);
      }
    };

    if (createModalOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [createModalOpen]);

  const fetchCustomers = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/customers?per_page=100`, { 
        headers: { Accept: 'application/json', Authorization: `Bearer ${t}` },
        cache: 'no-cache'
      });
      if (!res.ok) return;
      const data = await res.json();
      setCustomers(data.data || []);
    } catch {}
  };

  const fetchPackages = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/packages?per_page=100`, { 
        headers: { Accept: 'application/json', Authorization: `Bearer ${t}` },
        cache: 'no-cache'
      });
      if (!res.ok) return;
      const data = await res.json();
      setPackages(data.data || []);
    } catch {}
  };

  const fetchUserCurrency = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, { 
        headers: { Accept: 'application/json', Authorization: `Bearer ${t}` },
        cache: 'no-cache'
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.currency) setUserCurrency(data.currency);
    } catch {}
  };

  const fetchItems = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/items?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.data || []);
    } catch {}
  };

  const handlePackageSelection = async (packageId: number | undefined) => {
    if (!packageId) {
      setSelectedPackage(null);
      setBookingPackageItems([]);
      setForm({ ...form, package_id: undefined });
      return;
    }

    setPackageLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/packages/${packageId}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        cache: 'no-cache'
      });
      if (!res.ok) return;
      const packageData = await res.json();

      setSelectedPackage(packageData);
      setForm({ ...form, package_id: packageId });

      // Process package items for booking customization
      const processedItems = (packageData.items || []).map((item: PackageItem) => ({
        ...item,
        subamount: (item.unit_price || item.item?.price || 0) * item.quantity
      }));
      setBookingPackageItems(processedItems);
    } catch (error) {
      console.error('Failed to load package details:', error);
    } finally {
      setPackageLoading(false);
    }
  };

  const updateBookingItemQuantity = (itemId: number, quantity: number) => {
    setBookingPackageItems(prev =>
      prev.map(item =>
        item.item_id === itemId
          ? { ...item, quantity, subamount: (item.unit_price || item.item?.price || 0) * quantity }
          : item
      )
    );
  };

  const updateBookingItemUnitPrice = (itemId: number, unitPrice: number) => {
    setBookingPackageItems(prev =>
      prev.map(item =>
        item.item_id === itemId
          ? { ...item, unit_price: unitPrice, subamount: unitPrice * item.quantity }
          : item
      )
    );
  };

  const removeBookingItem = (itemId: number) => {
    setBookingPackageItems(prev => prev.filter(item => item.item_id !== itemId));
  };

  const addItemToBooking = (itemId: number, quantity: number = 1) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const existingItem = bookingPackageItems.find(pi => pi.item_id === itemId);
    if (existingItem) {
      updateBookingItemQuantity(itemId, existingItem.quantity + quantity);
    } else {
      const newPackageItem: PackageItem = {
        id: Date.now(), // Temporary ID for new items
        item_id: itemId,
        item,
        quantity,
        unit_price: item.price || 0,
        subamount: (item.price || 0) * quantity
      };
      setBookingPackageItems(prev => [...prev, newPackageItem]);
    }
  };

  const formatCurrency = (value: number): string => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: userCurrency }).format(value);
    } catch {
      return `${userCurrency} ${value.toFixed(2)}`;
    }
  };

  // Smart date suggestions for related events
  const suggestRelatedDates = (weddingDate: string) => {
    if (!weddingDate) return {};

    const weddingDateTime = new Date(weddingDate);
    const suggestions: any = {};

    // Preshoot: typically 1-2 weeks before wedding
    const preshootDate = new Date(weddingDateTime);
    preshootDate.setDate(weddingDateTime.getDate() - 7); // 1 week before
    suggestions.preshoot_date = preshootDate.toISOString().slice(0, 16); // Format for datetime-local

    // Homecoming: typically 1 day after wedding
    const homecomingDate = new Date(weddingDateTime);
    homecomingDate.setDate(weddingDateTime.getDate() + 1); // 1 day after
    suggestions.homecoming_date = homecomingDate.toISOString().slice(0, 16);

    return suggestions;
  };

  // Format date for datetime-local input
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Format as YYYY-MM-DDTHH:MM for datetime-local input
      return date.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const fetchList = async (t: string, p: number) => {
    setLoading(true); setError(null);
    try {
      const query = new URLSearchParams({ per_page: '10', page: String(p), ...(q ? { q } : {}) });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings?${query.toString()}`, { 
        headers: { Accept: 'application/json', Authorization: `Bearer ${t}` },
        cache: 'no-cache'
      });
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
        cache: 'no-cache'
      });
      if (!res.ok) throw new Error('Failed to load calendar');
      const data: any[] = await res.json();
      const mapped = data.map(e => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start),
        end: new Date(e.end),
        resource: e.resource,
      }));
      setEvents(mapped);
      // compute counts for current range
      setTotalCount(data.length);
      setCompletedCount(data.filter(e => e.resource.status === 'completed').length);
      setCancelledCount(data.filter(e => e.resource.status === 'cancelled').length);
    } catch (e) {
      // noop; error box handled by main error
    } finally {
      setCalLoading(false);
    }
  };

  const loadNextBooking = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings/next`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${t}` },
        cache: 'no-cache'
      });
      if (!res.ok) return;
      const booking = await res.json();
      setNextBooking(booking);
    } catch (e) {
      // noop
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

    // Validation: ensure customer is selected
    if (!form.customer_id) {
      setFormErrors({ customer_id: 'Customer is required' });
      return;
    }

    // Validation: ensure at least one item is selected (either from package or manually added)
    if (bookingPackageItems.length === 0) {
      setError('Please select a package or add at least one item to the booking');
      return;
    }

    setCreatingLoading(true);
    try {
      const bookingData = {
        ...form,
        items: bookingPackageItems.map(item => ({
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: item.unit_price || 0
        }))
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(bookingData),
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
      setCreateModalOpen(false);
      setForm({ status: 'scheduled' });
      setSelectedPackage(null);
      setBookingPackageItems([]);
      setFormErrors({});
      setSuccessMessage('Booking created successfully! A job card has been automatically generated for this booking.');
      fetchList(token, 1);
      loadNextBooking(token);
      loadCalendar(token, calDate);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (e: any) { setError(e?.message || 'Create failed'); }
    finally { setCreatingLoading(false); }
  };

  const startEdit = (b: Booking) => {
    openEditBookingModal(b);
  };
  const saveEdit = async () => {
    if (!token || !editingBooking) return;
    try {
      const requestData = {
        ...editForm,
        booking_items: editingBookingItems.map(item => ({
          id: typeof item.id === 'number' && item.id < 1000000000 ? item.id : null, // Only include real IDs, not temp ones
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subamount: item.subamount,
        })).filter(item => item.id !== null || item.item_id), // Filter out invalid items
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings/${editingBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(requestData),
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
      closeEditBookingModal();
      fetchList(token, page?.current_page || 1);
      loadNextBooking(token);
      loadCalendar(token, calDate);
      setSuccessMessage('Booking updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e: any) {
      setError(e?.message || 'Update failed');
    }
  };

  const remove = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings/${id}`, { method: 'DELETE', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Delete failed');
      fetchList(token, page?.current_page || 1); loadNextBooking(token); loadCalendar(token, calDate);
    } catch (e: any) { setError(e?.message || 'Delete failed'); }
  };

  const openDeleteModal = (booking: Booking) => {
    setBookingToDelete(booking);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setBookingToDelete(null);
  };

  const openEditBookingModal = async (booking: Booking) => {
    if (!token) return;
    try {
      // Fetch fresh booking data with booking items for display
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/bookings/${booking.id}`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load booking details');
      const bookingData = await res.json();

      // Transform snake_case to camelCase for frontend compatibility
      if (bookingData.booking_items) {
        bookingData.bookingItems = bookingData.booking_items;
        delete bookingData.booking_items;
      }

      setEditingBooking(bookingData);
      setEditForm({ ...bookingData });
      setEditingBookingItems(bookingData.bookingItems || []);
      setEditErrors({});
      setShowEditBookingModal(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to load booking details');
    }
  };

  const closeEditBookingModal = () => {
    setShowEditBookingModal(false);
    setEditingBooking(null);
    setEditForm({});
    setEditingBookingItems([]);
    setEditErrors({});
  };

  // Booking items management functions
  const addItemToEditingBooking = (itemId: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newBookingItem: PackageItem = {
      id: Date.now(), // Temporary ID for new items
      item_id: item.id,
      item: item,
      quantity: 1,
      unit_price: item.price || 0,
      subamount: item.price || 0,
    };

    setEditingBookingItems([...editingBookingItems, newBookingItem]);
  };

  const updateEditingBookingItem = (itemId: number, field: string, value: any) => {
    setEditingBookingItems(editingBookingItems.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.subamount = (updated.quantity || 0) * (updated.unit_price || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const removeEditingBookingItem = (itemId: number) => {
    setEditingBookingItems(editingBookingItems.filter(item => item.id !== itemId));
  };

  const openPaymentModal = async (booking: Booking) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/payments?booking_id=${booking.id}&per_page=100`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        cache: 'no-cache'
      });
      if (!res.ok) throw new Error('Failed to load payment history');
      const data = await res.json();
      setBookingPayments(data.data || []);
      setPaymentModalTarget(booking);
      setShowPaymentModal(true);
    } catch (e) {
      setError('Failed to load payment history');
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentModalTarget(null);
    setBookingPayments([]);
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
                <button onClick={() => setCreateModalOpen(true)} className="newBtn flex items-center gap-2" aria-label="Create booking"><Plus className="w-4 h-4" aria-hidden="true" /> New Booking</button>
              </div>
            </AdminSectionHeader>
            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>}
            {successMessage && <div className="mb-4 bg-green-50 border-2 border-green-200 text-green-800 px-6 py-3 rounded-xl">{successMessage}</div>}
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
                    suppressHydrationWarning
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
                  {nextBooking && nextBooking.earliest_date ? (
                    <div className="nextBookingBody">
                      <div className="nextBookingName">{nextBooking.customer?.name || `#${nextBooking.customer_id}`}</div>
                      <div className="nextBookingMeta">{(() => {
                        try {
                          return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(nextBooking.earliest_date));
                        } catch (e) {
                          return 'Invalid date';
                        }
                      })()} {nextBooking.location ? `@ ${nextBooking.location}` : ''}</div>
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
                          <th className="py-1 pr-2">ID</th>
                          <th className="py-1 pr-2">Customer</th>
                          <th className="py-1 pr-2">Package</th>
                          <th className="py-1 pr-2">Wedding Shoot</th>
                          <th className="py-1 pr-2">Preshoot</th>
                          <th className="py-1 pr-2">Homecoming</th>
                          <th className="py-1 pr-2">Function</th>
                          <th className="py-1 pr-2">Event Covering</th>
                          <th className="py-1 pr-2">Custom Plan</th>
                          <th className="py-1 pr-2 font-semibold text-green-700">Advance Payment</th>
                          <th className="py-1 pr-2 font-semibold text-blue-700">Transport Charges</th>
                          <th className="py-1 pr-2">Status</th>
                          <th className="py-1 pr-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {page?.data?.map(b => (
                          <tr key={b.id}>
                            <td className="py-1 pr-2 font-mono text-xs text-gray-600">#{b.id}</td>
                            <td className="py-1 pr-2">{b.customer?.name || `#${b.customer_id}`}</td>
                            <td className="py-1 pr-2">{b.package?.name || '-'}</td>
                            <td className="py-1 pr-2">
                              <div className="text-xs">
                                {b.wedding_shoot_date ? (
                                  <div className="font-medium">{new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(b.wedding_shoot_date))}</div>
                                ) : (
                                  <div className="text-gray-400">No wedding date</div>
                                )}
                                {b.wedding_shoot_location && <div className="text-xs text-gray-500">{b.wedding_shoot_location}</div>}
                              </div>
                            </td>
                            <td className="py-1 pr-2">
                              <div>
                                <div>{b.preshoot_date ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(b.preshoot_date)) : '-'}</div>
                                <div className="text-xs text-gray-500">{b.preshoot_location || '-'}</div>
                              </div>
                            </td>
                            <td className="py-1 pr-2">
                              <div>
                                <div>{b.homecoming_date ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(b.homecoming_date)) : '-'}</div>
                                <div className="text-xs text-gray-500">{b.homecoming_location || '-'}</div>
                              </div>
                            </td>
                            <td className="py-1 pr-2">
                              <div>
                                <div>{b.function_date ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(b.function_date)) : '-'}</div>
                                <div className="text-xs text-gray-500">{b.function_location || '-'}</div>
                              </div>
                            </td>
                            <td className="py-1 pr-2">
                              <div>
                                <div>{b.event_covering_date ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(b.event_covering_date)) : '-'}</div>
                                <div className="text-xs text-gray-500">{b.event_covering_location || '-'}</div>
                              </div>
                            </td>
                            <td className="py-1 pr-2">
                              <div>
                                <div>{b.custom_plan_date ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(new Date(b.custom_plan_date)) : '-'}</div>
                                <div className="text-xs text-gray-500">{b.custom_plan_location || '-'}</div>
                              </div>
                            </td>
                            <td className="py-1 pr-2">
                              <div className={`flex items-center gap-1 font-semibold ${b.advance_payment ? 'text-green-600 bg-green-50 px-2 py-1 rounded' : 'text-gray-500'}`}>
                                <DollarSign className="w-3 h-3" />
                                <span>{b.advance_payment ? formatCurrency(parseFloat(String(b.advance_payment))) : '-'}</span>
                                {b.advance_payment && (
                                  <span className="text-xs bg-green-100 text-green-800 px-1 rounded">Paid</span>
                                )}
                              </div>
                            </td>
                            <td className="py-1 pr-2">
                              <div className={`flex items-center gap-1 font-semibold ${b.transport_charges ? 'text-blue-600 bg-blue-50 px-2 py-1 rounded' : 'text-gray-500'}`}>
                                <DollarSign className="w-3 h-3" />
                                <span>{b.transport_charges ? formatCurrency(parseFloat(String(b.transport_charges))) : '-'}</span>
                                {b.transport_charges && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">Transport</span>
                                )}
                              </div>
                            </td>
                            <td className="py-1 pr-2">{b.status}</td>
                            <td className="py-1 pr-2">
                              <div className="flex gap-2">
                                <button onClick={() => startEdit(b)} className="btn-secondary">Edit</button>
                                <button onClick={() => openPaymentModal(b)} className="btn-secondary flex items-center gap-1"><DollarSign className="w-4 h-4" /> Payments</button>
                                <button onClick={() => openDeleteModal(b)} className="btn-danger flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
                              </div>
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
            {createModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setCreateModalOpen(false)}>
                <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto z-[100] relative" tabIndex={-1} style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                  <div className="p-8 border-2 border-gray-100 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl">📝</span>
                      </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Create New Booking</h3>
                    <p className="text-gray-600">Set up a new photography booking with all the details</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer *</label>
                    <div className="flex items-center gap-2">
                      <select className="input flex-1" value={form.customer_id || ''} onChange={(e) => setForm({ ...form, customer_id: Number(e.target.value) })}>
                        <option value="">Select customer *</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button type="button" onClick={openCustomerModal} className="btn-secondary whitespace-nowrap">New Customer</button>
                    </div>
                    {formErrors.customer_id && <p className="mt-1 text-sm text-red-600">{formErrors.customer_id}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Package (Optional)</label>
                    <select className="input" value={form.package_id || ''} onChange={(e) => handlePackageSelection(e.target.value ? Number(e.target.value) : undefined)}>
                      <option value="">Select package (optional)</option>
                      {packages.map(p => <option key={p.id} value={p.id}>{p.name} {p.total_price ? `(${formatCurrency(p.total_price)})` : ''}</option>)}
                    </select>
                  </div>

                  {/* Package Items Management */}
                  {selectedPackage && (
                    <div className="md:col-span-2">
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <h4 className="text-lg font-semibold mb-4 text-gray-800">Customize Package: {selectedPackage.name}</h4>

                        {/* Add Item Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Add Item</label>
                            <select
                              className="input"
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  addItemToBooking(parseInt(e.target.value));
                                  e.target.value = '';
                                }
                              }}
                            >
                              <option value="">Choose an item to add...</option>
                              {items.map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.code} - {item.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600">Select an item from the dropdown to add it to this booking</p>
                          </div>
                        </div>

                        {/* Package Items Table */}
                        {selectedPackage && (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {packageLoading ? (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                                      <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                                        Loading package items...
                                      </div>
                                    </td>
                                  </tr>
                                ) : bookingPackageItems.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                                      No items in this package
                                    </td>
                                  </tr>
                                ) : (
                                  bookingPackageItems.map((packageItem) => (
                                    <tr key={packageItem.item_id}>
                                      <td className="px-4 py-2 text-sm text-gray-900">{packageItem.item.code} - {packageItem.item.name}</td>
                                      <td className="px-4 py-2 text-sm text-gray-900">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          className="w-24 input"
                                          value={packageItem.unit_price || 0}
                                          onChange={(e) => updateBookingItemUnitPrice(packageItem.item_id, parseFloat(e.target.value) || 0)}
                                        />
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900">
                                        <input
                                          type="number"
                                          min="1"
                                          className="w-20 input"
                                          value={packageItem.quantity}
                                          onChange={(e) => updateBookingItemQuantity(packageItem.item_id, parseInt(e.target.value) || 1)}
                                        />
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-900">
                                        {formatCurrency(packageItem.subamount || 0)}
                                      </td>
                                      <td className="px-4 py-2 text-sm">
                                        <button
                                          onClick={() => removeBookingItem(packageItem.item_id)}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>

                            {/* Package Total */}
                            {!packageLoading && bookingPackageItems.length > 0 && (
                              <div className="mt-4 flex justify-end">
                                <div className="bg-blue-100 px-6 py-3 rounded-lg border border-blue-200">
                                  <div className="text-lg font-semibold text-gray-900">
                                    Package Total: {formatCurrency(bookingPackageItems.reduce((total, packageItem) => {
                                      const subamount = Number(packageItem.subamount) || 0;
                                      return total + (isNaN(subamount) ? 0 : subamount);
                                    }, 0) || 0)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select className="input" value={form.status || 'scheduled'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea className="input" placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Advance Payment</label>
                    <input
                      type="number"
                      step="0.01"
                      max={selectedPackage?.total_price}
                      className="input"
                      placeholder="0.00"
                      value={(form.advance_payment as any) || ''}
                      onChange={(e) => setForm({ ...form, advance_payment: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transport Charges</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="0.00"
                      value={(form.transport_charges as any) || ''}
                      onChange={(e) => setForm({ ...form, transport_charges: e.target.value === '' ? undefined : Number(e.target.value) })}
                    />
                  </div>
                </div>
                <h4 className="text-lg font-medium mb-4 text-gray-800 flex items-center gap-2">
                  <span className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    📸
                  </span>
                  Booking Cases
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ pointerEvents: 'auto' }}>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="mb-3">
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
                        Wedding Shoot Booking
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-4">Main wedding ceremony photography</div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📅</span>
                          Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          className="input w-full"
                          placeholder="Select wedding date and time"
                          value={formatDateForInput(form.wedding_shoot_date)}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            setForm({ ...form, wedding_shoot_date: newDate });

                            // Auto-suggest related dates if they're not already set
                            if (newDate && (!form.preshoot_date || !form.homecoming_date)) {
                              const suggestions = suggestRelatedDates(newDate);
                              setForm(prev => ({
                                ...prev,
                                wedding_shoot_date: newDate,
                                ...(!prev.preshoot_date ? { preshoot_date: suggestions.preshoot_date } : {}),
                                ...(!prev.homecoming_date ? { homecoming_date: suggestions.homecoming_date } : {})
                              }));
                            }
                          }}
                        />
                       
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📍</span>
                          Venue Location
                        </label>
                        <input
                          className="input w-full"
                          placeholder="Enter venue location"
                          value={form.wedding_shoot_location || ''}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => setForm({ ...form, wedding_shoot_location: e.target.value })}
                        />
                      </div>
                    </div>
                    {formErrors.wedding_shoot_date && <p className="mt-1 text-sm text-red-600">{formErrors.wedding_shoot_date}</p>}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                        Preshoot Day Booking
                      </span>
                      {form.preshoot_date && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                          Auto-suggested
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mb-4">Pre-wedding shoot session</div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📅</span>
                          Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          className="input w-full"
                          placeholder="Select preshoot date and time"
                          value={formatDateForInput(form.preshoot_date)}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => setForm({ ...form, preshoot_date: e.target.value })}
                        />
                        {form.preshoot_date && (
                          <p className="text-xs text-gray-500">Suggested: 1 week before wedding</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📍</span>
                          Shoot Location
                        </label>
                        <input
                          className="input w-full"
                          placeholder="Enter shoot location"
                          value={form.preshoot_location || ''}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => setForm({ ...form, preshoot_location: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                        Home Coming Day Shoot Booking
                      </span>
                      {form.homecoming_date && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                          Auto-suggested
                        </span>
                      )}
                    </div>
                    <div className="text-gray-600 text-sm mb-4">Post-wedding homecoming photography</div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📅</span>
                          Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          className="input w-full"
                          placeholder="Select homecoming date and time"
                          value={formatDateForInput(form.homecoming_date)}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => setForm({ ...form, homecoming_date: e.target.value })}
                        />
                        {form.homecoming_date && (
                          <p className="text-xs text-gray-500">Suggested: 1 day after wedding</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📍</span>
                          Homecoming Venue
                        </label>
                        <input
                          className="input w-full"
                          placeholder="Enter homecoming venue"
                          value={form.homecoming_location || ''}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => setForm({ ...form, homecoming_location: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 font-medium mb-2">
                      <span className="w-3 h-3 bg-teal-500 rounded-full"></span>
                      Function Booking
                    </div>
                    <div className="text-gray-600 text-sm mb-4">General function or event photography</div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📅</span>
                          Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          className="input w-full"
                          placeholder="Select function date and time"
                          value={formatDateForInput(form.function_date)}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => setForm({ ...form, function_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📍</span>
                          Function Venue
                        </label>
                        <input
                          className="input w-full"
                          placeholder="Enter function venue"
                          value={form.function_location || ''}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => setForm({ ...form, function_location: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 font-medium mb-2">
                      <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
                      Event Covering Booking
                    </div>
                    <div className="text-gray-600 text-sm mb-4">Event coverage and documentation</div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📅</span>
                          Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          className="input w-full"
                          placeholder="Select event date and time"
                          value={formatDateForInput(form.event_covering_date)}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => setForm({ ...form, event_covering_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📍</span>
                          Event Location
                        </label>
                        <input
                          className="input w-full"
                          placeholder="Enter event location"
                          value={form.event_covering_location || ''}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => setForm({ ...form, event_covering_location: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 font-medium mb-2">
                      <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                      Custom Plan
                    </div>
                    <div className="text-gray-600 text-sm mb-4">Customized photography plan</div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📅</span>
                          Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          className="input w-full"
                          placeholder="Select custom plan date and time"
                          value={formatDateForInput(form.custom_plan_date)}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => setForm({ ...form, custom_plan_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="text-lg">📍</span>
                          Custom Location
                        </label>
                        <input
                          className="input w-full"
                          placeholder="Enter custom location"
                          value={form.custom_plan_location || ''}
                          disabled={false}
                          style={{ pointerEvents: 'auto', cursor: 'text' }}
                          onChange={(e) => setForm({ ...form, custom_plan_location: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Dates Summary - Enhanced Date Chooser Card */}
                {(form.wedding_shoot_date || form.preshoot_date || form.homecoming_date || form.function_date || form.event_covering_date || form.custom_plan_date) && (
                  <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200/50 rounded-2xl shadow-xl backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white text-lg">📅</span>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">Selected Event Dates</h4>
                        <p className="text-sm text-gray-600">Review and confirm your booking schedule</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {form.wedding_shoot_date && (
                        <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-4 rounded-xl border border-pink-200/50 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
                            <div className="text-sm font-bold text-pink-700">Wedding Shoot</div>
                          </div>
                          <div className="text-sm text-gray-800 font-medium mb-1">
                            {new Intl.DateTimeFormat('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'UTC'
                            }).format(new Date(form.wedding_shoot_date))}
                          </div>
                          {form.wedding_shoot_location && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <span>📍</span> {form.wedding_shoot_location}
                            </div>
                          )}
                        </div>
                      )}
                      {form.preshoot_date && (
                        <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-200/50 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                            <div className="text-sm font-bold text-purple-700">Preshoot</div>
                          </div>
                          <div className="text-sm text-gray-800 font-medium mb-1">
                            {new Intl.DateTimeFormat('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'UTC'
                            }).format(new Date(form.preshoot_date))}
                          </div>
                          {form.preshoot_location && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <span>📍</span> {form.preshoot_location}
                            </div>
                          )}
                        </div>
                      )}
                      {form.homecoming_date && (
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-200/50 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                            <div className="text-sm font-bold text-orange-700">Homecoming</div>
                          </div>
                          <div className="text-sm text-gray-800 font-medium mb-1">
                            {new Intl.DateTimeFormat('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'UTC'
                            }).format(new Date(form.homecoming_date))}
                          </div>
                          {form.homecoming_location && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <span>📍</span> {form.homecoming_location}
                            </div>
                          )}
                        </div>
                      )}
                      {form.function_date && (
                        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-200/50 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 bg-teal-500 rounded-full"></span>
                            <div className="text-sm font-bold text-teal-700">Function</div>
                          </div>
                          <div className="text-sm text-gray-800 font-medium mb-1">
                            {new Intl.DateTimeFormat('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'UTC'
                            }).format(new Date(form.function_date))}
                          </div>
                          {form.function_location && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <span>📍</span> {form.function_location}
                            </div>
                          )}
                        </div>
                      )}
                      {form.event_covering_date && (
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-200/50 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
                            <div className="text-sm font-bold text-indigo-700">Event Covering</div>
                          </div>
                          <div className="text-sm text-gray-800 font-medium mb-1">
                            {new Intl.DateTimeFormat('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'UTC'
                            }).format(new Date(form.event_covering_date))}
                          </div>
                          {form.event_covering_location && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <span>📍</span> {form.event_covering_location}
                            </div>
                          )}
                        </div>
                      )}
                      {form.custom_plan_date && (
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200/50 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                            <div className="text-sm font-bold text-emerald-700">Custom Plan</div>
                          </div>
                          <div className="text-sm text-gray-800 font-medium mb-1">
                            {new Intl.DateTimeFormat('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'UTC'
                            }).format(new Date(form.custom_plan_date))}
                          </div>
                          {form.custom_plan_location && (
                            <div className="text-xs text-gray-600 flex items-center gap-1">
                              <span>📍</span> {form.custom_plan_location}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button onClick={createItem} disabled={creatingLoading} className="btn-primary flex items-center gap-2">
                    {creatingLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Booking
                      </>
                    )}
                  </button>
                  <button onClick={() => setCreateModalOpen(false)} disabled={creatingLoading} className="btn-secondary flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
                </div>
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

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && bookingToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Booking</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete the booking for <span className="font-medium text-gray-900">&ldquo;{bookingToDelete.customer?.name || `Customer #${bookingToDelete.customer_id}`}&rdquo;</span>?
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
                  onClick={() => {
                    remove(bookingToDelete.id);
                    closeDeleteModal();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showPaymentModal && paymentModalTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Payment History - {paymentModalTarget.customer?.name || `Customer #${paymentModalTarget.customer_id}`}
              </h3>
              <button
                onClick={closePaymentModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {bookingPayments.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No payments recorded for this booking yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookingPayments.map((payment: any) => (
                  <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {payment.status}
                          </span>
                          <span className="text-sm text-gray-500">{payment.method}</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-lg font-semibold text-gray-900">
                            {formatCurrency(payment.amount)}
                          </span>
                          {payment.reference && (
                            <span className="text-sm text-gray-500 ml-2">({payment.reference})</span>
                          )}
                        </div>
                        {payment.paid_at && (
                          <div className="text-sm text-gray-500 mt-1">
                            Paid on {new Date(payment.paid_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-4 mt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total Paid:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(bookingPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {showEditBookingModal && editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Enhanced backdrop with blur */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEditBookingModal} />

          {/* Main modal container with enhanced styling */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300 flex flex-col">
            {/* Header with gradient background */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-8 py-6 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Edit Booking</h3>
                    <p className="text-indigo-100 text-sm">Update details for {editingBooking.customer?.name}</p>
                  </div>
                </div>
                <button
                  onClick={closeEditBookingModal}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content area with scroll - flex-1 to take remaining space */}
            <div className="px-8 py-6 overflow-y-auto flex-1">
              {/* Error display with enhanced styling */}
              {editErrors && Object.keys(editErrors).length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="w-5 h-5 text-red-500" />
                    <h4 className="font-semibold text-red-800">Please fix the following errors:</h4>
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {Object.entries(editErrors).map(([key, value]) => (
                      <li key={key} className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span><strong className="capitalize">{key.replace(/_/g, ' ')}:</strong> {value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form sections with enhanced styling */}
              <div className="space-y-8">
                {/* Basic Information Section */}
                <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Basic Information</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span>Customer</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white hover:border-gray-400"
                        value={editForm.customer_id || ''}
                        onChange={(e) => setEditForm({ ...editForm, customer_id: Number(e.target.value) })}
                      >
                        <option value="">Select customer *</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Package */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Package</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white hover:border-gray-400"
                        value={editForm.package_id || ''}
                        onChange={(e) => setEditForm({ ...editForm, package_id: e.target.value ? Number(e.target.value) : undefined })}
                      >
                        <option value="">No package</option>
                        {packages.map(p => <option key={p.id} value={p.id}>{p.name} {p.total_price ? `(${formatCurrency(p.total_price)})` : ''}</option>)}
                      </select>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Status</label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white hover:border-gray-400"
                        value={editForm.status || 'scheduled'}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      >
                        <option value="scheduled">📅 Scheduled</option>
                        <option value="completed">✅ Completed</option>
                        <option value="cancelled">❌ Cancelled</option>
                      </select>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Location</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 hover:border-gray-400"
                        placeholder="Enter location"
                        value={editForm.location || ''}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Booked Items Section */}
                <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900">Booked Items</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="input text-sm"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            addItemToEditingBooking(parseInt(e.target.value));
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">Add Item...</option>
                        {items.filter(item => !editingBookingItems.some(bi => bi.item_id === item.id)).map(item => (
                          <option key={item.id} value={item.id}>
                            {item.code} - {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {editingBookingItems.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {editingBookingItems.map((bookingItem: any) => (
                            <tr key={bookingItem.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {bookingItem.item?.code} - {bookingItem.item?.name}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                <input
                                  type="number"
                                  min="1"
                                  className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  value={bookingItem.quantity}
                                  onChange={(e) => updateEditingBookingItem(bookingItem.id, 'quantity', parseInt(e.target.value) || 1)}
                                />
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                <div className="flex items-center">
                                  <span className="text-gray-500 mr-1">{userCurrency}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={bookingItem.unit_price}
                                    onChange={(e) => updateEditingBookingItem(bookingItem.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {formatCurrency(bookingItem.subamount || 0)}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                <button
                                  onClick={() => removeEditingBookingItem(bookingItem.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No items in this booking</p>
                      <p className="text-sm mt-2">Use the dropdown above to add items</p>
                    </div>
                  )}

                  {editingBookingItems.length > 0 && (
                    <div className="mt-4 flex justify-end">
                      <div className="bg-blue-100 px-6 py-3 rounded-lg border border-blue-200">
                        <div className="text-lg font-semibold text-gray-900">
                          Total: {formatCurrency(editingBookingItems.reduce((total: number, item: any) => {
                            const subamount = Number(item.subamount) || 0;
                            return total + (isNaN(subamount) ? 0 : subamount);
                          }, 0) || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Information Section */}
                <div className="bg-green-50/50 rounded-2xl p-6 border border-green-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Financial Details</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Advance Payment */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Advance Payment <span className="text-xs text-gray-500 font-normal">({userCurrency})</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 font-semibold text-sm">{userCurrency}</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                          placeholder={`Enter amount in ${userCurrency}`}
                          value={editForm.advance_payment || ''}
                          onChange={(e) => setEditForm({ ...editForm, advance_payment: e.target.value === '' ? null : Number(e.target.value) })}
                        />
                      </div>
                      <p className="text-xs text-gray-500">Amount in {userCurrency}</p>
                    </div>

                    {/* Transport Charges */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Transport Charges <span className="text-xs text-gray-500 font-normal">({userCurrency})</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 font-semibold text-sm">{userCurrency}</span>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400"
                          placeholder={`Enter amount in ${userCurrency}`}
                          value={editForm.transport_charges || ''}
                          onChange={(e) => setEditForm({ ...editForm, transport_charges: e.target.value === '' ? null : Number(e.target.value) })}
                        />
                      </div>
                      <p className="text-xs text-gray-500">Amount in {userCurrency}</p>
                    </div>
                  </div>
                </div>

                {/* Event Details Section */}
                <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Plus className="w-4 h-4 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Event Details</h4>
                  </div>

                  <div className="space-y-6">
                    {/* Wedding Shoot */}
                    <div className="bg-white/60 rounded-xl p-4 border border-blue-200/50">
                      <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                        Wedding Shoot
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <input
                            type="datetime-local"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                            value={formatDateForInput(editForm.wedding_shoot_date)}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              setEditForm({ ...editForm, wedding_shoot_date: newDate });

                              // Auto-suggest related dates if they're not already set
                              if (newDate && (!editForm.preshoot_date || !editForm.homecoming_date)) {
                                const suggestions = suggestRelatedDates(newDate);
                                setEditForm(prev => ({
                                  ...prev,
                                  wedding_shoot_date: newDate,
                                  ...(!prev.preshoot_date ? { preshoot_date: suggestions.preshoot_date } : {}),
                                  ...(!prev.homecoming_date ? { homecoming_date: suggestions.homecoming_date } : {})
                                }));
                              }
                            }}
                          />
                         
                        </div>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                          placeholder="Wedding location"
                          value={editForm.wedding_shoot_location || ''}
                          onChange={(e) => setEditForm({ ...editForm, wedding_shoot_location: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Preshoot */}
                    <div className="bg-white/60 rounded-xl p-4 border border-blue-200/50">
                      <h5 className="font-medium text-gray-800 mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          Preshoot
                        </div>
                        {editForm.preshoot_date && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                            Auto-suggested
                          </span>
                        )}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <input
                            type="datetime-local"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                            value={formatDateForInput(editForm.preshoot_date)}
                            onChange={(e) => setEditForm({ ...editForm, preshoot_date: e.target.value })}
                          />
                          {editForm.preshoot_date && (
                            <p className="text-xs text-gray-500">Suggested: 1 week before wedding</p>
                          )}
                        </div>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                          placeholder="Preshoot location"
                          value={editForm.preshoot_location || ''}
                          onChange={(e) => setEditForm({ ...editForm, preshoot_location: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Homecoming */}
                    <div className="bg-white/60 rounded-xl p-4 border border-blue-200/50">
                      <h5 className="font-medium text-gray-800 mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                          Homecoming
                        </div>
                        {editForm.homecoming_date && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                            Auto-suggested
                          </span>
                        )}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <input
                            type="datetime-local"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                            value={formatDateForInput(editForm.homecoming_date)}
                            onChange={(e) => setEditForm({ ...editForm, homecoming_date: e.target.value })}
                          />
                          {editForm.homecoming_date && (
                            <p className="text-xs text-gray-500">Suggested: 1 day after wedding</p>
                          )}
                        </div>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                          placeholder="Homecoming location"
                          value={editForm.homecoming_location || ''}
                          onChange={(e) => setEditForm({ ...editForm, homecoming_location: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Function */}
                    <div className="bg-white/60 rounded-xl p-4 border border-blue-200/50">
                      <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                        Function
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="datetime-local"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                          value={formatDateForInput(editForm.function_date)}
                          onChange={(e) => setEditForm({ ...editForm, function_date: e.target.value })}
                        />
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                          placeholder="Function location"
                          value={editForm.function_location || ''}
                          onChange={(e) => setEditForm({ ...editForm, function_location: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Event Covering */}
                    <div className="bg-white/60 rounded-xl p-4 border border-blue-200/50">
                      <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                        Event Covering
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="datetime-local"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                          value={formatDateForInput(editForm.event_covering_date)}
                          onChange={(e) => setEditForm({ ...editForm, event_covering_date: e.target.value })}
                        />
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                          placeholder="Event location"
                          value={editForm.event_covering_location || ''}
                          onChange={(e) => setEditForm({ ...editForm, event_covering_location: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Custom Plan */}
                    <div className="bg-white/60 rounded-xl p-4 border border-blue-200/50">
                      <h5 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Custom Plan
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="datetime-local"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                          value={formatDateForInput(editForm.custom_plan_date)}
                          onChange={(e) => setEditForm({ ...editForm, custom_plan_date: e.target.value })}
                        />
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400"
                          placeholder="Custom plan location"
                          value={editForm.custom_plan_location || ''}
                          onChange={(e) => setEditForm({ ...editForm, custom_plan_location: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Plus className="w-4 h-4 text-amber-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Additional Notes</h4>
                  </div>

                  <textarea
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 hover:border-gray-400 resize-none"
                    placeholder="Add any additional notes or special requirements..."
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Footer with enhanced buttons - flex-shrink-0 to prevent shrinking */}
            <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex-shrink-0">
              <div className="flex justify-end gap-4">
                <button
                  onClick={closeEditBookingModal}
                  className="px-8 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveEdit()}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 text-base"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

<style jsx global>{`
  .input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    transition: border-color 0.2s, box-shadow 0.2s;
    pointer-events: auto !important;
    cursor: text !important;
  }
  .input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .input:not(:disabled) {
    pointer-events: auto !important;
    cursor: text !important;
  }
  .input:disabled {
    background-color: #f9fafb;
    cursor: not-allowed;
    opacity: 0.6;
    pointer-events: none;
  }
`}</style>
