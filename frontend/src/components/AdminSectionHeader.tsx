"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface AdminSectionHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  children?: React.ReactNode;
  className?: string;
  headingId?: string;
}

/**
 * Reusable gradient / glass section header for admin pages.
 * Provides accessible structure, consistent styling, and slot for action controls.
 */
export default function AdminSectionHeader({
  title,
  subtitle,
  backHref = "/dashboard/admin",
  children,
  className = "",
  headingId = "section-heading"
}: AdminSectionHeaderProps) {
  const router = useRouter();
  return (
    <div
      role="region"
      aria-labelledby={headingId}
      className={`relative mb-8 ${className}`}
      suppressHydrationWarning
    >
      <div className="group rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-[2px] shadow-xl focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-300">
        <div className="rounded-3xl bg-white/10 backdrop-blur-xl px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6" suppressHydrationWarning>
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => router.push(backHref)}
              className="transition-all duration-200 bg-white/15 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-inner"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="min-w-0">
              <h1
                id={headingId}
                className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm"
              >
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-indigo-100 mt-1 leading-relaxed">{subtitle}</p>
              )}
            </div>
          </div>
          {children && (
            <div className="flex flex-wrap gap-3 items-start" aria-label={`${title} actions`}>
              {children}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          .group * { transition: none !important; animation: none !important; }
        }
      `}</style>
    </div>
  );
}