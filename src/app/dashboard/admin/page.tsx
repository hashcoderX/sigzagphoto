"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Briefcase, Users, DollarSign, Settings, BarChart3, CalendarCheck, FileText, BellRing, ClipboardList, Upload, Wallet } from "lucide-react";
import Link from "next/link";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { hasBusinessAccess, isFreeExpired } from "@/lib/access";

type ApiUser = { id: number; name: string; email: string; role: string; logo_url?: string | null };
type TrialStatus = { is_trial_active: boolean; trial_days_remaining: number; subscription_plan?: string | null; show_warning?: boolean };

export default function AdminDashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<ApiUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [trial, setTrial] = useState<TrialStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

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
                <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="bg-white rounded-3xl shadow-2xl p-8 md:p-10"
                        >
                            <AdminSectionHeader title="Admin Dashboard" subtitle="Central control panel for managing your business" />

                            {loading && <p className="text-gray-600">Loading...</p>}

                            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-700 px-5 py-3 rounded-xl">{error}</div>}
                            {!loading && user && (
                                <div className="mb-8 space-y-4">
                                    <div className="flex items-center space-x-4">
                                        {user.logo_url && (
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={user.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-gray-700">Hello, <span className="font-semibold">{user.name}</span> — role: <span className={`roleBadge role-${(user.role || '').toLowerCase()} capitalize`}>{user.role}</span></p>
                                        </div>
                                    </div>
                                    {trial && (
                                        trial.is_trial_active ? (
                                            <div className={`px-5 py-3 rounded-xl text-sm font-medium ${trial.show_warning ? 'bg-amber-50 border-2 border-amber-200 text-amber-800' : 'bg-indigo-50 border-2 border-indigo-200 text-indigo-700'}`}>
                                                {trial.trial_days_remaining} day{trial.trial_days_remaining === 1 ? '' : 's'} remaining in trial.
                                            </div>
                                        ) : (!trial.subscription_plan && (
                                            <div className="px-5 py-3 rounded-xl text-sm font-medium bg-red-50 border-2 border-red-200 text-red-700">
                                                Trial ended. Upgrade required for admin features.
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Website Management Suite */}
                            <div className="suiteSection">
                                <div className="suiteHeader">
                                    <div className="suiteIcon"><Briefcase className="w-5 h-5" /></div>
                                    <div>
                                        <h3 className="suiteTitle">Website Management Suite</h3>
                                        <p className="suiteSubtitle">Content, settings, and platform configuration</p>
                                    </div>
                                </div>
                                <div className="adminDashGrid" role="navigation" aria-label="Website management sections">
                                    <Link href="/dashboard/upload" className="adminDashCard" aria-label="Upload images">
                                        <div className="cardIconWrap"><Upload className="cardIcon" aria-hidden="true" /></div>
                                        <h2 className="cardTitle">Upload Images</h2>
                                        <p className="cardDesc">Add new photos to your portfolio.</p>
                                    </Link>
                                    <Link href="/dashboard/admin/earnings" className="adminDashCard" aria-label="View earnings">
                                        <div className="cardIconWrap"><DollarSign className="cardIcon" aria-hidden="true" /></div>
                                        <h2 className="cardTitle">Earnings</h2>
                                        <p className="cardDesc">Track image selling income.</p>
                                    </Link>
                                    <Link href="/dashboard/admin/transactions" className="adminDashCard" aria-label="Transaction history">
                                        <div className="cardIconWrap"><Wallet className="cardIcon" aria-hidden="true" /></div>
                                        <h2 className="cardTitle">Transactions</h2>
                                        <p className="cardDesc">Withdrawals and payout history.</p>
                                    </Link>
                                    
                                </div>
                            </div>

                            {/* Business Management Suite - Access if within free window, monthly/yearly, or premium */}
                            {(() => {
                                const hasAccess = hasBusinessAccess();
                                if (!hasAccess) {
                                    return (
                                        <div className="suiteSection">
                                            <div className="suiteHeader">
                                                <div className="suiteIcon"><BarChart3 className="w-5 h-5" /></div>
                                                <div>
                                                    <h3 className="suiteTitle">Business Management Suite</h3>
                                                    <p className="suiteSubtitle">Operations, finance, and customer management</p>
                                                </div>
                                            </div>
                                            <div className="px-6 py-8 rounded-2xl border-2 border-yellow-200 bg-yellow-50 text-center">
                                                <p className="text-sm text-yellow-900 font-semibold mb-3">Business Management Suite is available on Monthly or Yearly plans.</p>
                                                <Link href="/upgrade" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white shadow-lg hover:shadow-xl transition-all">
                                                    Upgrade Now
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                            {(() => {
                                const hasAccess = hasBusinessAccess();
                                if (!hasAccess) return null;
                                return (
                                    <div className="suiteSection">
                                        <div className="suiteHeader">
                                            <div className="suiteIcon"><BarChart3 className="w-5 h-5" /></div>
                                            <div>
                                                <h3 className="suiteTitle">Business Management Suite</h3>
                                                <p className="suiteSubtitle">Operations, finance, and customer management</p>
                                            </div>
                                        </div>
                                        <div className="adminDashGrid" role="navigation" aria-label="Business management sections">
                                    <Link href="/dashboard/admin/customers" className="adminDashCard" aria-label="Customers module">
                                        <div className="cardIconWrap"><Users className="cardIcon" aria-hidden="true" /></div>
                                        <h2 className="cardTitle">Customers</h2>
                                        <p className="cardDesc">Manage customer contacts and details.</p>
                                    </Link>
                                    <Link href="/dashboard/admin/bookings" className="adminDashCard" aria-label="Bookings module">
                                        <div className="cardIconWrap"><CalendarCheck className="cardIcon" aria-hidden="true" /></div>
                                        <h2 className="cardTitle">Bookings</h2>
                                        <p className="cardDesc">Create and track your shoots and events.</p>
                                    </Link>
                                    <Link href="/dashboard/admin/job-cards" className="adminDashCard" aria-label="Job cards module">
                                        <div className="cardIconWrap"><ClipboardList className="cardIcon" aria-hidden="true" /></div>
                                        <h2 className="cardTitle">Job Cards</h2>
                                        <p className="cardDesc">Tasks, assignments, and due dates.</p>
                                    </Link>
                                    <Link href="/dashboard/admin/invoices" className="adminDashCard" aria-label="Invoices module">
                                        <div className="cardIconWrap"><FileText className="cardIcon" aria-hidden="true" /></div>
                                        <h2 className="cardTitle">Invoices</h2>
                                        <p className="cardDesc">Create and track invoices.</p>
                                    </Link>
                                    <Link href="/dashboard/admin/payments" className="adminDashCard" aria-label="Payments module">
                                        <div className="cardIconWrap"><DollarSign className="cardIcon" aria-hidden="true" /></div>
                                        <h2 className="cardTitle">Payments</h2>
                                        <p className="cardDesc">Record and reconcile client payments.</p>
                                    </Link>
                                    <Link href="/dashboard/admin/reminders" className="adminDashCard" aria-label="Reminders module">
                                        <div className="cardIconWrap"><BellRing className="cardIcon" aria-hidden="true" /></div>
                                        <h2 className="cardTitle">Reminders</h2>
                                        <p className="cardDesc">Follow-ups and alerts for key dates.</p>
                                    </Link>
                                    <Link href="/dashboard/admin/accounting" className="adminDashCard" aria-label="Accounting module">
                                        <div className="cardIconWrap"><BarChart3 className="cardIcon" aria-hidden="true" /></div>
                                        <h2 className="cardTitle">Accounting</h2>
                                        <p className="cardDesc">Income, expenses, and categories.</p>
                                    </Link>

                                            <Link href="/dashboard/admin/settings" className="adminDashCard" aria-label="Settings module">
                                                <div className="cardIconWrap"><Settings className="cardIcon" aria-hidden="true" /></div>
                                                <h2 className="cardTitle">Settings</h2>
                                                <p className="cardDesc">Configure company profile and preferences.</p>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Super Admin Suite */}
                            {user && ['admin','super'].includes((user.role || '').toLowerCase()) && (
                                <div className="suiteSection">
                                    <div className="suiteHeader">
                                        <div className="suiteIcon"><Users className="w-5 h-5" /></div>
                                        <div>
                                            <h3 className="suiteTitle">Super Admin</h3>
                                            <p className="suiteSubtitle">Platform-wide management for the website owner</p>
                                        </div>
                                    </div>
                                    <div className="adminDashGrid" role="navigation" aria-label="Super admin sections">
                                        <Link href="/dashboard/admin/super/users" className="adminDashCard" aria-label="Review photographers and businesses">
                                            <div className="cardIconWrap"><Users className="cardIcon" aria-hidden="true" /></div>
                                            <h2 className="cardTitle">Review Accounts</h2>
                                            <p className="cardDesc">Activate/deactivate photographers & businesses.</p>
                                        </Link>
                                        <Link href="/dashboard/admin/super/income" className="adminDashCard" aria-label="Platform income summary">
                                            <div className="cardIconWrap"><DollarSign className="cardIcon" aria-hidden="true" /></div>
                                            <h2 className="cardTitle">Platform Income</h2>
                                            <p className="cardDesc">30% owner commission vs 70% earnings.</p>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </section>
                <Footer />
            </main>
            <style jsx global>{`
                    .suiteSection { margin-top:2rem; }
                    .suiteSection:first-of-type { margin-top:0; }
                    .suiteHeader { display:flex; align-items:center; gap:.75rem; margin-bottom:1rem; padding-bottom:.75rem; border-bottom:2px solid #e5e7eb; }
                    .suiteIcon { width:42px; height:42px; display:flex; align-items:center; justify-content:center; border-radius:1rem; background:linear-gradient(135deg,#6366f1,#8b5cf6); box-shadow:0 6px 14px -4px rgba(99,102,241,0.55); color:#fff; position:relative; overflow:hidden; }
                    .suiteIcon:before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 30% 25%,rgba(255,255,255,0.55),transparent 70%); }
                    .suiteTitle { font-size:1rem; font-weight:700; letter-spacing:.5px; color:#1e293b; margin:0; }
                    .suiteSubtitle { font-size:.7rem; color:#64748b; margin:0; margin-top:.15rem; }
                    .adminDashGrid { display:grid; gap:1.4rem; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); margin-top:.5rem; }
                    .adminDashCard { position:relative; display:flex; flex-direction:column; gap:.55rem; padding:1.1rem 1rem 1.2rem; border-radius:1.25rem; text-decoration:none; background:linear-gradient(145deg,#ffffff,#f5f3ff); border:1px solid #e5e7eb; box-shadow:0 8px 24px -8px rgba(99,102,241,0.25),0 2px 6px -2px rgba(31,41,55,0.08); overflow:hidden; transition:box-shadow .4s, transform .35s, border-color .35s; }
                    .adminDashCard:before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 85% 15%,rgba(139,92,246,0.25),transparent 70%),radial-gradient(circle at 15% 85%,rgba(99,102,241,0.18),transparent 60%); pointer-events:none; }
                    .adminDashCard:after { content:""; position:absolute; inset:0; background:linear-gradient(120deg,rgba(255,255,255,0.45),rgba(255,255,255,0)); mix-blend-mode:overlay; pointer-events:none; }
                    .adminDashCard:hover { border-color:#6366f1; box-shadow:0 16px 38px -10px rgba(99,102,241,0.45),0 6px 18px -8px rgba(31,41,55,0.15); transform:translateY(-4px); }
                    .adminDashCard:focus-visible { outline:3px solid #818cf8; outline-offset:3px; }
                    .cardIconWrap { width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:1rem; background:linear-gradient(135deg,#6366f1,#8b5cf6); box-shadow:0 6px 14px -4px rgba(99,102,241,0.55); position:relative; overflow:hidden; }
                    .cardIconWrap:before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 30% 25%,rgba(255,255,255,0.55),transparent 70%); }
                    .cardIcon { width:22px; height:22px; color:#ffffff; }
                    .cardTitle { font-size:0.9rem; font-weight:700; letter-spacing:.4px; color:#1e293b; margin:0; }
                    .cardDesc { font-size:.7rem; line-height:1.15rem; color:#475569; margin:0; }
                    @media (prefers-reduced-motion: reduce) { .adminDashCard { transition:none; } .adminDashCard:hover { transform:none; } }
                    /* Role badge styling */
                    .roleBadge { display:inline-flex; align-items:center; gap:4px; font-size:.65rem; font-weight:700; letter-spacing:.5px; padding:.45rem .7rem .4rem; border-radius:999px; position:relative; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 12px -4px rgba(99,102,241,0.55); text-transform:uppercase; }
                    .roleBadge:before { content:""; position:absolute; inset:0; border-radius:inherit; background:radial-gradient(circle at 30% 25%,rgba(255,255,255,0.55),transparent 70%); pointer-events:none; }
                    .roleBadge.role-business { background:linear-gradient(135deg,#2563eb,#7c3aed); }
                    .roleBadge.role-photographer { background:linear-gradient(135deg,#10b981,#059669); }
                    .roleBadge.role-admin { background:linear-gradient(135deg,#dc2626,#f97316); }
                    .roleBadge.role-user { background:linear-gradient(135deg,#6b7280,#374151); }
                    .roleBadge:focus-visible { outline:2px solid #818cf8; outline-offset:2px; }
                `}</style>
        </>
    );
}
