export type AuthUser = { id?: number; name?: string; email?: string; role?: string; premium_package?: boolean; created_at?: string };

export const getAuthUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch { return null; }
};

export const getMembershipPlan = (): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem('membership_plan'); } catch { return null; }
};

export const getEffectivePlan = (): 'free' | 'monthly' | 'yearly' | string => {
  const plan = (getMembershipPlan() || 'free').toLowerCase();
  return (plan === 'monthly' || plan === 'yearly') ? plan : 'free';
};

export const isFreeExpired = (): boolean => {
  if (typeof window === 'undefined') return false;
  const plan = getEffectivePlan();
  if (plan !== 'free') return false;

  const user = getAuthUser();
  // If backend provides explicit trial window, prefer it
  if (user && (user as any).trial_ends_at) {
    const end = new Date((user as any).trial_ends_at);
    if (!isNaN(end.getTime())) {
      return Date.now() > end.getTime();
    }
  }
  // Prefer server-created date; fallback to a client-side start marker
  let startMs: number | null = null;
  if (user?.created_at) {
    const d = new Date(user.created_at);
    if (!isNaN(d.getTime())) startMs = d.getTime();
  }
  if (!startMs) {
    try {
      const saved = localStorage.getItem('free_start_ts');
      if (saved) startMs = parseInt(saved, 10);
      if (!saved) {
        const now = Date.now();
        localStorage.setItem('free_start_ts', String(now));
        startMs = now;
      }
    } catch {}
  }
  if (!startMs) return false;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return (Date.now() - startMs) > THIRTY_DAYS_MS;
};

export const hasBusinessAccess = (): boolean => {
  const plan = getEffectivePlan();
  const user = getAuthUser();
  const premium = !!(user && user.premium_package);
  if (premium) return true;
  if (plan === 'monthly' || plan === 'yearly') return true;
  // Free plan: allowed only within 30 days window
  if (plan === 'free') return !isFreeExpired();
  return false;
};

export const isBusinessOrPhotographer = (): boolean => {
  const role = (getAuthUser()?.role || '').toString().toLowerCase();
  return role === 'business' || role === 'photographer';
};
