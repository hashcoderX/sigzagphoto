"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function CheckoutCancelContent() {
  const params = useSearchParams();
  const router = useRouter();
  const photoId = params.get("photo");
  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 min-h-[60vh] bg-gradient-to-br from-rose-50 to-orange-50">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl p-8 shadow">
            <h1 className="text-2xl font-bold text-rose-700">Payment Canceled</h1>
            <p className="mt-2 text-gray-700">Your payment was canceled. You can try again any time.</p>
            <div className="mt-6 flex gap-3">
              {photoId ? (
                <Link href={`/checkout?photo=${photoId}`} className="px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold">Return to Checkout</Link>
              ) : null}
              <button onClick={() => router.push('/gallery')} className="px-4 py-2 rounded-lg bg-gray-100 border text-gray-800 font-semibold">Back to Gallery</button>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutCancelContent />
    </Suspense>
  );
}
