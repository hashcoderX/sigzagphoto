'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Camera, Briefcase, ShoppingBag, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { COUNTRIES, CURRENCIES } from '@/constants/geo';

type UserType = 'photographer' | 'business' | 'buyer';

export default function RegisterPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>('photographer');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agree: false,
  country: 'US',
    address: '',
    currency: 'USD',
    phone: '',
    whatsapp: '',
    website: '',
    logoFile: null as File | null,
    coverFile: null as File | null,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const setLogoFile = (file: File | null) => {
    setFormData(prev => ({ ...prev, logoFile: file }));
    setLogoPreview(prevUrl => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return file ? URL.createObjectURL(file) : null;
    });
  };
  const setCoverFile = (file: File | null) => {
    setFormData(prev => ({ ...prev, coverFile: file }));
    setCoverPreview(prevUrl => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return file ? URL.createObjectURL(file) : null;
    });
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('email', formData.email);
      fd.append('password', formData.password);
      fd.append('password_confirmation', formData.confirmPassword);
      fd.append('role', userType);
      if (formData.phone) fd.append('phone', formData.phone);
      if (formData.whatsapp) fd.append('whatsapp', formData.whatsapp);
      if (formData.website) fd.append('website', formData.website);
      if (formData.country) fd.append('country', formData.country);
      if (formData.address) fd.append('address', formData.address);
      if (formData.currency) fd.append('currency', formData.currency);
      // No membership/subscription fields
      if (formData.logoFile) fd.append('logo', formData.logoFile);
      if (formData.coverFile) fd.append('cover', formData.coverFile);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: fd,
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const message = data?.errors ? (Object.values(data.errors) as any).flat().join(' ') : (data?.message || 'Registration failed');
        throw new Error(message);
      }

      if (data?.token) {
        // Store token for authenticated requests
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.token);
        }
      }

      setSuccess('Account created successfully! Redirecting...');
  setFormData({ name: '', email: '', password: '', confirmPassword: '', agree: false, country: 'US', address: '', currency: 'USD', phone: '', whatsapp: '', website: '', logoFile: null, coverFile: null });
      setTimeout(() => {
        router.push('/dashboard');
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const userTypes = [
    {
      type: 'photographer' as UserType,
      icon: Camera,
      title: 'Photographer',
      description: 'Upload and sell your photos',
    },
    {
      type: 'business' as UserType,
      icon: Briefcase,
      title: 'Business/Studio',
      description: 'Register your photography business',
    },
    {
      type: 'buyer' as UserType,
      icon: ShoppingBag,
      title: 'Buyer',
      description: 'Purchase high-quality photos',
    },
  ];

  return (
    <main>
      <Navbar />
      
      <section className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Join sigzagphoto
            </h1>
            <p className="text-xl text-gray-600">
              Create your account and start your photography journey
            </p>
          </motion.div>

          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl">
            {/* User Type Selection */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                I want to register as a
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {userTypes.map((type) => (
                  <motion.button
                    key={type.type}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setUserType(type.type)}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      userType === type.type
                        ? 'border-[#6C63FF] bg-gradient-to-br from-purple-50 to-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                      userType === type.type
                        ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B]'
                        : 'bg-gray-100'
                    }`}>
                      <type.icon className={`w-8 h-8 ${
                        userType === type.type ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${
                      userType === type.type ? 'text-[#6C63FF]' : 'text-gray-900'
                    }`}>
                      {type.title}
                    </h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Trial feature removed */}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo (PNG/JPG, max 2MB)</label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) setLogoFile(f); }}
                    className="relative rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#6C63FF] transition-colors p-4 flex items-center gap-4 cursor-pointer bg-white"
                  >
                    <input
                      id="logo-input"
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    />
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
                      {logoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoPreview} alt="Logo preview" className="w-16 h-16 object-cover rounded-xl" />
                      ) : (
                        <UploadCloud className="w-7 h-7 text-[#6C63FF]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Click to upload</p>
                      <p className="text-xs text-gray-500">or drag & drop a square image</p>
                      {formData.logoFile && <p className="text-xs text-gray-600 mt-1">{formData.logoFile.name}</p>}
                    </div>
                  </div>
                </div>
                {/* Cover Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo (PNG/JPG, max 4MB)</label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) setCoverFile(f); }}
                    className="relative rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#6C63FF] transition-colors p-4 cursor-pointer bg-white"
                  >
                    <input
                      id="cover-input"
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    />
                    <div className="w-full">
                      <div className="w-full aspect-[16/9] rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center overflow-hidden">
                        {coverPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-center">
                            <UploadCloud className="w-7 h-7 text-[#6C63FF] mb-1" />
                            <p className="text-sm font-semibold text-gray-900">Click to upload</p>
                            <p className="text-xs text-gray-500">or drag & drop a 16:9 image</p>
                          </div>
                        )}
                      </div>
                      {formData.coverFile && <p className="text-xs text-gray-600 mt-2">{formData.coverFile.name}</p>}
                    </div>
                  </div>
                </div>
              </div>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl"
                >
                  <p className="font-semibold">Registration failed</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

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

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contact details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors"
                    placeholder="+94 77 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors"
                    placeholder="+94 77 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* Address & Country */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors"
                  >
                    {CURRENCIES.map(cur => (
                      <option key={cur.code} value={cur.code}>{cur.code} — {cur.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors"
                  placeholder="Street, City, ZIP"
                  rows={3}
                />
              </div>

              {/* Subscription & Payment section removed as per request */}

              {/* Terms & Conditions */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="agree"
                  checked={formData.agree}
                  onChange={(e) => setFormData({ ...formData, agree: e.target.checked })}
                  className="w-4 h-4 mt-1 text-[#6C63FF] border-gray-300 rounded focus:ring-[#6C63FF]"
                  required
                />
                <label htmlFor="agree" className="ml-3 text-sm text-gray-700">
                  I agree to the{' '}
                  <Link href="#" className="text-[#6C63FF] hover:text-[#FF6B6B] font-semibold transition-colors">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="#" className="text-[#6C63FF] hover:text-[#FF6B6B] font-semibold transition-colors">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or register with</span>
              </div>
            </div>

            {/* Social Registration */}
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

            {/* Login Link */}
            <p className="text-center text-gray-600 mt-8">
              Already have an account?{' '}
              <Link href="/login" className="text-[#6C63FF] hover:text-[#FF6B6B] font-semibold transition-colors">
                Login
              </Link>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
