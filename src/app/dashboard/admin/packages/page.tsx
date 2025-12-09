"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Plus, Trash2, Save, X, ArrowLeft, Eye } from "lucide-react";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";

interface Item {
  id: number;
  code: string;
  name: string;
  description?: string;
  price?: number;
  notes?: string;
}

interface PackageItem {
  id: number;
  item_id: number;
  item: Item;
  quantity: number;
  unit_price?: number;
  subamount?: number;
}

interface Package {
  id: number;
  name: string;
  description?: string;
  notes?: string;
  items?: PackageItem[];
  total_price?: number;
}

interface Page<T> {
  data: T[];
  current_page: number;
  last_page: number;
}

export default function PackagesPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<Page<Package> | null>(null);
  const [perPage] = useState(10);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Partial<Package>>({ name: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [creatingSubmitting, setCreatingSubmitting] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Package>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<Package | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [packageToView, setPackageToView] = useState<Package | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [packageToEdit, setPackageToEdit] = useState<Package | null>(null);
  const [editPackageItems, setEditPackageItems] = useState<PackageItem[]>([]);
  const [editSelectedItemId, setEditSelectedItemId] = useState<number | null>(null);
  const [editSelectedItemQuantity, setEditSelectedItemQuantity] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedItemQuantity, setSelectedItemQuantity] = useState(1);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [userCurrency, setUserCurrency] = useState<string>('USD');

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!t) { router.replace("/login"); return; }
    // Enforce plan gating for business suite
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    setToken(t);
    fetchList(t, 1);
    fetchItems(t);
    // Fetch user currency
    fetchUserCurrency(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safely parse JSON; if invalid return raw text for diagnostics
  const parseJsonSafe = async (res: Response) => {
    const text = await res.text();
    try {
      return text.length ? JSON.parse(text) : null;
    } catch (e) {
      return { _raw: text };
    }
  };

  const fetchList = async (t: string, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ per_page: String(perPage), page: String(pageNum), ...(q ? { q } : {}) });
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/packages?${query.toString()}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${t}` },
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        const message = (data && typeof data === 'object' && 'message' in data) ? (data as any).message : 'Failed to load packages';
        throw new Error(message);
      }
      setPage(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/items?per_page=1000`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${t}` },
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        console.error('Failed to load items');
        return;
      }
      setItems(data.data || []);
    } catch (e: any) {
      console.error('Failed to load items:', e?.message);
    }
  };

  const fetchUserCurrency = async (t: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${t}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.currency) setUserCurrency(data.currency);
    } catch { }
  };

  const formatCurrency = (value: number): string => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: userCurrency }).format(value);
    } catch {
      return `${userCurrency} ${value.toFixed(2)}`;
    }
  };

  const createPackage = async () => {
    if (!token) return;
    setCreateSuccess(null);
    setError(null);
    setFormErrors({});
    if (!form.name || !form.name.trim()) {
      setFormErrors({ name: 'Name is required' });
      return;
    }
    if (packageItems.length === 0) {
      setFormErrors({ items: 'At least one item is required' });
      return;
    }
    if (creatingSubmitting) return;
    setCreatingSubmitting(true);
    try {
      const packageData = {
        ...form,
        items: packageItems.map(pi => ({ item_id: pi.item_id, quantity: pi.quantity }))
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/packages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(packageData),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        if (res.status === 422 && data && typeof data === 'object' && (data as any).errors) {
          const errs: Record<string, string> = {};
          Object.entries<any>((data as any).errors).forEach(([k, v]) => (errs[k] = Array.isArray(v) ? v.join(' ') : String(v)));
          setFormErrors(errs);
          throw new Error('Please fix the highlighted errors');
        }
        const msg = (data && typeof data === 'object' && 'message' in data) ? (data as any).message : 'Create failed';
        throw new Error(msg);
      }
      setForm({ name: "", description: "", notes: "" });
      setFormErrors({});
      setPackageItems([]);
      setSelectedItemId(null);
      setSelectedItemQuantity(1);
      setCreating(false);
      setCreateSuccess('Package saved successfully');
      fetchList(token, 1);
    } catch (e: any) {
      setError(e?.message || "Create failed");
    } finally {
      setCreatingSubmitting(false);
    }
  };

  const startEdit = (pkg: Package) => {
    setPackageToEdit(pkg);
    setEditForm({ name: pkg.name, description: pkg.description, notes: pkg.notes });
    // Ensure all items have proper unit_price and subamount values
    const processedItems = (pkg.items || []).map(item => {
      const unitPrice = Number(item.unit_price) || Number(item.item?.price) || 0;
      const quantity = Number(item.quantity) || 1;
      const subamount = Number(item.subamount) || (unitPrice * quantity);
      
      return {
        ...item,
        unit_price: unitPrice,
        quantity: quantity,
        subamount: isNaN(subamount) ? 0 : subamount
      };
    });
    setEditPackageItems(processedItems);
    setEditModalOpen(true);
  };


  const saveEdit = async () => {
    if (!token || !packageToEdit) return;
    try {
      const updateData = {
        ...editForm,
        items: editPackageItems.map(pi => ({ 
          item_id: pi.item_id, 
          quantity: pi.quantity,
          unit_price: pi.unit_price
        }))
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/packages/${packageToEdit.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        if (res.status === 422 && data && typeof data === 'object' && (data as any).errors) {
          const errs: Record<string, string> = {};
          Object.entries<any>((data as any).errors).forEach(([k, v]) => (errs[k] = Array.isArray(v) ? v.join(' ') : String(v)));
          setEditErrors(errs);
          throw new Error('Please fix the highlighted errors');
        }
        const msg = (data && typeof data === 'object' && 'message' in data) ? (data as any).message : 'Update failed';
        throw new Error(msg);
      }
      setEditErrors({});
      closeEditModal();
      fetchList(token, page?.current_page || 1);
    } catch (e: any) {
      setError(e?.message || "Update failed");
    }
  };

  const remove = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/packages/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteModalOpen(false);
      setPackageToDelete(null);
      fetchList(token, page?.current_page || 1);
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  const openDeleteModal = (pkg: Package) => {
    setPackageToDelete(pkg);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setPackageToDelete(null);
  };

  const viewPackage = (pkg: Package) => {
    setPackageToView(pkg);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setPackageToView(null);
  };

  const addItemToPackage = () => {
    if (!selectedItemId) return;
    const selectedItem = items.find(item => item.id === selectedItemId);
    if (!selectedItem) return;

    // Check if item already exists in package
    if (packageItems.some(pi => pi.item_id === selectedItemId)) {
      setFormErrors({ items: 'This item is already added to the package' });
      return;
    }

    const newPackageItem: PackageItem = {
      id: Date.now(), // Temporary ID for frontend
      item_id: selectedItemId,
      item: selectedItem,
      quantity: selectedItemQuantity,
      unit_price: selectedItem.price || 0,
      subamount: (selectedItem.price || 0) * selectedItemQuantity
    };

    setPackageItems([...packageItems, newPackageItem]);
    setSelectedItemId(null);
    setSelectedItemQuantity(1);
    setFormErrors({});
  };

  const removeItemFromPackage = (itemId: number) => {
    setPackageItems(packageItems.filter(pi => pi.item_id !== itemId));
  };

  const addItemToEditPackage = () => {
    if (!editSelectedItemId) return;
    const selectedItem = items.find(item => item.id === editSelectedItemId);
    if (!selectedItem) return;

    // Check if item already exists in edit package
    if (editPackageItems.some(pi => pi.item_id === editSelectedItemId)) {
      setEditErrors({ items: 'This item is already added to the package' });
      return;
    }

    const newPackageItem: PackageItem = {
      id: Date.now(), // Temporary ID for frontend
      item_id: editSelectedItemId,
      item: selectedItem,
      quantity: editSelectedItemQuantity,
      unit_price: Number(selectedItem.price) || 0,
      subamount: isNaN((Number(selectedItem.price) || 0) * editSelectedItemQuantity) ? 0 : ((Number(selectedItem.price) || 0) * editSelectedItemQuantity)
    };

    setEditPackageItems([...editPackageItems, newPackageItem]);
    setEditSelectedItemId(null);
    setEditSelectedItemQuantity(1);
    setEditErrors({});
  };

  const removeItemFromEditPackage = (itemId: number) => {
    setEditPackageItems(editPackageItems.filter(pi => pi.item_id !== itemId));
  };

  const updateEditItemQuantity = (itemId: number, newQuantity: number) => {
    setEditPackageItems(editPackageItems.map(pi => {
      if (pi.item_id === itemId) {
        const unitPrice = Number(pi.unit_price) || 0;
        const quantity = Number(newQuantity) || 1;
        const subamount = unitPrice * quantity;
        
        const updatedItem = {
          ...pi,
          quantity: quantity,
          subamount: isNaN(subamount) ? 0 : subamount
        };
        return updatedItem;
      }
      return pi;
    }));
  };

  const updateEditItemUnitPrice = (itemId: number, newUnitPrice: number) => {
    setEditPackageItems(editPackageItems.map(pi => {
      if (pi.item_id === itemId) {
        const unitPrice = Number(newUnitPrice) || 0;
        const quantity = Number(pi.quantity) || 1;
        const subamount = unitPrice * quantity;
        
        const updatedItem = {
          ...pi,
          unit_price: unitPrice,
          subamount: isNaN(subamount) ? 0 : subamount
        };
        return updatedItem;
      }
      return pi;
    }));
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setPackageToEdit(null);
    setEditForm({});
    setEditPackageItems([]);
    setEditSelectedItemId(null);
    setEditSelectedItemQuantity(1);
    setEditErrors({});
  };

  const getSelectedItem = () => {
    return items.find(item => item.id === selectedItemId);
  };

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
            <div className="relative mb-8">
              <div className="group rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-[2px] shadow-xl">
                <div className="rounded-3xl bg-white/10 backdrop-blur-xl px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard/admin')} className="transition-all duration-200 bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-inner">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <div>
                      <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-pink-100">Photography Packages</h1>
                      <p className="text-xs text-indigo-100 mt-1">Create and manage photography packages</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-start">
                    <div className="flex items-center bg-white/10 border border-white/20 rounded-xl px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-white/40">
                      <input className="bg-transparent placeholder-indigo-200 text-indigo-50 text-sm focus:outline-none w-44" placeholder="Search packages..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && token) fetchList(token, 1); }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => token && fetchList(token, 1)} className="actionBtn">Search</button>
                      <button onClick={() => { setQ(''); token && fetchList(token,1); }} className="actionBtn">Reset</button>
                      <button onClick={() => setCreating(true)} className="newBtn flex items-center gap-2"><Plus className="w-4 h-4" /> New Package</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && <div className="mb-4 bg-red-50 border-2 border-red-200 text-red-800 px-6 py-3 rounded-xl">{error}</div>}

            {creating && (
              <div className="mb-6 p-4 border-2 border-gray-100 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input className="input" placeholder="Package Name *" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <textarea className="input" placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    {formErrors.description && <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <textarea className="input" placeholder="Notes / Additional Info" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    {formErrors.notes && <p className="mt-1 text-sm text-red-600">{formErrors.notes}</p>}
                  </div>
                </div>

                {/* Item Selection */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h3 className="text-lg font-semibold mb-4">Add Items to Package</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Item</label>
                      <select
                        className="input"
                        value={selectedItemId || ""}
                        onChange={(e) => setSelectedItemId(e.target.value ? parseInt(e.target.value) : null)}
                      >
                        <option value="">Choose an item...</option>
                        {items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.code} - {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        className="input"
                        value={selectedItemQuantity}
                        onChange={(e) => setSelectedItemQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addItemToPackage}
                        disabled={!selectedItemId}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" /> Add Item
                      </button>
                    </div>
                  </div>
                  {selectedItemId && getSelectedItem() && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>{getSelectedItem()?.name}</strong> - 
                        Price: {formatCurrency(getSelectedItem()?.price || 0)}
                      </p>
                    </div>
                  )}
                  {formErrors.items && <p className="mt-2 text-sm text-red-600">{formErrors.items}</p>}
                </div>

                {/* Package Items Table */}
                {packageItems.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold mb-3">Package Items</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {packageItems.map((packageItem) => (
                            <tr key={packageItem.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">{packageItem.item.code}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{packageItem.item.name}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {formatCurrency(packageItem.unit_price || 0)}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">{packageItem.quantity}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {formatCurrency(packageItem.subamount || 0)}
                              </td>
                              <td className="px-4 py-2 text-sm">
                                <button
                                  onClick={() => removeItemFromPackage(packageItem.item_id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Package Total */}
                    <div className="mt-4 flex justify-end">
                      <div className="bg-gray-50 px-6 py-3 rounded-lg border">
                        <div className="text-lg font-semibold text-gray-900">
                          Package Total: {formatCurrency(packageItems.reduce((total, packageItem) => {
                            const subamount = Number(packageItem.subamount) || 0;
                            return total + (isNaN(subamount) ? 0 : subamount);
                          }, 0) || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-3 items-center">
                  <button disabled={creatingSubmitting} onClick={createPackage} className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Save className="w-4 h-4" /> {creatingSubmitting ? 'Saving...' : 'Save Package'}
                  </button>
                  <button disabled={creatingSubmitting} onClick={() => { 
                    setCreating(false); 
                    setFormErrors({}); 
                    setPackageItems([]);
                    setSelectedItemId(null);
                    setSelectedItemQuantity(1);
                  }} className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  {createSuccess && <span className="text-sm text-green-600">{createSuccess}</span>}
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-gray-600">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="adminTable" role="table" aria-label="Packages table">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Items</th>
                      <th className="py-2 pr-4">Total Price</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page?.data?.map((pkg) => (
                      <tr key={pkg.id}>
                        <td className="py-2 pr-4">
                          <div>
                            <span className="font-medium">{pkg.name}</span>
                            {pkg.description && <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>}
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          {pkg.items && pkg.items.length > 0 ? (
                            <div className="text-sm">
                              {pkg.items.map((item, index) => (
                                <div key={index} className="mb-1">
                                  {item.item.name} (x{item.quantity})
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No items</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {pkg.items && pkg.items.length > 0 ? (
                            <span className="font-medium">
                              {formatCurrency(pkg.total_price || 0)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex gap-2">
                            <button onClick={() => viewPackage(pkg)} className="btn-secondary flex items-center gap-1"><Eye className="w-4 h-4" /> View</button>
                            <button onClick={() => startEdit(pkg)} className="btn-secondary">Edit</button>
                            <button onClick={() => openDeleteModal(pkg)} className="btn-danger flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex items-center gap-3">
                  <button disabled={(page?.current_page || 1) <= 1} onClick={() => token && fetchList(token, (page!.current_page - 1))} className="btn-secondary">Prev</button>
                  <span className="text-sm text-gray-600">Page {page?.current_page} of {page?.last_page}</span>
                  <button disabled={(page?.current_page || 1) >= (page?.last_page || 1)} onClick={() => token && fetchList(token, (page!.current_page + 1))} className="btn-secondary">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* View Package Modal */}
      {viewModalOpen && packageToView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Package Details</h3>
              <button
                onClick={closeViewModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">{packageToView.name}</h4>
                {packageToView.description && (
                  <p className="text-gray-600">{packageToView.description}</p>
                )}
              </div>

              <div>
                <h5 className="text-md font-medium text-gray-900 mb-3">Package Items</h5>
                {packageToView.items && packageToView.items.length > 0 ? (
                  <div className="space-y-2">
                    {packageToView.items.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="font-medium text-gray-900">{item.item.name}</span>
                            <span className="text-gray-500 ml-2">(x{item.quantity})</span>
                          </div>
                          <span className="text-gray-700 font-medium">
                            {formatCurrency(item.subamount || 0)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Unit Price: {formatCurrency(item.unit_price || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No items in this package</p>
                )}
              </div>

              {packageToView.items && packageToView.items.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total Price:</span>
                    <span>{formatCurrency(packageToView.total_price || 0)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={closeViewModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {editModalOpen && packageToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Edit Package</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Package Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  {editErrors.name && <p className="mt-1 text-sm text-red-600">{editErrors.name}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="input"
                    placeholder="Package description"
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                  {editErrors.description && <p className="mt-1 text-sm text-red-600">{editErrors.description}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    className="input"
                    placeholder="Additional notes"
                    value={editForm.notes || ""}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                  {editErrors.notes && <p className="mt-1 text-sm text-red-600">{editErrors.notes}</p>}
                </div>
              </div>

              {/* Item Management */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="text-lg font-semibold mb-4">Manage Package Items</h4>

                {/* Add Item Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Item</label>
                    <select
                      className="input"
                      value={editSelectedItemId || ""}
                      onChange={(e) => setEditSelectedItemId(e.target.value ? parseInt(e.target.value) : null)}
                    >
                      <option value="">Choose an item...</option>
                      {items.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.code} - {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={editSelectedItemQuantity}
                      onChange={(e) => setEditSelectedItemQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addItemToEditPackage}
                      disabled={!editSelectedItemId}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" /> Add Item
                    </button>
                  </div>
                </div>

                {editErrors.items && <p className="mb-4 text-sm text-red-600">{editErrors.items}</p>}

                {/* Current Items Table */}
                {editPackageItems.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {editPackageItems.map((packageItem) => (
                          <tr key={packageItem.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{packageItem.item.code} - {packageItem.item.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-24 input"
                                value={packageItem.unit_price || 0}
                                onChange={(e) => updateEditItemUnitPrice(packageItem.item_id, parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              <input
                                type="number"
                                min="1"
                                className="w-20 input"
                                value={packageItem.quantity}
                                onChange={(e) => updateEditItemQuantity(packageItem.item_id, parseInt(e.target.value) || 1)}
                              />
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatCurrency(packageItem.subamount || 0)}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <button
                                onClick={() => removeItemFromEditPackage(packageItem.item_id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Package Total */}
                    <div className="mt-4 flex justify-end">
                      <div className="bg-gray-100 px-6 py-3 rounded-lg border">
                        <div className="text-lg font-semibold text-gray-900">
                          Package Total: {formatCurrency(editPackageItems.reduce((total, packageItem) => {
                            const subamount = Number(packageItem.subamount) || 0;
                            return total + (isNaN(subamount) ? 0 : subamount);
                          }, 0) || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && packageToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Package</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete <span className="font-medium text-gray-900">"{packageToDelete.name}"</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => remove(packageToDelete.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />

      <style jsx global>{`
        .input { width: 100%; padding: 0.5rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.75rem; }
        .input:focus { outline: none; border-color: #6C63FF; }
        .btn-primary { background: #111827; color: white; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .btn-secondary { background: #f3f4f6; color: #111827; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .btn-danger { background: #fee2e2; color: #991b1b; padding: 0.5rem 0.75rem; border-radius: 0.75rem; }
        .actionBtn { background: rgba(255,255,255,0.15); color: #F0F5FF; padding: 0.55rem 0.85rem; border-radius: 0.75rem; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.35); transition: background .2s, transform .2s; }
        .actionBtn:hover { background: rgba(255,255,255,0.25); transform: translateY(-2px); }
        .newBtn { background: linear-gradient(90deg,#0f172a,#1e3a8a); color: #ffffff; padding: 0.55rem 1rem; border-radius: 0.85rem; font-size: 0.75rem; font-weight: 600; box-shadow: 0 4px 12px -2px rgba(30,58,138,0.5); transition: box-shadow .25s, transform .25s; }
        .newBtn:hover { box-shadow: 0 6px 18px -2px rgba(30,58,138,0.6); transform: translateY(-2px); }
      `}</style>
    </main>
  );
}