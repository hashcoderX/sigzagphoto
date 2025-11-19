'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getEffectivePlan } from '@/lib/access';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const message = data?.errors ? (Object.values(data.errors) as any).flat().join(' ') : (data?.message || 'Login failed');
        throw new Error(message);
      }

      if (data?.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_user', JSON.stringify(data.user || {}));
          // Persist trial info if present
          if (data.user && (data.user.trial_started_at || data.user.trial_ends_at)) {
            try {
              localStorage.setItem('trial_info', JSON.stringify({
                trial_started_at: data.user.trial_started_at,
                trial_ends_at: data.user.trial_ends_at,
                is_trial_active: data.user.is_trial_active,
                trial_days_remaining: data.user.trial_days_remaining,
              }));
            } catch {}
          }
        }
      }

      setSuccess('Logged in successfully! Redirecting...');
      setTimeout(() => {
        const role = (data?.user?.role || '').toString().toLowerCase();
        const premium = !!data?.user?.premium_package;
        const plan = getEffectivePlan();
        const endsAt = data?.user?.trial_ends_at ? new Date(data.user.trial_ends_at) : null;
        const freeExpired = (!premium && (plan === 'free') && endsAt && !isNaN(endsAt.getTime()) && Date.now() > endsAt.getTime());
        if (freeExpired) {
          try { localStorage.removeItem('auth_token'); } catch {}
          router.push('/pricing');
          return;
        }
        if (role === 'super') {
          router.push('/dashboard/admin/super');
        } else if (role === 'photographer' || role === 'business') {
          router.push('/dashboard');
        } else {
          router.push('/profile');
        }
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <Navbar />
      
      <section className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-purple-50 to-pink-50 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Info */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="hidden lg:block"
            >
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Welcome Back!
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Login to access your photography portfolio, manage your photos, and connect with the global photography community.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] p-2 rounded-full">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Access your portfolio</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] p-2 rounded-full">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Manage your photos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] p-2 rounded-full">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Track your earnings</span>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Login to Your Account
              </h2>
              <p className="text-gray-600 mb-8">
                Enter your credentials to continue
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl"
                  >
                    <p className="font-semibold">Login failed</p>
                    <p className="text-sm">{error}</p>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 border-2 border-green-200 text-green-800 px-6 py-4 rounded-xl"
                  >
                    <p className="font-semibold">{success}</p>
                  </motion.div>
                )}
                {success && typeof window !== 'undefined' && (() => {
                  const raw = localStorage.getItem('trial_info');
                  if (!raw) return null;
                  try {
                    const info = JSON.parse(raw);
                    if (!info) return null;
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-indigo-50 border-2 border-indigo-200 text-indigo-800 px-6 py-4 rounded-xl"
                      >
                        {info.is_trial_active
                          ? `Free trial active: ${info.trial_days_remaining} day${info.trial_days_remaining === 1 ? '' : 's'} remaining.`
                          : 'Free trial has ended.'}
                      </motion.div>
                    );
                  } catch { return null; }
                })()}
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.remember}
                      onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                      className="w-4 h-4 text-[#6C63FF] border-gray-300 rounded focus:ring-[#6C63FF]"
                    />
                    <span className="ml-2 text-sm text-gray-700">Remember me</span>
                  </label>
                  <Link href="#" className="text-sm text-[#6C63FF] hover:text-[#FF6B6B] transition-colors">
                    Forgot password?
                  </Link>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </motion.button>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Social Login */}
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center space-x-2 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="font-medium text-gray-700">Google</span>
                </button>
                <button className="flex items-center justify-center space-x-2 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="font-medium text-gray-700">Facebook</span>
                </button>
              </div>

              {/* Sign Up Link */}
              <p className="text-center text-gray-600 mt-8">
                Don't have an account?{' '}
                <Link href="/register" className="text-[#6C63FF] hover:text-[#FF6B6B] font-semibold transition-colors">
                  Sign Up
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
