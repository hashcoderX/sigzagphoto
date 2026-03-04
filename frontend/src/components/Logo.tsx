"use client";

import Link from "next/link";
import { Pacifico } from "next/font/google";

const pacifico = Pacifico({ weight: "400", subsets: ["latin"], display: "swap" });

export default function Logo({ href = "/", showText = true }: { href?: string; showText?: boolean }) {
  return (
    <Link href={href} className="flex items-center space-x-2 group" aria-label="sigzagphoto home">
      <div className="relative p-2 rounded-lg group-hover:scale-110 transition-transform"
           style={{ background: "linear-gradient(90deg, #6C63FF 0%, #FF6B6B 100%)" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1.5" y="1.5" width="21" height="21" rx="6" stroke="white" strokeOpacity="0.35"/>
          <polyline points="6,8 10,12 7.5,12 13,18 10.5,18 16,22"
            fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {showText && (
        <span className={`${pacifico.className} text-2xl font-normal leading-none bg-clip-text text-transparent`}
              style={{ backgroundImage: "linear-gradient(90deg, #6C63FF 0%, #FF6B6B 100%)" }}>
          sigzagphoto
        </span>
      )}
    </Link>
  );
}
