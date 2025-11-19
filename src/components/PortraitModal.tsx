"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Sparkles, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";

export type PortraitPhoto = {
  id: number | string;
  title: string;
  description?: string;
  url: string;
  photographer?: string;
  category?: string;
  is_free?: boolean;
  price?: number | null;
};

interface PortraitModalProps {
  open: boolean;
  photo?: PortraitPhoto | null;
  onClose: () => void;
  onDownload: () => void;
  onCheckout: () => void;
  onAIEnhance?: () => Promise<string> | string;
}

export default function PortraitModal({ open, photo, onClose, onDownload, onCheckout, onAIEnhance }: PortraitModalProps) {
  const isPaid = !!photo && photo.is_free === false;
  const isExternal = !!photo && (String(photo.id).startsWith('preview:') || String(photo.id).startsWith('homepreview:') || String(photo.id).startsWith('unsrc:'));
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | undefined>(photo?.url);

  // Sync displayed image when the modal opens with a new photo
  useEffect(() => {
    setDisplayUrl(photo?.url);
  }, [photo?.id, photo?.url, open]);

  // Enhanced handlers with loading states
  const handleAIEnhance = async () => {
    if (!photo || !onAIEnhance || isExternal) return;
    setProcessingAction('enhance');
    try {
      const result = onAIEnhance();
      const url = typeof result === 'string' ? result : await result;
      if (url) setDisplayUrl(url);
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <AnimatePresence>
      {open && photo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          aria-modal
          role="dialog"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full max-w-3xl rounded-2xl bg-neutral-900 text-white overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="text-xs uppercase tracking-wider text-white/70">AI-generated</div>
              <button className="p-2 rounded-md hover:bg-white/10" onClick={onClose} aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex flex-col items-center">
                <div className="w-full max-w-2xl rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={displayUrl || photo.url} alt={photo.title} className="w-full h-auto object-contain bg-black/20" />
                </div>
                <div className="w-full max-w-2xl mt-4">
                  <div className="text-sm text-white/70">
                    <div className="font-semibold text-white mb-1">{photo.title}</div>
                    {photo.description && <div className="text-xs leading-relaxed">{photo.description}</div>}
                  </div>
                </div>

                <div className="w-full max-w-2xl mt-5 flex flex-wrap items-center gap-3 justify-center">
                  {isPaid ? (
                    <>
                      <div className="px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-sm border border-white/10">
                        Paid {photo.price ? `( $${Number(photo.price).toFixed(2)} )` : ""}
                      </div>
                      <button onClick={onCheckout} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold shadow">
                        Proceed to Checkout
                      </button>
                    </>
                  ) : (
                    <button onClick={onDownload} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold shadow">
                      <Download className="w-4 h-4" /> Download
                    </button>
                  )}
                  
                  <button 
                    onClick={handleAIEnhance} 
                    disabled={processingAction === 'enhance' || isExternal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingAction === 'enhance' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {processingAction === 'enhance' ? 'Enhancing...' : 'AI Enhance'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
