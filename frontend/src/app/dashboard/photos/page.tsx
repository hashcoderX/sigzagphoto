"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Download, Lock } from "lucide-react";

type MyPhoto = {
  id: number;
  title: string;
  description: string | null;
  is_free: boolean;
  price: number | null;
  downloads: number;
  url: string;
  download_url: string;
  created_at: string;
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export default function MyPhotosPage() {
  const router = useRouter();
  const [page, setPage] = useState<number>(1);
  const [list, setList] = useState<Paginated<MyPhoto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // initialize page from URL on client
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const p = Number(url.searchParams.get('page') || 1);
      setPage(isNaN(p) || p < 1 ? 1 : p);
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/my/photos?page=${page}`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = (await res.json()) as Paginated<MyPhoto>;
        setList(data);
      } catch (e: any) {
        setError(e?.message || "Failed to load photos");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, page]);

  const pushPage = (p: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(p));
    router.push(url.pathname + url.search);
    setPage(p);
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl shadow-2xl p-6 md:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">My Uploaded Photos</h1>
              <a href="/dashboard/upload" className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white font-semibold shadow hover:shadow-md transition">Upload New</a>
            </div>

            {loading && <p className="text-gray-600">Loading...</p>}
            {error && <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl">{error}</div>}

            {list && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {list.data.map((p) => (
                    <div key={p.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all">
                      <div className="aspect-[4/3] overflow-hidden">
                        {/* Use plain img to avoid Next Image remote whitelist surprises for dev */}
                        <img src={p.url} alt={p.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 line-clamp-1">{p.title}</h3>
                          {!p.is_free ? (
                            <span className="text-sm font-semibold bg-[#FFD93D] text-gray-900 px-2 py-1 rounded-full">Paid</span>
                          ) : (
                            <span className="text-sm text-gray-600">Free</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{p.description || ""}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Downloads: {p.downloads}</span>
                          {p.is_free ? (
                            <a href={p.download_url} className="inline-flex items-center space-x-1 text-[#6C63FF] hover:text-[#FF6B6B] font-semibold">
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </a>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-gray-400">
                              <Lock className="w-4 h-4" />
                              <span>Locked</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center space-x-3 mt-8">
                  <button
                    onClick={() => pushPage(Math.max(1, (list.current_page || 1) - 1))}
                    disabled={list.current_page <= 1}
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-gray-700 text-sm">Page {list.current_page} of {list.last_page}</span>
                  <button
                    onClick={() => pushPage(Math.min(list.last_page, (list.current_page || 1) + 1))}
                    disabled={list.current_page >= list.last_page}
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
