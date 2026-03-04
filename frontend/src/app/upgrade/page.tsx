"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Crown, Rocket, Info } from "lucide-react";

export default function UpgradePage() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  const choosePlan = (plan: 'free' | 'monthly' | 'yearly') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('membership_plan', plan);
    }
    if (plan === 'free') {
      router.push('/dashboard');
      return;
    }
    // For now, paid plans are not fully integrated
    setNotice('Paid plans coming soon! Saved your preference. You can access the Business Suite.');
    setTimeout(() => router.push('/dashboard'), 1500);
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      highlight: false,
      icon: Info,
      features: [
        'Browse and download free photos',
        'Basic profile',
        'Email support',
      ],
      cta: 'Continue Free',
    },
    {
      id: 'monthly',
      name: 'Monthly',
      price: '$19',
      period: 'per month',
      highlight: true,
      icon: Rocket,
      features: [
        'Manage my business tools',
        'Priority support',
        'Advanced analytics',
      ],
      cta: 'Choose Monthly',
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: '$190',
      period: 'per year',
      highlight: false,
      icon: Crown,
      features: [
        'All Monthly features',
        '2 months free (best value)',
        'VIP support',
      ],
      cta: 'Choose Yearly',
    },
  ] as const;

  return (
    <main>
      <Navbar />
      <section className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <h1 className="text-5xl font-bold text-gray-900 mb-3">Upgrade Plan</h1>
            <p className="text-lg text-gray-600">Pick a plan that suits your workflow</p>
          </motion.div>

          {notice && (
            <div className="max-w-3xl mx-auto mb-6">
              <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 text-yellow-900 p-4 text-sm">
                {notice}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 * idx }}
                className={`relative rounded-3xl p-6 shadow-xl bg-white border-2 ${
                  plan.highlight ? 'border-[#6C63FF]' : 'border-gray-100'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
                  plan.highlight ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B]' : 'bg-gradient-to-br from-purple-50 to-pink-50'
                }`}>
                  <plan.icon className={`w-8 h-8 ${plan.highlight ? 'text-white' : 'text-[#6C63FF]'}`} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-3xl font-extrabold text-gray-900">{plan.price}
                  <span className="ml-1 align-middle text-sm font-semibold text-gray-500">{plan.period}</span>
                </p>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => choosePlan(plan.id)}
                  className={`mt-6 w-full py-3 rounded-xl font-semibold transition-all shadow ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white hover:shadow-lg'
                      : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
