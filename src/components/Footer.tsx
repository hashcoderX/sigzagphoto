'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Logo showText />
            <p className="text-sm text-gray-400">
              Join the largest photographers community in the world. Showcase your work, connect with buyers, and grow your photography business.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-[#6C63FF] transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-[#FF6B6B] transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-[#6C63FF] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="hover:text-[#FFD93D] transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-[#6C63FF] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-[#6C63FF] transition-colors">
                  Explore Gallery
                </Link>
              </li>
              {/* <li>
                <Link href="/pricing" className="hover:text-[#6C63FF] transition-colors">
                  Pricing Plans
                </Link>
              </li> */}
              <li>
                <Link href="/contact" className="hover:text-[#6C63FF] transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* For Photographers */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">For Photographers</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/register" className="hover:text-[#6C63FF] transition-colors">
                  Join as Photographer
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-[#6C63FF] transition-colors">
                  Register Business
                </Link>
              </li>
              <li>
                <Link href="/selling-guidelines" className="hover:text-[#6C63FF] transition-colors">
                  Selling Guidelines
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-[#6C63FF] transition-colors">
                  Community Forum
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-[#6C63FF]" />
                <span className="text-sm">hello@sigzagphoto.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-[#FF6B6B]" />
                <span className="text-sm">0702932000</span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-[#FFD93D] mt-1" />
                <span className="text-sm">6th floor,JJC,Rajagiriya,Colombo.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-400">
            © 2025 Sudharma. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-sm hover:text-[#6C63FF] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm hover:text-[#6C63FF] transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-sm hover:text-[#6C63FF] transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
