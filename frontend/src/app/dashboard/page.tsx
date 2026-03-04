"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { User, Image as ImageIcon, Shield, TrendingUp, Upload, Briefcase } from "lucide-react";
import Link from "next/link";
import { hasBusinessAccess, isFreeExpired } from "@/lib/access";

type ApiUser = { id: number; name: string; email: string; role: string; premium_package?: boolean };
type Summary = { message: string; role: string; stats: { photos: number; sales: number; earnings: number } };
type TrialStatus = { is_trial_active: boolean; trial_days_remaining: number; show_warning?: boolean; subscription_plan?: string | null };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trial, setTrial] = useState<TrialStatus | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    // If free plan is expired, redirect immediately
    if (isFreeExpired()) {
      router.replace('/pricing');
      return;
    }
    (async () => {
      try {
        const [meRes, sumRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard-summary`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          })
        ]);
        if (!meRes.ok) throw new Error("Unauthorized");
        const me = (await meRes.json()) as ApiUser;
        setUser(me);
        if (sumRes.ok) {
          const s = (await sumRes.json()) as Summary;
          setSummary(s);
        }
        // Trial system removed; free access is handled via client-side 30-day window.
      } catch (e: any) {
        setError(e?.message || "Failed to load dashboard");
        setTimeout(() => router.replace("/login"), 900);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-10"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Dashboard</h1>
            {loading && <p className="text-gray-600">Loading...</p>}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl">{error}</div>
            )}
            {user && (
              <div>
                <p className="text-lg text-gray-700 mb-8">Welcome back, <span className="font-semibold">{user.name}</span>!</p>
                {trial && (
                  <div className="mb-6">
                    {trial.is_trial_active ? (
                      <div className={`px-5 py-3 rounded-xl text-sm font-medium ${trial.show_warning ? 'bg-amber-50 border-2 border-amber-200 text-amber-800' : 'bg-indigo-50 border-2 border-indigo-200 text-indigo-700'}`}>
                        {trial.trial_days_remaining} day{trial.trial_days_remaining === 1 ? '' : 's'} remaining in your free trial.
                      </div>
                    ) : (
                      !trial.subscription_plan && (
                        <div className="px-5 py-3 rounded-xl text-sm font-medium bg-red-50 border-2 border-red-200 text-red-700">
                          Your trial has ended. Upgrade to continue using premium features.
                        </div>
                      )
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl border-2 border-gray-100">
                    <div className="flex items-center space-x-3 mb-2">
                      <ImageIcon className="w-5 h-5 text-[#6C63FF]" />
                      <p className="text-sm text-gray-500">Photos</p>
                    </div>
                    <p className="text-3xl font-bold">{summary?.stats.photos ?? 0}</p>
                  </div>
                  <div className="p-6 rounded-2xl border-2 border-gray-100">
                    <div className="flex items-center space-x-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-[#6C63FF]" />
                      <p className="text-sm text-gray-500">Sales</p>
                    </div>
                    <p className="text-3xl font-bold">{summary?.stats.sales ?? 0}</p>
                  </div>
                  <div className="p-6 rounded-2xl border-2 border-gray-100">
                    <div className="flex items-center space-x-3 mb-2">
                      <Shield className="w-5 h-5 text-[#6C63FF]" />
                      <p className="text-sm text-gray-500">Earnings</p>
                    </div>
                    <p className="text-3xl font-bold">
                      ${ new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(summary?.stats.earnings ?? 0) }
                    </p>
                  </div>
                </div>

                <div className="mt-8 text-sm text-gray-600">Role: <span className="capitalize">{user.role}</span></div>

                {/* Quick Actions */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link
                    href="/dashboard/upload"
                    className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white font-semibold bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] shadow-lg hover:shadow-xl transition-all"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Photos
                  </Link>

                  {(() => {
                    const roleOk = (user.role === 'business') || (user.role === 'photographer');
                    const access = roleOk && hasBusinessAccess();
                    if (access) {
                      return (
                        <Link
                          href="/dashboard/admin"
                          className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white font-semibold bg-gray-900 hover:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
                        >
                          <Briefcase className="w-5 h-5" />
                          Manage My Business
                        </Link>
                      );
                    }
                    if (roleOk) {
                      return (
                        <Link
                          href="/upgrade"
                          className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-white font-semibold bg-red-600 hover:bg-red-500 shadow-lg hover:shadow-xl transition-all"
                        >
                          Upgrade Required
                        </Link>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
