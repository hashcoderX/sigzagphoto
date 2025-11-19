"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Briefcase, Settings, Store, ShieldCheck } from "lucide-react";

type ApiUser = { id: number; name: string; email: string; role: string };

export default function BusinessDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) throw new Error("Unauthorized");
        const me = (await meRes.json()) as ApiUser;
        setUser(me);
        // Optional: If user isn't business, keep them but show a notice
      } catch (e) {
        router.replace("/login");
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
            <div className="flex items-center gap-3 mb-6">
              <Briefcase className="w-6 h-6 text-[#6C63FF]" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Manage My Business</h1>
            </div>

            {loading && <p className="text-gray-600">Loading...</p>}

            {!loading && user && user.role !== "business" && (
              <div className="mb-8 bg-yellow-50 border-2 border-yellow-200 text-yellow-900 px-6 py-4 rounded-xl">
                <p className="font-semibold">Heads up</p>
                <p className="text-sm">Your account role is "{user.role}". Business tools are optimized for Business accounts.</p>
              </div>
            )}

            {/* Placeholder sections for future features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border-2 border-gray-100">
                <div className="flex items-center space-x-3 mb-2">
                  <Store className="w-5 h-5 text-[#6C63FF]" />
                  <p className="text-sm text-gray-500">Business Profile</p>
                </div>
                <p className="text-gray-700">Set your brand info, logo, and contact details.</p>
              </div>

              <div className="p-6 rounded-2xl border-2 border-gray-100">
                <div className="flex items-center space-x-3 mb-2">
                  <Settings className="w-5 h-5 text-[#6C63FF]" />
                  <p className="text-sm text-gray-500">Catalog</p>
                </div>
                <p className="text-gray-700">Organize offerings, pricing, and promotions.</p>
              </div>

              <div className="p-6 rounded-2xl border-2 border-gray-100">
                <div className="flex items-center space-x-3 mb-2">
                  <ShieldCheck className="w-5 h-5 text-[#6C63FF]" />
                  <p className="text-sm text-gray-500">Permissions</p>
                </div>
                <p className="text-gray-700">Manage team access and approvals.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
