'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';
import { getEffectivePlan, isFreeExpired } from '@/lib/access';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/gallery', label: 'Explore' },
    // Pricing temporarily hidden
    // { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact' },
  ];

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      setAuthed(false);
      setDisplayName(null);
      return;
    }
    setAuthed(true);
    // Try cached user first
    const cached = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    if (cached) {
      try {
        const u = JSON.parse(cached);
        if (u?.name) setDisplayName(u.name as string);
        if (u?.role) setRole(String(u.role));
      } catch {}
    }
    // Ensure fresh name from /api/me
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.name) setDisplayName(data.name as string);
        if (data?.role) setRole(String(data.role));
        localStorage.setItem('auth_user', JSON.stringify(data));
        // After syncing user, enforce free-plan 30 day expiry without middleware
        const plan = getEffectivePlan();
        if (plan === 'free' && isFreeExpired()) {
          // Expire login: clear token and redirect to upgrade
          try {
            localStorage.removeItem('auth_token');
          } catch {}
          router.replace('/pricing');
          return;
        }
      } catch {}
    })();
  }, []);

  const handleLogout = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    try {
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/logout`, {
          method: 'POST',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
    setAuthed(false);
    setDisplayName(null);
    router.replace('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-[#6C63FF] transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA / User */}
          <div className="hidden md:flex items-center space-x-4">
            {!authed ? (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-[#6C63FF] transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white px-6 py-2 rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all"
                >
                  Join Now
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                {role && ['business','studio','photographer'].includes(role.toLowerCase()) && (
                  <Link
                    href="/dashboard/admin"
                    className="flex items-center gap-2 px-3 py-2 rounded-full border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-pink-50 hover:border-indigo-400 hover:shadow-md transition group"
                    aria-label="Go to Admin Dashboard"
                  >
                    <span className="text-[10px] font-semibold tracking-wide uppercase bg-gradient-to-r from-indigo-600 to-pink-600 text-transparent bg-clip-text">
                      Admin
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-bold shadow group-hover:scale-105 transition">
                      {role.toLowerCase() === 'photographer' ? 'Photographer' : role.toLowerCase() === 'business' ? 'Business' : role}
                    </span>
                  </Link>
                )}
                <Link href="/profile" className="flex items-center space-x-2 px-3 py-2 rounded-full border-2 border-gray-100 hover:border-[#6C63FF] transition">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white flex items-center justify-center text-xs font-semibold">
                    {(displayName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-800 font-medium max-w-[160px] truncate">{displayName || 'Account'}</span>
                </Link>
                <button onClick={handleLogout} className="text-gray-600 hover:text-[#FF6B6B] font-medium">Logout</button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 hover:text-[#6C63FF] transition-all duration-300 shadow-sm hover:shadow-md border border-gray-200 hover:border-[#6C63FF]/30 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/50"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.div>
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-gray-700 hover:text-[#6C63FF] transition-colors font-medium py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {!authed ? (
                <>
                  <Link
                    href="/login"
                    className="block text-gray-700 hover:text-[#6C63FF] transition-colors font-medium py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="block bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white px-6 py-3 rounded-full font-semibold text-center"
                    onClick={() => setIsOpen(false)}
                  >
                    Join Now
                  </Link>
                </>
              ) : (
                <>
                  {role && ['business','studio','photographer'].includes(role.toLowerCase()) && (
                    <Link
                      href="/dashboard/admin"
                      className="block text-gray-700 hover:text-[#6C63FF] transition-colors font-medium py-2"
                      aria-label="Go to Admin Dashboard"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin Dashboard ({role})
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="block text-gray-700 hover:text-[#6C63FF] transition-colors font-medium py-2"
                    onClick={() => setIsOpen(false)}
                  >
                    {displayName || 'Profile'}
                  </Link>
                  <button
                    onClick={() => { setIsOpen(false); handleLogout(); }}
                    className="block w-full text-left text-gray-700 hover:text-[#FF6B6B] transition-colors font-medium py-2"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
