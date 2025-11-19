"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import AdminSectionHeader from "@/components/AdminSectionHeader";

interface Summary {
  overall: { gross: number; owner_commission: number; photographer_earning: number };
  today: { gross: number; owner_commission: number; photographer_earning: number };
  month: { gross: number; owner_commission: number; photographer_earning: number };
  rates: { owner: number; photographer: number };
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function SuperIncomePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const authUserRaw = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    if (!t) { router.replace('/login'); return; }
    if (authUserRaw) {
      try { const u = JSON.parse(authUserRaw) as { role?: string }; if (!['admin','super'].includes((u.role||'').toLowerCase())) { router.replace('/dashboard'); return; } } catch {}
    }
    setToken(t);
    fetchSummary(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSummary = async (t: string) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/super/income/summary`, { headers: { Accept: 'application/json', Authorization: `Bearer ${t}` } });
      if (!res.ok) throw new Error('Failed to load summary');
      const data = await res.json(); setSummary(data);
    } catch (e: any) { setError(e?.message || 'Failed to load summary'); } finally { setLoading(false); }
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <AdminSectionHeader title="Platform Income" subtitle="30% owner commission / 70% photographer earning" />
            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>}

            {loading || !summary ? <p className="text-gray-600">Loading...</p> : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                  <h4 className="cardTitleSm">Overall</h4>
                  <p className="metric">Gross: <strong>${fmt(summary.overall.gross)}</strong></p>
                  <p className="metric">Owner (30%): <strong>${fmt(summary.overall.owner_commission)}</strong></p>
                  <p className="metric">Photographer (70%): <strong>${fmt(summary.overall.photographer_earning)}</strong></p>
                </div>
                <div className="card">
                  <h4 className="cardTitleSm">Today</h4>
                  <p className="metric">Gross: <strong>${fmt(summary.today.gross)}</strong></p>
                  <p className="metric">Owner (30%): <strong>${fmt(summary.today.owner_commission)}</strong></p>
                  <p className="metric">Photographer (70%): <strong>${fmt(summary.today.photographer_earning)}</strong></p>
                </div>
                <div className="card">
                  <h4 className="cardTitleSm">This Month</h4>
                  <p className="metric">Gross: <strong>${fmt(summary.month.gross)}</strong></p>
                  <p className="metric">Owner (30%): <strong>${fmt(summary.month.owner_commission)}</strong></p>
                  <p className="metric">Photographer (70%): <strong>${fmt(summary.month.photographer_earning)}</strong></p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
      <Footer />
      <style jsx global>{`
        .card { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.75rem; background: #fff; }
        .cardTitleSm { font-weight: 700; color: #111827; margin-bottom: .35rem; }
        .metric { font-size: .9rem; color: #374151; }
      `}</style>
    </main>
  );
}
