"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import Link from "next/link";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { Users, DollarSign } from "lucide-react";

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const authUserRaw = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    if (!t) { router.replace('/login'); return; }
    if (authUserRaw) {
      try {
        const u = JSON.parse(authUserRaw) as { role?: string };
        if ((u.role || '').toLowerCase() !== 'super') { router.replace('/dashboard'); return; }
      } catch {}
    }
    setToken(t); setLoading(false);
  }, [router]);

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <AdminSectionHeader title="Super Admin" subtitle="Platform owner controls" />

            {loading ? <p className="text-gray-600">Loading...</p> : (
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
            )}
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
