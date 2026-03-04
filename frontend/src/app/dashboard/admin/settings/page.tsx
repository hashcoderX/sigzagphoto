"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import AdminSectionHeader from "@/components/AdminSectionHeader";
import { hasBusinessAccess, isBusinessOrPhotographer, isFreeExpired } from "@/lib/access";
import { Trash2 } from "lucide-react";

type ApiUser = { id: number; name: string; email: string; role: string; currency?: string; privilege?: string };
type UserLite = { id: number; name: string; email: string; role: string; privilege?: string | null };

// Invoice Template Designer Types
type ComponentType = 'logo' | 'companyInfo' | 'customerInfo' | 'itemsTable' | 'totals' | 'notes';

interface ComponentProps {
  text?: string;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
  width?: number;
  height?: number;
  background?: string;
  padding?: number;
  imageUrl?: string; // For logo
  margin?: { top: number; right: number; bottom: number; left: number }; // New margin controls
  // Add more as needed
}

interface CanvasComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  props: ComponentProps;
}

interface Template {
  id: string;
  name: string;
  layout: { width: number; height: number; unit: 'mm' | 'px'; margin: { top: number; right: number; bottom: number; left: number } };
  components: CanvasComponent[];
}

interface LayoutPreset {
  name: string;
  width: number;
  height: number;
  unit: 'mm';
  margin: { top: number; right: number; bottom: number; left: number };
}

// Helpers
const mmToPx = (mm: number): number => mm * 3.779527559; // Approx 96 DPI
const pxToMm = (px: number): number => px / 3.779527559;

const serializeTemplate = (template: Template): string => JSON.stringify(template);
const deserializeTemplate = (json: string): Template => JSON.parse(json);

const defaultLayouts: LayoutPreset[] = [
  { name: 'A4', width: 210, height: 250, unit: 'mm', margin: { top: 10, right: 10, bottom: 10, left: 10 } },
  { name: 'Legal', width: 216, height: 300, unit: 'mm', margin: { top: 10, right: 10, bottom: 10, left: 10 } },
];

const toolboxItems: { type: ComponentType; label: string }[] = [
  { type: 'logo', label: 'Logo' },
  { type: 'companyInfo', label: 'Company Info' },
  { type: 'customerInfo', label: 'Customer Info' },
  { type: 'itemsTable', label: 'Items Table' },
  { type: 'totals', label: 'Totals' },
  { type: 'notes', label: 'Notes' },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<{ name: string; email: string; password?: string; currency?: string } | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Users & privileges
  const [users, setUsers] = useState<UserLite[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{ name: string; email: string; password: string; privilege: string }>({ name: '', email: '', password: '', privilege: 'officer' });
  const [userActionMsg, setUserActionMsg] = useState<string | null>(null);

  // Invoice Template Designer State
  const [currentTemplate, setCurrentTemplate] = useState<Template>({
    id: 'default',
    name: 'Untitled',
    layout: { width: 210, height: 250, unit: 'mm', margin: { top: 10, right: 10, bottom: 10, left: 10 } },
    components: [],
  });
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Footer Rules State
  const [footerRules, setFooterRules] = useState<{ id: number; title: string; content: string; is_active: boolean; order: number }[]>([]);
  const [loadingFooterRules, setLoadingFooterRules] = useState(false);
  const [newRuleText, setNewRuleText] = useState('');
  const [addingRule, setAddingRule] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const cached = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
    if (cached) {
      try { const u = JSON.parse(cached); setUser(u); setProfileForm({ name: u?.name || '', email: u?.email || '', currency: u?.currency || undefined }); } catch {}
    }
    if (!token) { router.replace("/login"); return; }
    // Block free plan from business suite
    if (!isBusinessOrPhotographer() || !hasBusinessAccess()) { router.replace(isFreeExpired() ? '/pricing' : '/upgrade'); return; }
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Unauthorized");
        const me = (await res.json()) as ApiUser;
        // Allow only photographer or business
        const r = (me.role || "").toLowerCase();
        if (!["business","photographer"].includes(r)) { router.replace("/dashboard"); return; }
        setUser(me);
        setProfileForm({ name: me.name, email: me.email, currency: me.currency });
        localStorage.setItem("auth_user", JSON.stringify(me));
      } catch {
        router.replace("/login");
      } finally { setLoading(false); }
    })();
  }, [router]);

  // Load users for privileges management
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;
    (async () => {
      setUsersLoading(true); setUserError(null);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?per_page=100`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        const list: UserLite[] = data?.data || data || [];
        setUsers(list);
      } catch (e:any) { setUserError(e?.message || 'Failed to load users'); }
      finally { setUsersLoading(false); }
    })();
  }, []);

  // Arrow-key movement handled per-component (focus the item and use arrows)

  // Load saved templates from API
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoice-templates`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const templates = await res.json();
        const frontendTemplates: Template[] = templates.map((t: any) => ({
          id: t.id.toString(),
          name: t.name,
          layout: {
            width: pxToMm(t.page_width),
            height: pxToMm(t.page_height),
            unit: 'mm',
            margin: t.margins || { top: 10, right: 10, bottom: 10, left: 10 },
          },
          components: t.elements || [],
        }));
        setSavedTemplates(frontendTemplates);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    loadTemplates();
  }, []);

  // Load footer rules
  useEffect(() => {
    loadFooterRules();
  }, []);

  const saveProfile = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token || !profileForm) return;
    setSavingProfile(true); setProfileError(null); setProfileSuccess(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Update failed');
      setProfileSuccess('Profile updated');
      // refresh local cache
      if (data?.name || data?.email) {
        const merged = { ...(user||{}), ...data } as ApiUser;
        setUser(merged);
        localStorage.setItem('auth_user', JSON.stringify(merged));
      }
    } catch (e:any) { setProfileError(e?.message || 'Update failed'); }
    finally { setSavingProfile(false); }
  };

  const createUser = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;
    setUserActionMsg(null); setUserError(null);
    try {
      const payload = { ...newUserForm };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Create failed');
      setUserActionMsg('User created');
      setCreatingUser(false);
      // refresh users
      setUsers(prev => [data, ...prev]);
    } catch (e:any) { setUserError(e?.message || 'Create failed'); }
  };

  const updateUser = async (id:number, patch: Partial<UserLite>) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) return;
    setUserActionMsg(null); setUserError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Update failed');
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
      setUserActionMsg('User updated');
    } catch (e:any) { setUserError(e?.message || 'Update failed'); }
  };

  // Invoice Template Designer Functions
  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData('componentType', type);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('componentType') as ComponentType;
    if (!type) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const marginLeft = mmToPx(currentTemplate.layout.margin.left);
    const marginTop = mmToPx(currentTemplate.layout.margin.top);
    const x = Math.max(0, e.clientX - rect.left - marginLeft);
    const y = Math.max(0, e.clientY - rect.top - marginTop);
    const newComponent: CanvasComponent = {
      id: `${type}-${Date.now()}`,
      type,
      x,
      y,
      props: type === 'logo' ? { width: 100, height: 50, background: '#fff', padding: 5, imageUrl: '', margin: { top: 0, right: 0, bottom: 0, left: 0 } } : { text: `Sample ${type}`, fontSize: 12, alignment: 'left', width: 100, height: 50, background: '#fff', padding: 5, margin: { top: 0, right: 0, bottom: 0, left: 0 } },
    };
    setCurrentTemplate(prev => ({ ...prev, components: [...prev.components, newComponent] }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const selectComponent = (id: string) => {
    setSelectedComponent(id);
  };

  const updateComponentProps = (id: string, props: Partial<ComponentProps>) => {
    setCurrentTemplate(prev => ({
      ...prev,
      components: prev.components.map(c => c.id === id ? { ...c, props: { ...c.props, ...props } } : c),
    }));
  };

  const removeComponent = (id: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== id),
    }));
    if (selectedComponent === id) setSelectedComponent(null);
  };

  const changeLayout = (preset: LayoutPreset | 'custom') => {
    if (preset === 'custom') {
      // Keep current layout; custom editing handled via inputs
      setCurrentTemplate(prev => ({ ...prev }));
    } else {
      setCurrentTemplate(prev => ({ ...prev, layout: { width: preset.width, height: preset.height, unit: preset.unit, margin: preset.margin } }));
    }
  };

  const saveTemplate = () => {
    setShowSaveModal(true);
  };

  const confirmSaveTemplate = async () => {
    if (!saveTemplateName.trim()) return;
    setSavingTemplate(true);
    try {
      const token = localStorage.getItem('auth_token');
      const htmlContent = canvasRef.current ? canvasRef.current.innerHTML : '';
      const payload = {
        name: saveTemplateName.trim(),
        elements: currentTemplate.components,
        // html_content: htmlContent.length < 50000 ? htmlContent : '', // Temporarily disabled for debugging
        page_width: Math.round(mmToPx(currentTemplate.layout.width)),
        page_height: Math.round(mmToPx(currentTemplate.layout.height)),
        paper_size: currentTemplate.layout.width === 210 && currentTemplate.layout.height === 250 ? 'A4' : 'Custom',
        margins: currentTemplate.layout.margin,
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoice-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Save template failed:', res.status, errorText);
        alert(`Failed to save template: ${res.status} - ${errorText}`);
        throw new Error(`Failed to save template: ${res.status} ${errorText}`);
      }
      const newTemplate = await res.json();
      // Convert back to frontend format
      const frontendTemplate: Template = {
        id: newTemplate.id.toString(),
        name: newTemplate.name,
        layout: {
          width: pxToMm(newTemplate.page_width),
          height: pxToMm(newTemplate.page_height),
          unit: 'mm',
          margin: newTemplate.margins || { top: 10, right: 10, bottom: 10, left: 10 },
        },
        components: newTemplate.elements || [],
      };
      setSavedTemplates(prev => [...prev, frontendTemplate]);
      setShowSaveModal(false);
      setSaveTemplateName('');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const loadTemplate = (template: Template) => {
    // Ensure backward compatibility: add margin if missing
    const updatedComponents = template.components.map(c => ({
      ...c,
      props: {
        ...c.props,
        margin: c.props.margin || { top: 0, right: 0, bottom: 0, left: 0 },
      },
    }));
    const updatedLayout = {
      ...template.layout,
      margin: template.layout.margin || { top: 10, right: 10, bottom: 10, left: 10 },
    };
    setCurrentTemplate({ ...template, components: updatedComponents, layout: updatedLayout });
    setSelectedComponent(null);
  };

  const deleteTemplate = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/invoice-templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setSavedTemplates(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete template');
    }
  };

  // Footer Rules Functions
  const loadFooterRules = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    setLoadingFooterRules(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/footer-rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load footer rules');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data?.data || []);
      const normalized = list.map((r: any) => ({
        ...r,
        is_active: !!r?.is_active,
      }));
      setFooterRules(normalized);
    } catch (error) {
      console.error('Load footer rules failed:', error);
    } finally {
      setLoadingFooterRules(false);
    }
  };

  const addFooterRule = async () => {
    if (!newRuleText.trim()) return;
    setAddingRule(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/footer-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'Rule', content: newRuleText.trim() }),
      });
      if (!res.ok) throw new Error('Failed to add rule');
      const newRule = await res.json();
      setFooterRules(prev => [...prev, { ...newRule, is_active: !!newRule?.is_active }]);
      setNewRuleText('');
    } catch (error) {
      console.error('Add rule failed:', error);
      alert('Failed to add rule');
    } finally {
      setAddingRule(false);
    }
  };

  const toggleFooterRule = async (id: number, is_active: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/footer-rules/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error('Failed to update rule');
      setFooterRules(prev => prev.map(r => r.id === id ? { ...r, is_active } : r));
    } catch (error) {
      console.error('Toggle rule failed:', error);
      alert('Failed to update rule');
    }
  };

  const deleteFooterRule = async (id: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/footer-rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete rule');
      setFooterRules(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Delete rule failed:', error);
      alert('Failed to delete rule');
    }
  };

  const selectedComp = selectedComponent ? currentTemplate.components.find(c => c.id === selectedComponent) : null;
  const currentLayoutName = (defaultLayouts.find(l => l.width === currentTemplate.layout.width && l.height === currentTemplate.layout.height)?.name) || 'custom';

  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-white min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          <>
            <AdminSectionHeader title="Settings" subtitle="Configure company profile, branding and preferences" />
            {loading ? (
              <p className="text-gray-600">Loading...</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile settings */}
                <div className="p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50">
                  <div className="text-sm text-indigo-700 font-semibold">Profile</div>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <input className="input" placeholder="Name" value={profileForm?.name || ''} onChange={(e)=>setProfileForm(f=> f ? {...f, name:e.target.value} : { name: e.target.value, email: profileForm?.email || '', password: profileForm?.password, currency: profileForm?.currency })} />
                    <input className="input" placeholder="Email" value={profileForm?.email || ''} onChange={(e)=>setProfileForm(f=> f ? {...f, email:e.target.value} : { name: profileForm?.name || '', email: e.target.value, password: profileForm?.password, currency: profileForm?.currency })} />
                    <input className="input" type="password" placeholder="New Password (optional)" value={profileForm?.password || ''} onChange={(e)=>setProfileForm(f=> f ? {...f, password:e.target.value} : { name: profileForm?.name || '', email: profileForm?.email || '', password: e.target.value, currency: profileForm?.currency })} />
                    <input className="input" placeholder="Currency (e.g. USD)" value={profileForm?.currency || ''} onChange={(e)=>setProfileForm(f=> f ? {...f, currency:e.target.value} : { name: profileForm?.name || '', email: profileForm?.email || '', password: profileForm?.password, currency: e.target.value })} />
                    {profileError && <div className="text-sm text-red-700">{profileError}</div>}
                    {profileSuccess && <div className="text-sm text-emerald-700">{profileSuccess}</div>}
                    <div>
                      <button disabled={savingProfile} onClick={saveProfile} className="btn-primary">{savingProfile? 'Saving...' : 'Save Profile'}</button>
                    </div>
                  </div>
                </div>

                {/* Users & privileges */}
                <div className="p-4 rounded-xl border-2 border-pink-100 bg-pink-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-pink-700 font-semibold">Users & Privileges</div>
                    {user?.privilege?.toLowerCase() !== 'officer' && (
                      <button onClick={()=>setCreatingUser(v=>!v)} className="btn-secondary">{creatingUser? 'Close' : 'Register User'}</button>
                    )}
                  </div>
                  {creatingUser && (
                    <div className="registerCard" role="region" aria-label="Register user">
                      <div className="registerHeader">Register User</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="field">
                          <span className="fieldLabel">Full name</span>
                          <input className="input" placeholder="Jane Doe" value={newUserForm.name} onChange={(e)=>setNewUserForm({...newUserForm, name:e.target.value})} />
                        </label>
                        <label className="field">
                          <span className="fieldLabel">Email</span>
                          <input className="input" placeholder="jane@example.com" value={newUserForm.email} onChange={(e)=>setNewUserForm({...newUserForm, email:e.target.value})} />
                        </label>
                        <label className="field md:col-span-2">
                          <span className="fieldLabel">Password</span>
                          <input className="input" type="password" placeholder="••••••••" value={newUserForm.password} onChange={(e)=>setNewUserForm({...newUserForm, password:e.target.value})} />
                        </label>
                        <label className="field">
                          <span className="fieldLabel">Privilege</span>
                          <select className="input" value={newUserForm.privilege} onChange={(e)=>setNewUserForm({...newUserForm, privilege: e.target.value})}>
                            <option value="officer">Officer</option>
                            <option value="cashier">Cashier</option>
                          </select>
                        </label>
                        {userError && <div className="md:col-span-2 formError">{userError}</div>}
                        {userActionMsg && <div className="md:col-span-2 formSuccess">{userActionMsg}</div>}
                        <div className="md:col-span-2 flex items-center gap-3">
                          <button onClick={createUser} className="btn-primary">Create</button>
                          <span className="text-xs text-gray-500">User inherits your role; privilege defines access (Officer/Cashier).</span>
                        </div>
                      </div>
                      <div className="registerGlow" aria-hidden="true" />
                    </div>
                  )}
                  <div className="mt-4 overflow-x-auto">
                    {usersLoading ? (
                      <p className="text-gray-700">Loading users...</p>
                    ) : (
                      <table className="adminTable" role="table" aria-label="Users table">
                        <thead>
                          <tr className="text-left text-gray-500">
                            <th className="py-2 pr-4">Name</th>
                            <th className="py-2 pr-4">Email</th>
                            <th className="py-2 pr-4">Role</th>
                            <th className="py-2 pr-4">Privilege</th>
                            <th className="py-2 pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(u => (
                            <tr key={u.id}>
                              <td className="py-2 pr-4">{u.name}</td>
                              <td className="py-2 pr-4">{u.email}</td>
                              <td className="py-2 pr-4"><span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 border">{u.role}</span></td>
                              <td className="py-2 pr-4"><span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 border">{u.privilege || '(None)'}</span></td>
                              <td className="py-2 pr-4"><span className="text-xs text-gray-500">Auto-saves on change</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Invoice Template Designer */}
                <div className="col-span-1 lg:col-span-2 p-4 rounded-xl border-2 border-green-100 bg-green-50">
                  <div className="text-sm text-green-700 font-semibold">Invoice Template Designer</div>
                  <div className="mt-4 flex flex-col lg:flex-row gap-4">
                    {/* Toolbox */}
                    <div className="w-full lg:w-1/4 bg-white p-4 rounded-lg border">
                      <h3 className="font-semibold mb-2">Components</h3>
                      <div className="space-y-2">
                        {toolboxItems.map(item => (
                          <div
                            key={item.type}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.type)}
                            className="p-2 bg-gray-100 rounded cursor-move hover:bg-gray-200"
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>
                      <h3 className="font-semibold mt-4 mb-2">Layout</h3>
                      <select
                        className="input w-full"
                        value={currentLayoutName}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            changeLayout('custom');
                          } else {
                            const preset = defaultLayouts.find(l => l.name === val);
                            if (preset) changeLayout(preset);
                          }
                        }}
                      >
                        {defaultLayouts.map(l => (
                          <option key={l.name} value={l.name}>{l.name} ({l.width}x{l.height}mm)</option>
                        ))}
                        <option value="custom">Custom</option>
                      </select>
                      {currentLayoutName === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <label>
                            <span className="text-sm font-medium">Width (mm)</span>
                            <input
                              type="number"
                              className="input w-full"
                              value={currentTemplate.layout.width}
                              onChange={(e) => setCurrentTemplate(prev => ({ ...prev, layout: { ...prev.layout, width: Number(e.target.value) } }))}
                            />
                          </label>
                          <label>
                            <span className="text-sm font-medium">Height (mm)</span>
                            <input
                              type="number"
                              className="input w-full"
                              value={currentTemplate.layout.height}
                              onChange={(e) => setCurrentTemplate(prev => ({ ...prev, layout: { ...prev.layout, height: Number(e.target.value) } }))}
                            />
                          </label>
                          <label>
                            <span className="text-sm font-medium">Margin Top (mm)</span>
                            <input
                              type="number"
                              className="input w-full"
                              value={currentTemplate.layout.margin.top}
                              onChange={(e) => setCurrentTemplate(prev => ({ ...prev, layout: { ...prev.layout, margin: { ...prev.layout.margin, top: Number(e.target.value) } } }))}
                            />
                          </label>
                          <label>
                            <span className="text-sm font-medium">Margin Right (mm)</span>
                            <input
                              type="number"
                              className="input w-full"
                              value={currentTemplate.layout.margin.right}
                              onChange={(e) => setCurrentTemplate(prev => ({ ...prev, layout: { ...prev.layout, margin: { ...prev.layout.margin, right: Number(e.target.value) } } }))}
                            />
                          </label>
                          <label>
                            <span className="text-sm font-medium">Margin Bottom (mm)</span>
                            <input
                              type="number"
                              className="input w-full"
                              value={currentTemplate.layout.margin.bottom}
                              onChange={(e) => setCurrentTemplate(prev => ({ ...prev, layout: { ...prev.layout, margin: { ...prev.layout.margin, bottom: Number(e.target.value) } } }))}
                            />
                          </label>
                          <label>
                            <span className="text-sm font-medium">Margin Left (mm)</span>
                            <input
                              type="number"
                              className="input w-full"
                              value={currentTemplate.layout.margin.left}
                              onChange={(e) => setCurrentTemplate(prev => ({ ...prev, layout: { ...prev.layout, margin: { ...prev.layout.margin, left: Number(e.target.value) } } }))}
                            />
                          </label>
                        </div>
                      )}
                      <h3 className="font-semibold mt-4 mb-2">Templates</h3>
                      <button onClick={saveTemplate} className="btn-primary w-full mb-2">Save Template</button>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {savedTemplates.map(t => (
                          <div key={t.id} className="flex justify-between items-center p-1 bg-gray-100 rounded">
                            <span className="text-sm">{t.name}</span>
                            <div>
                              <button onClick={() => loadTemplate(t)} className="text-xs text-blue-600 mr-2">Load</button>
                              <button onClick={() => deleteTemplate(t.id)} className="text-xs text-red-600">Del</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Canvas */}
                    <div className="w-full lg:w-2/4 bg-white border rounded-lg overflow-hidden">
                      <div
                        ref={canvasRef}
                        className="relative bg-white border-2 border-dashed border-gray-400"
                        style={{
                          width: `${mmToPx(currentTemplate.layout.width)}px`,
                          height: `${mmToPx(currentTemplate.layout.height)}px`,
                          padding: `${mmToPx(currentTemplate.layout.margin.top)}px ${mmToPx(currentTemplate.layout.margin.right)}px ${mmToPx(currentTemplate.layout.margin.bottom)}px ${mmToPx(currentTemplate.layout.margin.left)}px`,
                          boxSizing: 'border-box',
                        }}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                      >
                        {currentTemplate.components.map(comp => (
                          <div
                            key={comp.id}
                            className={`absolute border-2 ${selectedComponent === comp.id ? 'border-blue-500' : 'border-gray-300'} bg-white cursor-move focus:outline-none focus:ring-2 focus:ring-blue-400`}
                            style={{
                              left: `${comp.x}px`,
                              top: `${comp.y}px`,
                              width: `${comp.props.width}px`,
                              height: `${comp.props.height}px`,
                              backgroundColor: comp.props.background,
                              padding: `${comp.props.padding}px`,
                              fontSize: `${comp.props.fontSize}px`,
                              textAlign: comp.props.alignment,
                              marginTop: `${comp.props.margin?.top || 0}px`,
                              marginRight: `${comp.props.margin?.right || 0}px`,
                              marginBottom: `${comp.props.margin?.bottom || 0}px`,
                              marginLeft: `${comp.props.margin?.left || 0}px`,
                            }}
                            tabIndex={0}
                            onClick={() => selectComponent(comp.id)}
                            onFocus={() => selectComponent(comp.id)}
                            onKeyDown={(e) => {
                              const step = e.shiftKey ? 10 : 1;
                              let dx = 0, dy = 0;
                              switch (e.key) {
                                case 'ArrowUp': dy = -step; break;
                                case 'ArrowDown': dy = step; break;
                                case 'ArrowLeft': dx = -step; break;
                                case 'ArrowRight': dx = step; break;
                                default: return;
                              }
                              e.preventDefault();
                              setCurrentTemplate(prev => ({
                                ...prev,
                                components: prev.components.map(c => c.id === comp.id ? { ...c, x: c.x + dx, y: c.y + dy } : c),
                              }));
                            }}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('componentId', comp.id);
                            }}
                            onDragEnd={(e) => {
                              const rect = canvasRef.current?.getBoundingClientRect();
                              if (!rect) return;
                              const marginLeft = mmToPx(currentTemplate.layout.margin.left);
                              const marginTop = mmToPx(currentTemplate.layout.margin.top);
                              const newX = Math.max(0, e.clientX - rect.left - marginLeft);
                              const newY = Math.max(0, e.clientY - rect.top - marginTop);
                              setCurrentTemplate(prev => ({
                                ...prev,
                                components: prev.components.map(c => c.id === comp.id ? { ...c, x: newX, y: newY } : c),
                              }));
                            }}
                          >
                            {comp.type === 'logo' ? (
                              comp.props.imageUrl ? <img src={comp.props.imageUrl} alt="Logo" className="w-full h-full object-contain" data-original-width={comp.props.width} data-original-height={comp.props.height} /> : <span className="text-gray-500">No image</span>
                            ) : (
                              comp.props.text
                            )}
                          </div>
                        ))}
                        {/* Printable area indicator */}
                        <div
                          className="absolute bg-white border border-dashed border-gray-400"
                          style={{
                            top: `${mmToPx(currentTemplate.layout.margin.top)}px`,
                            left: `${mmToPx(currentTemplate.layout.margin.left)}px`,
                            width: `calc(100% - ${mmToPx(currentTemplate.layout.margin.left + currentTemplate.layout.margin.right)}px)`,
                            height: `calc(100% - ${mmToPx(currentTemplate.layout.margin.top + currentTemplate.layout.margin.bottom)}px)`,
                            pointerEvents: 'none',
                            zIndex: -1,
                          }}
                        ></div>
                      </div>
                    </div>

                    {/* Properties Panel */}
                    <div className="w-full lg:w-1/4 bg-white p-4 rounded-lg border">
                      <h3 className="font-semibold mb-2">Properties</h3>
                      {selectedComp ? (
                        <div className="space-y-3">
                          {selectedComp.type === 'logo' ? (
                            <>
                              <label>
                                <span className="text-sm font-medium">Logo Image</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="input w-full"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        updateComponentProps(selectedComp.id, { imageUrl: reader.result as string });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </label>
                              {selectedComp.props.imageUrl && (
                                <img src={selectedComp.props.imageUrl} alt="Logo preview" className="w-full h-20 object-contain border" />
                              )}
                            </>
                          ) : (
                            <label>
                              <span className="text-sm font-medium">Text</span>
                              <input
                                className="input w-full"
                                value={selectedComp.props.text || ''}
                                onChange={(e) => updateComponentProps(selectedComp.id, { text: e.target.value })}
                              />
                            </label>
                          )}
                          <label>
                            <span className="text-sm font-medium">Font Size</span>
                            <input
                              type="number"
                              className="input w-full"
                              value={selectedComp.props.fontSize || 12}
                              onChange={(e) => updateComponentProps(selectedComp.id, { fontSize: Number(e.target.value) })}
                            />
                          </label>
                          <label>
                            <span className="text-sm font-medium">Alignment</span>
                            <select
                              className="input w-full"
                              value={selectedComp.props.alignment || 'left'}
                              onChange={(e) => updateComponentProps(selectedComp.id, { alignment: e.target.value as 'left' | 'center' | 'right' })}
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </label>
                          <label>
                            <span className="text-sm font-medium">Width</span>
                            <input
                              type="number"
                              className="input w-full"
                              value={selectedComp.props.width || 100}
                              onChange={(e) => updateComponentProps(selectedComp.id, { width: Number(e.target.value) })}
                            />
                          </label>
                          <label>
                            <span className="text-sm font-medium">Height</span>
                            <input
                              type="number"
                              className="input w-full"
                              value={selectedComp.props.height || 50}
                              onChange={(e) => updateComponentProps(selectedComp.id, { height: Number(e.target.value) })}
                            />
                          </label>
                          <label>
                            <span className="text-sm font-medium">Background</span>
                            <input
                              type="color"
                              className="input w-full"
                              value={selectedComp.props.background || '#fff'}
                              onChange={(e) => updateComponentProps(selectedComp.id, { background: e.target.value })}
                            />
                          </label>
                          <label>
                            <span className="text-sm font-medium">Padding</span>
                            <input
                              type="number"
                              className="input w-full"
                              value={selectedComp.props.padding || 5}
                              onChange={(e) => updateComponentProps(selectedComp.id, { padding: Number(e.target.value) })}
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label>
                              <span className="text-sm font-medium">Margin Top</span>
                              <input
                                type="number"
                                className="input w-full"
                                value={selectedComp.props.margin?.top || 0}
                                onChange={(e) => {
                                  const m = selectedComp.props.margin || { top: 0, right: 0, bottom: 0, left: 0 };
                                  updateComponentProps(selectedComp.id, { margin: { ...m, top: Number(e.target.value) } });
                                }}
                              />
                            </label>
                            <label>
                              <span className="text-sm font-medium">Margin Right</span>
                              <input
                                type="number"
                                className="input w-full"
                                value={selectedComp.props.margin?.right || 0}
                                onChange={(e) => {
                                  const m = selectedComp.props.margin || { top: 0, right: 0, bottom: 0, left: 0 };
                                  updateComponentProps(selectedComp.id, { margin: { ...m, right: Number(e.target.value) } });
                                }}
                              />
                            </label>
                            <label>
                              <span className="text-sm font-medium">Margin Bottom</span>
                              <input
                                type="number"
                                className="input w-full"
                                value={selectedComp.props.margin?.bottom || 0}
                                onChange={(e) => {
                                  const m = selectedComp.props.margin || { top: 0, right: 0, bottom: 0, left: 0 };
                                  updateComponentProps(selectedComp.id, { margin: { ...m, bottom: Number(e.target.value) } });
                                }}
                              />
                            </label>
                            <label>
                              <span className="text-sm font-medium">Margin Left</span>
                              <input
                                type="number"
                                className="input w-full"
                                value={selectedComp.props.margin?.left || 0}
                                onChange={(e) => {
                                  const m = selectedComp.props.margin || { top: 0, right: 0, bottom: 0, left: 0 };
                                  updateComponentProps(selectedComp.id, { margin: { ...m, left: Number(e.target.value) } });
                                }}
                              />
                            </label>
                          </div>
                          {/* TODO: Add padding controls in the next iteration. */}
                          {/* TODO: Add grid/snap-to-grid mode for perfect alignment. */}
                          {/* TODO: Add multi-select for moving groups of widgets. */}
                          <button onClick={() => removeComponent(selectedComp.id)} className="btn-secondary w-full">Remove</button>
                        </div>
                      ) : (
                        <p className="text-gray-500">Select a component to edit properties.</p>
                      )}
                    </div>

                    {/* Rules Section */}
                    <div className="w-full lg:w-1/4 bg-white p-4 rounded-lg border">
                      <h3 className="font-semibold mb-2">Footer Rules</h3>
                      <div className="space-y-2">
                        <input
                          type="text"
                          className="input w-full"
                          placeholder="Enter new rule text"
                          value={newRuleText}
                          onChange={(e) => setNewRuleText(e.target.value)}
                        />
                        <button
                          onClick={addFooterRule}
                          disabled={addingRule || !newRuleText.trim()}
                          className="btn-primary w-full"
                        >
                          {addingRule ? 'Adding...' : 'Add Rule'}
                        </button>
                      </div>
                      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                        {loadingFooterRules ? (
                          <p className="text-gray-500">Loading rules...</p>
                        ) : footerRules.length === 0 ? (
                          <p className="text-gray-500">No rules added yet.</p>
                        ) : (
                          footerRules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex-1">
                                <p className="text-sm">{rule.content}</p>
                                <div className="flex items-center mt-1">
                                  <input
                                    type="checkbox"
                                    checked={!!rule.is_active}
                                    onChange={(e) => toggleFooterRule(rule.id, e.target.checked)}
                                    className="mr-2"
                                  />
                                  <span className="text-xs text-gray-600">Active</span>
                                </div>
                              </div>
                              <button
                                onClick={() => deleteFooterRule(rule.id)}
                                className="text-red-600 hover:text-red-800 ml-2"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="jsx-eca2145926fefdc1 bottom"></div>
                </div>
              </div>
            )}
          </>
        </motion.div>
        </div>
      </section>

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Invoice Template</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Template Name</label>
              <input
                type="text"
                className="input w-full"
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                placeholder="Enter template name"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setSaveTemplateName('');
                }}
                className="btn-secondary"
                disabled={savingTemplate}
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveTemplate}
                className="btn-primary"
                disabled={savingTemplate || !saveTemplateName.trim()}
              >
                {savingTemplate ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <style jsx global>{`
        /* Register card rich styling */
        .registerCard { position:relative; margin-top:.75rem; padding:1rem; border-radius:1.25rem; border:1px solid #fbcfe8; background:linear-gradient(145deg,#fff1f2,#fce7f3); box-shadow:0 14px 32px -10px rgba(236,72,153,.35), 0 6px 16px -8px rgba(31,41,55,.12); overflow:hidden; }
        .registerHeader { font-size:.7rem; font-weight:800; text-transform:uppercase; letter-spacing:.7px; background:linear-gradient(90deg,#db2777,#7c3aed); -webkit-background-clip:text; color:transparent; margin-bottom:.5rem; }
        .registerGlow { position:absolute; inset:0; background:radial-gradient(circle at 85% 10%,rgba(219,39,119,.25),transparent 60%), radial-gradient(circle at 10% 90%,rgba(124,58,237,.2),transparent 65%); pointer-events:none; }
        .field { display:flex; flex-direction:column; gap:.35rem; }
        .fieldLabel { font-size:.7rem; font-weight:700; letter-spacing:.4px; color:#7e22ce; }
        .formError { background:#fee2e2; border:1px solid #fecaca; color:#7f1d1d; padding:.5rem .75rem; border-radius:.75rem; }
        .formSuccess { background:#dcfce7; border:1px solid #bbf7d0; color:#065f46; padding:.5rem .75rem; border-radius:.75rem; }
        /* Inputs/buttons fallback if not globally defined */
        .input { width: 100%; padding: 0.55rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.75rem; }
        .input:focus { outline: none; border-color: #818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.15); }
        .btn-primary { background: #111827; color: white; padding: 0.55rem 0.9rem; border-radius: 0.75rem; font-weight:700; }
        .btn-secondary { background: #f3f4f6; color: #111827; padding: 0.5rem 0.9rem; border-radius: 0.75rem; }
        @media (prefers-reduced-motion: reduce) { .registerCard { transition:none; } }
      `}</style>
    </main>
  );
}
