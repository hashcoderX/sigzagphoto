"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const photoId = params.get("photo");
  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 min-h-[60vh] bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl p-8 shadow">
            <h1 className="text-2xl font-bold text-emerald-700">Payment Successful</h1>
            <p className="mt-2 text-gray-700">Thank you for your purchase.</p>
            <div className="mt-6 flex gap-3">
              {photoId ? (
                <Link href={`/photo/${photoId}`} className="px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold">View Photo</Link>
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
