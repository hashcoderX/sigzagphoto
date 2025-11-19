'use client';

import { motion } from 'framer-motion';
import { Users, Target, Award, Heart, TrendingUp, Globe } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Image from 'next/image';

export default function AboutPage() {
  const stats = [
    { value: '10M+', label: 'Photos Uploaded' },
    { value: '500K+', label: 'Active Photographers' },
    { value: '150+', label: 'Countries' },
    { value: '5M+', label: 'Happy Customers' },
  ];

  const values = [
    {
      icon: Heart,
      title: 'Community First',
      description: 'We believe in building a supportive community where photographers can thrive and connect.',
    },
    {
      icon: Award,
      title: 'Quality Standards',
      description: 'We maintain high standards to ensure every photo meets professional quality expectations.',
    },
    {
      icon: Globe,
      title: 'Global Reach',
      description: 'Connect with photographers and buyers from every corner of the world.',
    },
    {
      icon: TrendingUp,
      title: 'Growth Focused',
      description: 'We provide tools and resources to help photographers grow their business.',
    },
  ];

  return (
    <main>
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-[#6C63FF] to-[#FF6B6B] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              About sigzagphoto
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
              Empowering photographers worldwide to showcase their talent and build successful careers
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center space-x-3 mb-6">
                <Target className="w-8 h-8 text-[#6C63FF]" />
                <h2 className="text-4xl font-bold text-gray-900">Our Mission</h2>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                At sigzagphoto, we're on a mission to create the world's most supportive and innovative platform for photographers. We believe that every photographer deserves a space where they can showcase their work, connect with like-minded artists, and monetize their creativity.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                Since our founding, we've helped over 500,000 photographers from 150+ countries reach a global audience and build sustainable photography businesses. Whether you're a hobbyist or a professional, we provide the tools, community, and marketplace you need to succeed.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative h-96 rounded-2xl overflow-hidden shadow-2xl"
            >
              <Image
                src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&h=600&fit=crop"
                alt="Photography community"
                fill
                className="object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-700 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Our Core Values
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl"
              >
                <div className="bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Users className="w-10 h-10 text-[#6C63FF]" />
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                Built by Photographers, For Photographers
              </h2>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our team consists of passionate photographers, designers, and developers who understand the challenges and opportunities in the photography industry. We're here to help you succeed.
            </p>
          </motion.div>

          <div className="bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] p-12 rounded-3xl text-center text-white">
            <h3 className="text-3xl font-bold mb-4">Join Our Growing Community</h3>
            <p className="text-xl mb-8 text-white/90">
              Be part of something bigger. Start your photography journey with us today.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-[#6C63FF] px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all"
              onClick={() => window.location.href = '/register'}
            >
              Get Started Now
            </motion.button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
