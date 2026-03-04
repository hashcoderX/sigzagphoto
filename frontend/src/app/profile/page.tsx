"use client";

import { useEffect, useState, useRef } from "react";
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

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
    // Reset file input
    if (logoInputRef.current) logoInputRef.current.value = "";
  };
  const onSetCover = (file: File | null) => {
    setCoverFile(file);
    setCoverPreview(prev => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : (user?.cover_url || null);
    });
    // Reset file input
    if (coverInputRef.current) coverInputRef.current.value = "";
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
      fd.append("phone", form.phone || "");
      fd.append("whatsapp", form.whatsapp || "");
      fd.append("website", form.website || "");
      fd.append("country", form.country);
      fd.append("address", form.address || "");
      fd.append("currency", form.currency);
      if (logoFile) fd.append("logo", logoFile);
      if (coverFile) fd.append("cover", coverFile);

      // Send PATCH request to update user
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

      // Use the response data directly instead of fetching again
      setUser(data as ApiUser);

      // Update previews and form fields from backend response
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
      setLogoPreview(data.logo_url || null);
      setCoverPreview(data.cover_url || null);
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        whatsapp: data.whatsapp || "",
        website: data.website || "",
        country: data.country || "US",
        address: data.address || "",
        currency: data.currency || "USD",
      });

      // Reset file inputs and state
      setLogoFile(null);
      setCoverFile(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      if (coverInputRef.current) coverInputRef.current.value = "";

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
                <div className="flex justify-end items-center">
                  <div className="flex items-center space-x-4">
                    {(logoPreview || user.logo_url) && (
                      <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoPreview ? logoPreview : user.logo_url!} alt="Logo" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-xl font-semibold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                    </div>
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
                
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
