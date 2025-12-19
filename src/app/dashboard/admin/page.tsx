"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Camera, DollarSign, CalendarCheck, Wallet, Upload, Package, Users, ClipboardList, BarChart3 } from "lucide-react";
import Link from "next/link";
import { isFreeExpired } from "@/lib/access";

type ApiUser = { id: number; name: string; email: string; role: string; logo_url?: string | null };
type TrialStatus = { is_trial_active: boolean; trial_days_remaining: number; subscription_plan?: string | null; show_warning?: boolean };

export default function AdminDashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<ApiUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [photosCount, setPhotosCount] = useState<number>(0);
    const [bookingsCount, setBookingsCount] = useState<number>(0);
    const [paymentsCount, setPaymentsCount] = useState<number>(0);
    const [earningsAmount, setEarningsAmount] = useState<number>(0);
    const [earningsCurrency, setEarningsCurrency] = useState<string>('USD');

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        const authUserRaw = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
        if (authUserRaw) {
            try {
                const u = JSON.parse(authUserRaw) as ApiUser;
                if (!['business', 'photographer', 'admin', 'super'].includes((u.role || '').toLowerCase())) {
                    router.replace('/dashboard');
                    return;
                }
            } catch { }
        }
        if (!token) {
            router.replace("/login");
            return;
        }
        // If free plan is expired, redirect to upgrade immediately
        if (isFreeExpired()) {
            router.replace('/pricing');
            return;
        }
        (async () => {
            try {
                const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
                if (!meRes.ok) throw new Error("Unauthorized");
                const me = (await meRes.json()) as ApiUser;
                setUser(me);
                // After user loads, fetch lightweight stats
                try {
                    setStatsLoading(true);
                    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
                    const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` } as const;

                    const [photosRes, bookingsRes, paymentsRes, earningsRes] = await Promise.all([
                        fetch(`${base}/api/my/photos?per_page=1`, { headers }),
                        fetch(`${base}/api/admin/bookings?per_page=1`, { headers }),
                        fetch(`${base}/api/admin/payments?per_page=1`, { headers }),
                        fetch(`${base}/api/admin/payments/summary`, { headers }),
                    ]);

                    // Photos
                    try {
                        const data = await photosRes.json();
                        const total = (data?.total ?? data?.data?.total ?? data?.meta?.total ?? 0) as number;
                        if (typeof total === 'number') setPhotosCount(total);
                    } catch {}

                    // Bookings
                    try {
                        const data = await bookingsRes.json();
                        const total = (data?.total ?? data?.data?.total ?? data?.meta?.total ?? 0) as number;
                        if (typeof total === 'number') setBookingsCount(total);
                    } catch {}

                    // Payments
                    try {
                        const data = await paymentsRes.json();
                        const total = (data?.total ?? data?.data?.total ?? data?.meta?.total ?? 0) as number;
                        if (typeof total === 'number') setPaymentsCount(total);
                    } catch {}

                    // Earnings (month)
                    try {
                        const data = await earningsRes.json();
                        const monthTotal = Number(data?.month_total ?? 0);
                        setEarningsAmount(isFinite(monthTotal) ? monthTotal : 0);
                        if (data?.currency) setEarningsCurrency(String(data.currency));
                    } catch {}
                } finally {
                    setStatsLoading(false);
                }
            } catch (e) {
                setError('Unauthorized');
                setTimeout(() => router.replace("/login"), 800);
            } finally {
                setLoading(false);
            }
        })();
    }, [router]);

    return (
        <>
            <main>
                <Navbar />
                <section className="pt-24 pb-16 bg-[#F7F8FA] min-h-screen">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="bg-white border border-[#E4E7EB] rounded-2xl shadow-sm"
                        >
                            <div className="p-6 md:p-8">
                                {/* Welcome */}
                                {!loading && user && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {user.logo_url && (
                                                <img src={user.logo_url} alt="Logo" className="max-h-12 w-auto object-contain" />
                                            )}
                                            <div>
                                                <h1 className="text-2xl font-bold text-[#1F2937]">Hello, {user?.name || 'savidu photo'}</h1>
                                                <div className="mt-1 inline-flex items-center gap-2">
                                                    <span className="text-xs text-gray-600">Role</span>
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full border border-[#E4E7EB] text-[#1F2937]">
                                                        {(user.role || 'Photographer')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                        <Camera className="w-5 h-5 text-gray-700" />
                                        <div>
                                            <div className="text-sm text-gray-600">Images</div>
                                            <div className="text-lg font-semibold text-[#1F2937]">{statsLoading ? '—' : photosCount}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                        <DollarSign className="w-5 h-5 text-gray-700" />
                                        <div>
                                            <div className="text-sm text-gray-600">Earnings</div>
                                            <div className="text-lg font-semibold text-[#1F2937]">
                                                {statsLoading ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency: earningsCurrency || 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).format(earningsAmount)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                        <CalendarCheck className="w-5 h-5 text-gray-700" />
                                        <div>
                                            <div className="text-sm text-gray-600">Bookings</div>
                                            <div className="text-lg font-semibold text-[#1F2937]">{statsLoading ? '—' : bookingsCount}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                        <Wallet className="w-5 h-5 text-gray-700" />
                                        <div>
                                            <div className="text-sm text-gray-600">Payments</div>
                                            <div className="text-lg font-semibold text-[#1F2937]">{statsLoading ? '—' : paymentsCount}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sections */}
                                <div className="mt-10">
                                    <h2 className="text-lg font-bold text-[#1F2937]">Website Tools</h2>
                                    <p className="text-xs text-gray-600 mb-4">Simple tools for managing your portfolio</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Link href="/dashboard/upload" className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                            <Upload className="w-5 h-5 text-gray-700" />
                                            <div>
                                                <div className="text-[#1F2937] font-medium">Upload Images</div>
                                                <div className="text-xs text-gray-600">Add new photos to your portfolio</div>
                                            </div>
                                        </Link>
                                        <Link href="/dashboard/admin/earnings" className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                            <DollarSign className="w-5 h-5 text-gray-700" />
                                            <div>
                                                <div className="text-[#1F2937] font-medium">Earnings</div>
                                                <div className="text-xs text-gray-600">Track your revenue</div>
                                            </div>
                                        </Link>
                                        <Link href="/dashboard/admin/transactions" className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                            <Wallet className="w-5 h-5 text-gray-700" />
                                            <div>
                                                <div className="text-[#1F2937] font-medium">Transactions</div>
                                                <div className="text-xs text-gray-600">Withdrawals and payouts</div>
                                            </div>
                                        </Link>
                                    </div>
                                </div>

                                <div className="mt-10">
                                    <h2 className="text-lg font-bold text-[#1F2937]">Package Management</h2>
                                    <p className="text-xs text-gray-600 mb-4">Manage services and bundles</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Link href="/dashboard/admin/items" className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                            <Camera className="w-5 h-5 text-gray-700" />
                                            <div>
                                                <div className="text-[#1F2937] font-medium">Items</div>
                                                <div className="text-xs text-gray-600">Register and manage offerings</div>
                                            </div>
                                        </Link>
                                        <Link href="/dashboard/admin/packages" className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                            <Package className="w-5 h-5 text-gray-700" />
                                            <div>
                                                <div className="text-[#1F2937] font-medium">Packages</div>
                                                <div className="text-xs text-gray-600">Create service bundles</div>
                                            </div>
                                        </Link>
                                    </div>
                                </div>

                                <div className="mt-10">
                                    <h2 className="text-lg font-bold text-[#1F2937]">Business Tools</h2>
                                    <p className="text-xs text-gray-600 mb-4">Operate and grow your business</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Link href="/dashboard/admin/customers" className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                            <Users className="w-5 h-5 text-gray-700" />
                                            <div>
                                                <div className="text-[#1F2937] font-medium">Customers</div>
                                                <div className="text-xs text-gray-600">Manage customer details</div>
                                            </div>
                                        </Link>
                                        <Link href="/dashboard/admin/bookings" className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                            <CalendarCheck className="w-5 h-5 text-gray-700" />
                                            <div>
                                                <div className="text-[#1F2937] font-medium">Bookings</div>
                                                <div className="text-xs text-gray-600">Track shoots and events</div>
                                            </div>
                                        </Link>
                                        <Link href="/dashboard/admin/job-cards" className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                            <ClipboardList className="w-5 h-5 text-gray-700" />
                                            <div>
                                                <div className="text-[#1F2937] font-medium">Job Cards</div>
                                                <div className="text-xs text-gray-600">Tasks and assignments</div>
                                            </div>
                                        </Link>
                                        <Link href="/dashboard/admin/payments" className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                            <DollarSign className="w-5 h-5 text-gray-700" />
                                            <div>
                                                <div className="text-[#1F2937] font-medium">Payments</div>
                                                <div className="text-xs text-gray-600">Record and reconcile</div>
                                            </div>
                                        </Link>
                                        <Link href="/dashboard/admin/accounting" className="flex items-center gap-3 bg-white border border-[#E4E7EB] rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] p-4">
                                            <BarChart3 className="w-5 h-5 text-gray-700" />
                                            <div>
                                                <div className="text-[#1F2937] font-medium">Accounting</div>
                                                <div className="text-xs text-gray-600">Income and expenses</div>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>
                <Footer />
            </main>
            
        </>
    );
}
