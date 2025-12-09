"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Briefcase, Settings, Store, ShieldCheck, Trash2 } from "lucide-react";

type ApiUser = { id: number; name: string; email: string; role: string };

type BusinessRule = {
  id?: number;
  title: string;
  content: string;
  order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function BusinessDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Business Rules State
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
  const [businessRulesLoading, setBusinessRulesLoading] = useState(false);
  const [showBusinessRulesManager, setShowBusinessRulesManager] = useState(false);
  const [editingBusinessRule, setEditingBusinessRule] = useState<BusinessRule | null>(null);
  const [newBusinessRule, setNewBusinessRule] = useState<{ title: string; content: string; order: number; is_active: boolean }>({
    title: '',
    content: '',
    order: 1,
    is_active: true
  });

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) throw new Error("Unauthorized");
        const me = (await meRes.json()) as ApiUser;
        setUser(me);
        // Optional: If user isn't business, keep them but show a notice
      } catch (e) {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Business Rules Functions
  const loadBusinessRules = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;
    setBusinessRulesLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/business-rules`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBusinessRules(data?.data || data || []);
      }
    } catch (error) {
      console.error('Failed to load business rules:', error);
    } finally {
      setBusinessRulesLoading(false);
    }
  };

  const saveBusinessRule = async (rule: BusinessRule) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;

    try {
      const method = rule.id ? 'PATCH' : 'POST';
      const url = rule.id
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/admin/business-rules/${rule.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/admin/business-rules`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(rule)
      });

      if (res.ok) {
        const savedRule = await res.json();
        setBusinessRules(prev => {
          if (rule.id) {
            return prev.map(r => r.id === rule.id ? savedRule : r);
          } else {
            return [...prev, savedRule];
          }
        });
        alert('Business rule saved successfully!');
        return true;
      } else {
        throw new Error('Failed to save business rule');
      }
    } catch (error) {
      console.error('Failed to save business rule:', error);
      alert('Failed to save business rule');
      return false;
    }
  };

  const deleteBusinessRule = async (rule: BusinessRule) => {
    if (!confirm(`Are you sure you want to delete the business rule "${rule.title}"? This action cannot be undone.`)) {
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/business-rules/${rule.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        setBusinessRules(prev => prev.filter(r => r.id !== rule.id));
        alert('Business rule deleted successfully!');
      } else {
        throw new Error('Failed to delete business rule');
      }
    } catch (error) {
      console.error('Failed to delete business rule:', error);
      alert('Failed to delete business rule');
    }
  };

  const createBusinessRule = async () => {
    if (!newBusinessRule.title.trim() || !newBusinessRule.content.trim()) {
      alert('Title and content are required');
      return;
    }

    const rule: BusinessRule = {
      title: newBusinessRule.title,
      content: newBusinessRule.content,
      order: newBusinessRule.order,
      is_active: newBusinessRule.is_active
    };

    const success = await saveBusinessRule(rule);
    if (success) {
      setNewBusinessRule({ title: '', content: '', order: businessRules.length + 1, is_active: true });
    }
  };

  const updateBusinessRule = async () => {
    if (!editingBusinessRule) return;
    if (!editingBusinessRule.title.trim() || !editingBusinessRule.content.trim()) {
      alert('Title and content are required');
      return;
    }

    const success = await saveBusinessRule(editingBusinessRule);
    if (success) {
      setEditingBusinessRule(null);
    }
  };

  // Load business rules when manager is opened
  useEffect(() => {
    if (showBusinessRulesManager) {
      loadBusinessRules();
    }
  }, [showBusinessRulesManager]);

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gradient-to-br from-purple-50 to-pink-50 min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl shadow-2xl p-8 md:p-10"
          >
            <div className="flex items-center gap-3 mb-6">
              <Briefcase className="w-6 h-6 text-[#6C63FF]" />
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Manage My Business</h1>
            </div>

            {loading && <p className="text-gray-600">Loading...</p>}

            {!loading && user && user.role !== "business" && (
              <div className="mb-8 bg-yellow-50 border-2 border-yellow-200 text-yellow-900 px-6 py-4 rounded-xl">
                <p className="font-semibold">Heads up</p>
                <p className="text-sm">Your account role is "{user.role}". Business tools are optimized for Business accounts.</p>
              </div>
            )}

            {/* Placeholder sections for future features */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl border-2 border-gray-100">
                <div className="flex items-center space-x-3 mb-2">
                  <Store className="w-5 h-5 text-[#6C63FF]" />
                  <p className="text-sm text-gray-500">Business Profile</p>
                </div>
                <p className="text-gray-700">Set your brand info, logo, and contact details.</p>
              </div>

              <div className="p-6 rounded-2xl border-2 border-gray-100">
                <div className="flex items-center space-x-3 mb-2">
                  <Settings className="w-5 h-5 text-[#6C63FF]" />
                  <p className="text-sm text-gray-500">Catalog</p>
                </div>
                <p className="text-gray-700">Organize offerings, pricing, and promotions.</p>
              </div>

              <div className="p-6 rounded-2xl border-2 border-gray-100">
                <div className="flex items-center space-x-3 mb-2">
                  <ShieldCheck className="w-5 h-5 text-[#6C63FF]" />
                  <p className="text-sm text-gray-500">Permissions</p>
                </div>
                <p className="text-gray-700">Manage team access and approvals.</p>
              </div>

              {/* Business Rules and Regulation */}
              <div className="p-6 rounded-2xl border-2 border-purple-100 bg-purple-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <ShieldCheck className="w-5 h-5 text-purple-700" />
                    <p className="text-sm text-purple-700 font-semibold">Business Rules & Regulation</p>
                  </div>
                  <button
                    onClick={() => setShowBusinessRulesManager(!showBusinessRulesManager)}
                    className="btn-secondary text-xs"
                  >
                    {showBusinessRulesManager ? 'Close' : 'Manage'}
                  </button>
                </div>
                <p className="text-gray-700 text-sm">Manage business rules and regulations for your organization.</p>

                {showBusinessRulesManager && (
                  <div className="mt-4 space-y-4">
                    {/* Business Rules List */}
                    <div className="bg-white rounded-lg p-4 border max-h-60 overflow-y-auto">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold">Rules ({businessRules.length})</h4>
                        <button
                          onClick={() => setEditingBusinessRule(null)}
                          className="btn-primary text-xs"
                        >
                          Add New
                        </button>
                      </div>

                      {businessRulesLoading ? (
                        <p className="text-xs text-gray-500">Loading...</p>
                      ) : businessRules.length === 0 ? (
                        <p className="text-xs text-gray-500">No rules created yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {businessRules.map(rule => (
                            <div key={rule.id} className="border rounded p-2 hover:bg-gray-50">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1">
                                  <h5 className="text-xs font-medium">{rule.title}</h5>
                                  <span className={`text-xs px-1 py-0.5 rounded-full ${rule.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {rule.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => setEditingBusinessRule(rule)}
                                    className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteBusinessRule(rule)}
                                    className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">{rule.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add/Edit Business Rule Form */}
                    {(editingBusinessRule !== null || businessRules.length === 0) && (
                      <div className="bg-white rounded-lg p-4 border">
                        <h4 className="text-sm font-semibold mb-3">
                          {editingBusinessRule ? `Editing: ${editingBusinessRule.title}` : 'Add New Business Rule'}
                        </h4>

                        <div className="grid grid-cols-1 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Title</label>
                            <input
                              type="text"
                              value={editingBusinessRule ? editingBusinessRule.title : newBusinessRule.title}
                              onChange={(e) => {
                                if (editingBusinessRule) {
                                  setEditingBusinessRule({ ...editingBusinessRule, title: e.target.value });
                                } else {
                                  setNewBusinessRule({ ...newBusinessRule, title: e.target.value });
                                }
                              }}
                              className="input text-xs"
                              placeholder="Rule title"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Content</label>
                            <textarea
                              value={editingBusinessRule ? editingBusinessRule.content : newBusinessRule.content}
                              onChange={(e) => {
                                if (editingBusinessRule) {
                                  setEditingBusinessRule({ ...editingBusinessRule, content: e.target.value });
                                } else {
                                  setNewBusinessRule({ ...newBusinessRule, content: e.target.value });
                                }
                              }}
                              className="input text-xs"
                              rows={3}
                              placeholder="Rule content"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium mb-1">Order</label>
                              <input
                                type="number"
                                value={editingBusinessRule ? editingBusinessRule.order : newBusinessRule.order}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 1;
                                  if (editingBusinessRule) {
                                    setEditingBusinessRule({ ...editingBusinessRule, order: value });
                                  } else {
                                    setNewBusinessRule({ ...newBusinessRule, order: value });
                                  }
                                }}
                                className="input text-xs"
                                min="1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Status</label>
                              <select
                                value={editingBusinessRule ? (editingBusinessRule.is_active ? 'active' : 'inactive') : (newBusinessRule.is_active ? 'active' : 'inactive')}
                                onChange={(e) => {
                                  const isActive = e.target.value === 'active';
                                  if (editingBusinessRule) {
                                    setEditingBusinessRule({ ...editingBusinessRule, is_active: isActive });
                                  } else {
                                    setNewBusinessRule({ ...newBusinessRule, is_active: isActive });
                                  }
                                }}
                                className="input text-xs"
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={editingBusinessRule ? updateBusinessRule : createBusinessRule}
                            className="btn-primary text-xs"
                          >
                            {editingBusinessRule ? 'Update' : 'Create'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingBusinessRule(null);
                              setNewBusinessRule({ title: '', content: '', order: businessRules.length + 1, is_active: true });
                            }}
                            className="btn-secondary text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
