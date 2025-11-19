'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, Download, Eye } from 'lucide-react';
import { useState } from 'react';

interface PhotoCardProps {
  id: string;
  imageUrl: string;
  title: string;
  photographer: string;
  price?: number;
  views?: number;
  downloads?: number;
  likes?: number;
  onClick?: () => void;
  onDownload?: () => void;
  onLike?: () => void;
  detailsUrl?: string;
}

export default function PhotoCard({
  imageUrl,
  title,
  photographer,
  price,
  views = 0,
  downloads = 0,
  likes = 0,
  onClick,
  onDownload,
  onLike,
  detailsUrl,
}: PhotoCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const isExternal = typeof imageUrl === 'string' && (
    imageUrl.startsWith('https://source.unsplash.com') ||
    imageUrl.includes('picsum.photos') ||
    imageUrl.includes('images.unsplash.com')
  );

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {isExternal ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
            }}
          />
        ) : (
          <Image
            src={imageUrl}
            alt={title}
            fill
            unoptimized
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                const next = !isLiked;
                setIsLiked(next);
                if (onLike && next) onLike();
              }}
              className="bg-white/90 p-3 rounded-full hover:bg-white transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`}
              />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                if (onDownload) onDownload();
              }}
              className="bg-white/90 p-3 rounded-full hover:bg-white transition-colors"
            >
              <Download className="w-5 h-5 text-gray-700" />
            </motion.button>
            {/* Removed details button per request */}
          </div>
        </div>

        {/* Price Tag */}
        {price && (
          <div className="absolute top-3 right-3 bg-[#FFD93D] text-gray-900 px-3 py-1 rounded-full font-semibold text-sm">
            ${price}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
          {title}
        </h3>
        {photographer && <p className="text-sm text-gray-600 mb-3">by {photographer}</p>}
        
        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Eye className="w-4 h-4" />
            <span>{new Intl.NumberFormat('en-US').format(views)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Download className="w-4 h-4" />
            <span>{new Intl.NumberFormat('en-US').format(downloads)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Heart className="w-4 h-4" />
            <span>{new Intl.NumberFormat('en-US').format(likes)}</span>
          </div>
        </div>

        {/* Details button removed */}
      </div>
    </motion.div>
  );
}
