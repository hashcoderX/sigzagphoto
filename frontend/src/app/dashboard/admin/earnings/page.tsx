"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

export default function EarningsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const role = (() => { try { return JSON.parse(localStorage.getItem('auth_user')||'{}')?.role?.toLowerCase?.(); } catch { return undefined; } })();
    if (!token) { router.replace('/login'); return; }
    if (!['business','photographer'].includes(role || '')) { router.replace('/dashboard'); return; }
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    setLoading(false);
  }, [router]);

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <AdminSectionHeader title="Earnings" subtitle="Image selling income overview" />
            {loading ? <p className="text-gray-600">Loading...</p> : (
              <div className="p-6 border-2 border-indigo-100 rounded-2xl bg-indigo-50 text-indigo-800">
                <p className="font-semibold">Coming soon</p>
                <p className="text-sm mt-1">This section will summarize revenue from image sales, including trends and top-selling assets.</p>
              </div>
            )}
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
