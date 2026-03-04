"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Upload, Image as ImageIcon, CheckCircle2, XCircle } from "lucide-react";
import { useRef } from "react";

export default function UploadPhotoPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState<number | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [myPhotos, setMyPhotos] = useState<Array<{ id:number; url:string; title:string; category?:string; is_free:boolean; price?:number; created_at:string; }>>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) router.replace("/login");
    else fetchMyPhotos(token);
  }, [router]);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  const fetchMyPhotos = async (token: string) => {
    try {
      setPhotosLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/my/photos`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({} as any));
      const items = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : Array.isArray(data?.data?.data) ? data.data.data : []);
      setMyPhotos(items);
    } catch {
      setMyPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!file) {
      setError("Please choose an image to upload");
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("title", title);
      if (description) fd.append("description", description);
      const chosenCategory = category === "Other" ? customCategory.trim() : category;
      if (!chosenCategory) {
        setLoading(false);
        setError("Please select a category for this listing");
        return;
      }
      fd.append("category", chosenCategory);
      fd.append("is_free", String(isFree ? 1 : 0));
      if (!isFree && price !== "") fd.append("price", String(price));
      fd.append("image", file);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/photos`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const msg = data?.errors ? (Object.values(data.errors) as any).flat().join(" ") : (data?.message || "Upload failed");
        throw new Error(msg);
      }
      setSuccess("Photo uploaded successfully!");
      // Reset minimal fields and refresh sidebar
      setFile(null);
      setPreviewUrl(null);
      const token2 = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      if (token2) fetchMyPhotos(token2);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-10"
          >
            <div className="relative mb-8">
              <div className="group rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-[2px] shadow-xl">
                <div className="rounded-3xl bg-white/10 backdrop-blur-xl px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white"><Upload className="w-5 h-5" /></div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-pink-100">Upload Photo</h1>
                      <p className="text-xs text-indigo-100 mt-1">Add a title, set pricing, and upload your image</p>
                    </div>
                  </div>
                  {success && (
                    <span className="inline-flex items-center gap-1 text-emerald-100 text-xs font-semibold"><CheckCircle2 className="w-4 h-4" /> Success</span>
                  )}
                </div>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-xl mb-6 flex items-center gap-2"><XCircle className="w-4 h-4" /> {error}</div>
            )}
            {success && (
              <div className="bg-green-50 border-2 border-green-200 text-green-800 px-6 py-4 rounded-xl mb-6 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {success}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none shadow-sm" placeholder="E.g. Golden hour at the beach" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none shadow-sm" placeholder="Describe the scene, style, and any notable details..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Listing Category</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none shadow-sm bg-white"
                    required
                  >
                    <option value="" disabled>Select a category</option>
                    <option>Nature</option>
                    <option>Landscape</option>
                    <option>Portrait</option>
                    <option>Architecture</option>
                    <option>Street</option>
                    <option>Travel</option>
                    <option>Wildlife</option>
                    <option>Food</option>
                    <option>Fashion</option>
                    <option>Sports</option>
                    <option>Abstract</option>
                    <option>Aerial</option>
                    <option>Night</option>
                    <option>Macro</option>
                    <option>Minimal</option>
                    <option value="Other">Other</option>
                  </select>
                  {category === "Other" && (
                    <input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter custom category"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none shadow-sm"
                    />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Choose how this image will be listed for buyers.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Access</label>
                  <div className="inline-flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                    <button type="button" onClick={() => setIsFree(true)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${isFree ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-white'}`}>Free</button>
                    <button type="button" onClick={() => setIsFree(false)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${!isFree ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 hover:bg-white'}`}>Paid</button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Paid images will be listed for sale with your set price.</p>
                </div>
                {!isFree && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-3 rounded-xl bg-gray-100 border-2 border-gray-200 text-gray-600 text-sm">$</span>
                      <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} required className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#6C63FF] focus:outline-none shadow-sm" placeholder="19.99" />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) setFile(f); }}
                  className={`relative rounded-2xl border-2 ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-dashed border-gray-300 bg-gray-50'} p-5 flex flex-col md:flex-row gap-4 items-center justify-between`}
                  role="region" aria-label="Image dropzone"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-700"><ImageIcon className="w-6 h-6" /></div>
                    <div className="text-sm text-gray-700">
                      <div className="font-semibold">Drag & drop your image here</div>
                      <div className="text-gray-500">or</div>
                      <button type="button" onClick={() => inputRef.current?.click()} className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow hover:shadow-md">
                        <Upload className="w-3.5 h-3.5" /> Choose file
                      </button>
                      <input ref={inputRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required className="sr-only" />
                    </div>
                  </div>
                  <div className="w-full md:w-40 h-28 md:h-28 bg-white border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">No image selected</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Supported formats: JPG, PNG, WebP. Max size depends on server limits.</p>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                {loading ? "Uploading..." : "Upload Photo"}
              </motion.button>
            </form>
          </motion.div>
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white/70 backdrop-blur rounded-3xl shadow-xl p-6 md:p-7 border border-gray-100 md:sticky md:top-24"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">My Uploads</h2>
              <Link href="/dashboard/photos" className="text-indigo-600 text-sm font-medium hover:underline">View all</Link>
            </div>
            {photosLoading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : myPhotos.length === 0 ? (
              <div className="text-sm text-gray-500">No uploads yet. Your images will appear here.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {myPhotos.slice(0, 8).map((p) => (
                  <div key={p.id} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.title} className="w-full h-28 object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                    <div className="absolute top-2 left-2">
                      {p.category && <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/90 text-gray-700 border border-gray-200">{p.category}</span>}
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-600 text-white">
                        {p.is_free ? 'Free' : (p.price ? `$${Number(p.price).toFixed(2)}` : 'Paid')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.aside>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
