'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        'Upload up to 50 photos',
        'Basic portfolio page',
        'Community access',
        'Standard photo quality',
        'Email support',
      ],
      cta: 'Get Started',
      popular: false,
      gradient: 'from-gray-400 to-gray-600',
    },
    {
      name: 'Pro',
      price: '$19',
      period: 'per month',
      description: 'For serious photographers',
      features: [
        'Upload unlimited photos',
        'Custom portfolio domain',
        'Priority listing',
        'Advanced analytics',
        'HD photo quality',
        'Priority support',
        'Sell photos commission-free',
        'Watermark removal',
      ],
      cta: 'Start Pro Trial',
      popular: true,
      gradient: 'from-[#6C63FF] to-[#FF6B6B]',
    },
    {
      name: 'Business',
      price: '$49',
      period: 'per month',
      description: 'For studios and agencies',
      features: [
        'Everything in Pro',
        'Team collaboration (up to 10)',
        'Business verification badge',
        'API access',
        'White-label options',
        'Dedicated account manager',
        'Custom licensing terms',
        'Advanced SEO tools',
        'Premium placement',
      ],
      cta: 'Contact Sales',
      popular: false,
      gradient: 'from-[#FFD93D] to-[#FF6B6B]',
    },
  ];

  return (
    <main>
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
              Choose the perfect plan for your photography journey
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative bg-white rounded-3xl shadow-xl ${
                  plan.popular ? 'ring-4 ring-[#6C63FF] scale-105' : ''
                } p-8 hover:shadow-2xl transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white px-6 py-2 rounded-full font-bold text-sm flex items-center space-x-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Most Popular</span>
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  <div className="flex items-baseline justify-center">
                    <span className={`text-5xl font-bold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                      {plan.price}
                    </span>
                    <span className="text-gray-600 ml-2">/{plan.period}</span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <div className={`bg-gradient-to-r ${plan.gradient} p-1 rounded-full mr-3 mt-0.5 flex-shrink-0`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-full py-4 rounded-full font-bold text-lg transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B] text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {plan.cta}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Got questions? We've got answers.
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                q: 'Can I upgrade or downgrade my plan?',
                a: "Yes! You can change your plan at any time. If you upgrade, you'll be charged the prorated difference immediately. If you downgrade, the change will take effect at the end of your current billing period.",
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for Business plans.',
              },
              {
                q: 'Is there a free trial for Pro and Business plans?',
                a: 'Yes! We offer a 14-day free trial for both Pro and Business plans. No credit card required to start your trial.',
              },
              {
                q: 'What happens if I cancel my subscription?',
                a: "You can cancel anytime. Your account will remain active until the end of your current billing period, after which you'll be downgraded to the Free plan.",
              },
              {
                q: 'Do you offer discounts for annual billing?',
                a: 'Yes! Save 20% when you choose annual billing on Pro or Business plans. Contact us for more details.',
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-6 rounded-2xl shadow-md"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {faq.q}
                </h3>
                <p className="text-gray-700">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#6C63FF] to-[#FF6B6B]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of photographers who trust sigzagphoto
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-[#6C63FF] px-10 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition-all"
              onClick={() => window.location.href = '/register'}
            >
              Start Your Free Trial
            </motion.button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
