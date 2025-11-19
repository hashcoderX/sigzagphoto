"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import Link from "next/link";

function CheckoutInner() {
  const params = useSearchParams();
  const router = useRouter();
  const photoId = params.get("photo");
  const [tokenChecked, setTokenChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<null | { id:number; title:string; description?:string|null; category?:string|null; price?:number|null; is_free?:boolean; photographer?:string|null; url:string }>(null);
  const currency = useMemo(() => process.env.NEXT_PUBLIC_CURRENCY || 'USD', []);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    // Validate presence of photo query
    if (!photoId) {
      setError('Missing photo to checkout.');
      setLoading(false);
      return;
    }
    // Auth gate: require login
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!t) {
      const next = `/login?next=${encodeURIComponent(`/checkout?photo=${photoId}`)}`;
      router.replace(next);
      return;
    }
    setAuthed(true);
    setTokenChecked(true);
    // Load photo details (public endpoint)
    (async () => {
      try {
        const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
        const res = await fetch(`${base}/api/photos/${photoId}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Failed to load photo');
        const data = await res.json();
        setPhoto(data);
      } catch (e:any) {
        setError(e?.message || 'Failed to load photo');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId]);

  return (
    <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-3xl shadow-2xl p-8 md:p-10"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Complete Your Purchase</h1>
          {!tokenChecked && (
            <p className="text-gray-600">Checking authentication…</p>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>
          )}
          {authed && !loading && photo && (
            <>
              <div className="rounded-xl border-2 border-gray-200 p-4 mb-6">
                <div className="text-sm text-gray-700">
                  <div className="font-semibold text-gray-900">{photo.title}</div>
                  <div className="text-xs text-gray-500 mt-1">Photo ID: {photo.id}</div>
                  {photo.category && (
                    <div className="text-xs text-gray-600 mt-1">Category: {photo.category}</div>
                  )}
                  <div className="mt-2 inline-flex items-center gap-2">
                    {photo.is_free ? (
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-blue-700 text-xs">Free</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 text-sm font-semibold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(photo.price || 0))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!photo.is_free ? (
                  <button
                    className="px-5 py-3 rounded-lg bg-gray-900 text-white font-semibold shadow hover:bg-gray-800"
                    disabled={paying}
                    onClick={async () => {
                      if (!photoId) return;
                      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
                      if (!token) {
                        router.replace(`/login?next=${encodeURIComponent(`/checkout?photo=${photoId}`)}`);
                        return;
                      }
                      try {
                        setPaying(true);
                        setError(null);
                        const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
                        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
                        const endpoint = (process.env.NEXT_PUBLIC_CHECKOUT_ENDPOINT || '/api/checkout').replace(/^\//, '');
                        const res = await fetch(`${apiBase}/${endpoint}`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            photo_id: Number(photoId),
                            return_url: `${siteUrl}/checkout/success?photo=${encodeURIComponent(String(photoId))}`,
                            cancel_url: `${siteUrl}/checkout/cancel?photo=${encodeURIComponent(String(photoId))}`,
                          }),
                        });
                        const data = await res.json().catch(() => ({} as any));
                        if (!res.ok) throw new Error(data?.message || 'Failed to initiate payment');
                        if (data?.payment_url) {
                          window.location.href = data.payment_url as string;
                          return;
                        }
                        if (data?.status === 'paid' && data?.download_url) {
                          window.location.href = data.download_url as string;
                          return;
                        }
                        if (data?.client_secret) {
                          router.push(`/checkout/pay?secret=${encodeURIComponent(String(data.client_secret))}&photo=${encodeURIComponent(String(photoId))}`);
                          return;
                        }
                        // Fallback to success page if backend returns minimal OK
                        router.push(`/checkout/success?photo=${encodeURIComponent(String(photoId))}`);
                      } catch (e:any) {
                        setError(e?.message || 'Payment initiation failed');
                      } finally {
                        setPaying(false);
                      }
                    }}
                  >
                    {paying ? 'Redirecting…' : 'Proceed to Pay'}
                  </button>
                ) : (
                  <Link href={`/gallery`} className="px-5 py-3 rounded-lg bg-indigo-600 text-white font-semibold shadow">Browse More</Link>
                )}
                <button
                  className="px-5 py-3 rounded-lg bg-gray-100 text-gray-800 font-semibold border-2 border-gray-200"
                  onClick={() => router.back()}
                >
                  Go Back
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <main>
      <Navbar />
      <Suspense fallback={<section className="pt-24 pb-16 min-h-[60vh]"><div className="max-w-3xl mx-auto px-4 text-gray-600">Loading checkout…</div></section>}>
        <CheckoutInner />
      </Suspense>
      <Footer />
    </main>
  );
}
