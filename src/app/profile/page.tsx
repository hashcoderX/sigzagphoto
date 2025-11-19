"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { User as UserIcon, Mail, BadgeCheck, LogOut, UploadCloud } from "lucide-react";
import { COUNTRIES, CURRENCIES } from "@/constants/geo";

type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  country?: string | null;
  address?: string | null;
  currency?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    website: "",
    country: "US",
    address: "",
    currency: "USD",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    const fetchMe = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        const data = (await res.json()) as ApiUser;
        setUser(data);
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          whatsapp: data.whatsapp || "",
          website: data.website || "",
          country: data.country || "US",
          address: data.address || "",
          currency: data.currency || "USD",
        });
        setLogoPreview(data.logo_url || null);
        setCoverPreview(data.cover_url || null);
      } catch (e: any) {
        setError(e?.message || "Failed to load profile");
        // token invalid; redirect to login after a beat
        setTimeout(() => router.replace("/login"), 900);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [router]);

  const handleLogout = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    try {
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/logout`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
    router.replace("/login");
  };

  const onSetLogo = (file: File | null) => {
    setLogoFile(file);
    setLogoPreview(prev => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : (user?.logo_url || null);
    });
  };
  const onSetCover = (file: File | null) => {
    setCoverFile(file);
    setCoverPreview(prev => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : (user?.cover_url || null);
    });
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      if (!token) {
        router.replace("/login");
        return;
      }
      const fd = new FormData();
      fd.append("name", form.name);
      if (form.phone) fd.append("phone", form.phone);
      if (form.whatsapp) fd.append("whatsapp", form.whatsapp);
      if (form.website) fd.append("website", form.website);
      if (form.country) fd.append("country", form.country);
      if (form.address) fd.append("address", form.address);
      if (form.currency) fd.append("currency", form.currency);
      if (logoFile) fd.append("logo", logoFile);
      if (coverFile) fd.append("cover", coverFile);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
        method: "PATCH",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data && (data.message || data.error)) || "Update failed";
        throw new Error(msg);
      }
      setUser(data as ApiUser);
      setSuccess("Profile updated successfully");
    } catch (e: any) {
      setError(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main>
      <Navbar />

      <section className="pt-28 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[50vh]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-10"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Your Profile</h1>

            {loading && (
              <p className="text-gray-600">Loading...</p>
            )}

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl">
                {error}
              </div>
            )}

            {user && (
              <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] flex items-center justify-center">
                    <UserIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                  </div>
                </div>

                {/* Basic info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl border-2 border-gray-100">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-[#6C63FF]" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl border-2 border-gray-100">
                    <div className="flex items-center space-x-3">
                      <BadgeCheck className="w-5 h-5 text-[#6C63FF]" />
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <p className="font-medium text-gray-900">Active</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Update form */}
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Update Profile</h2>

                  {/* Branding */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) onSetLogo(f); }}
                        className="relative rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#6C63FF] transition-colors p-4 flex items-center gap-4 cursor-pointer bg-white"
                      >
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => onSetLogo(e.target.files?.[0] || null)} />
                        <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center overflow-hidden">
                          {logoPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoPreview} alt="Logo" className="w-16 h-16 object-cover rounded-xl" />
                          ) : (
                            <UploadCloud className="w-7 h-7 text-[#6C63FF]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Click to upload</p>
                          <p className="text-xs text-gray-500">PNG/JPG up to 2MB</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo</label>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) onSetCover(f); }}
                        className="relative rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#6C63FF] transition-colors p-4 cursor-pointer bg-white"
                      >
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => onSetCover(e.target.files?.[0] || null)} />
                        <div className="w-full">
                          <div className="w-full aspect-[16/9] rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center overflow-hidden">
                            {coverPreview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center text-center">
                                <UploadCloud className="w-7 h-7 text-[#6C63FF] mb-1" />
                                <p className="text-sm font-semibold text-gray-900">Click to upload</p>
                                <p className="text-xs text-gray-500">PNG/JPG up to 4MB</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Text fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                      <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                      <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors">
                        {COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                      <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors">
                        {CURRENCIES.map(cur => (
                          <option key={cur.code} value={cur.code}>{cur.code} — {cur.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none transition-colors" rows={3} />
                  </div>

                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl">{error}</div>
                  )}
                  {success && (
                    <div className="bg-green-50 border-2 border-green-200 text-green-800 px-6 py-4 rounded-xl">{success}</div>
                  )}

                  <div className="flex items-center gap-3">
                    <button onClick={handleSave} disabled={saving} className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white font-semibold shadow hover:shadow-md transition disabled:opacity-70">
                      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                    <button onClick={handleLogout} className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-gray-300 transition">
                      <LogOut className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
