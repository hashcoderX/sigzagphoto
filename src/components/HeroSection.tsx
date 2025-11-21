'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight, Camera, Users, TrendingUp } from 'lucide-react';

const slides = [
  {
    id: 1,
    title: 'Capture, Create, Sell',
    subtitle: 'on sigzagphoto',
    description: 'Connect with millions of photographers, showcase your portfolio, and sell your photos to buyers worldwide',
    backgroundImage: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&h=800&fit=crop&q=80',
    stats: [
      { value: '10M+', label: 'Photos Uploaded' },
      { value: '500K+', label: 'Photographers' },
      { value: '150+', label: 'Countries' },
    ],
  },
  {
    id: 2,
    title: 'Studio Management',
    subtitle: 'Professional Tools for Photographers',
    description: 'Manage your photography business with advanced tools for client management, project tracking, and workflow automation',
    backgroundImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=800&fit=crop&q=80',
    stats: [
      { value: 'Smart', label: 'Client Management' },
      { value: 'Automated', label: 'Workflow' },
      { value: 'Integrated', label: 'Tools' },
    ],
  },
  {
    id: 3,
    title: 'Photographer Suite',
    subtitle: 'AI-Powered Enhancement',
    description: 'Enhance your photos with cutting-edge AI tools, create stunning portfolios, and grow your photography career',
    backgroundImage: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&h=800&fit=crop&q=80',
    stats: [
      { value: 'AI', label: 'Enhancement' },
      { value: 'Pro', label: 'Portfolios' },
      { value: 'Global', label: 'Reach' },
    ],
  },
  {
    id: 4,
    title: 'Marketplace Success',
    subtitle: 'Sell Worldwide',
    description: 'Turn your passion into profit with our global marketplace. Reach buyers in every corner of the world',
    backgroundImage: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=800&fit=crop&q=80',
    stats: [
      { value: 'Global', label: 'Marketplace' },
      { value: 'Instant', label: 'Sales' },
      { value: 'Secure', label: 'Payments' },
    ],
  },
];

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  const goToSlide = (index: number) => setCurrentSlide(index);

  const slide = slides[currentSlide];
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-gradient-to-br from-[#6C63FF] via-[#FF6B6B] to-[#FFD93D]"
        />
      </AnimatePresence>
      
      {/* Background Image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.backgroundImage}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.3, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0 bg-cover bg-center opacity-30 md:opacity-100 md:mix-blend-overlay"
          style={{
            backgroundImage: `url(${slide.backgroundImage})`,
          }}
        />
      </AnimatePresence>

      {/* Floating Elements */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-20 left-10 w-20 h-20 bg-white/20 rounded-full blur-xl"
      />
      <motion.div
        animate={{
          y: [0, 20, 0],
          rotate: [0, -5, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-20 right-10 w-32 h-32 bg-white/20 rounded-full blur-xl"
      />

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
            >
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Welcome to sigzagphoto</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              {slide.title}
              <br />
              <span className="bg-white text-transparent bg-clip-text">
                {slide.subtitle}
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              {slide.description}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link href="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-[#6C63FF] px-8 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-white/50 transition-all flex items-center space-x-2 group"
                >
                  <span>Join Now</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>
              <Link href="/gallery">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/20 backdrop-blur-sm text-white px-8 py-4 rounded-full font-bold text-lg border-2 border-white hover:bg-white hover:text-[#6C63FF] transition-all"
                >
                  Explore Photos
                </motion.button>
              </Link>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto"
            >
              {slide.stats.map((stat, index) => (
                <div key={index} className="text-white">
                  <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                  <div className="text-white/80 text-sm md:text-base">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? 'bg-white' : 'bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1 h-2 bg-white rounded-full mt-2"
          />
        </div>
      </motion.div>
    </section>
  );
}
