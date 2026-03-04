import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function CookiesPage() {
  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Cookie Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: December 19, 2025</p>

        <div className="space-y-6 text-gray-700">
            <p>
              This Cookie Policy explains how we use cookies and similar technologies on sigzagphoto.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device to remember preferences and improve your experience.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Types of Cookies We Use</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Essential cookies for login and security.</li>
              <li>Preference cookies to remember settings.</li>
              <li>Analytics cookies to understand usage and improve the service.</li>
            </ul>
            <h2 className="text-2xl font-semibold text-gray-900">Managing Cookies</h2>
            <p>
              You can manage or disable cookies in your browser settings. Some features may not function properly if cookies are disabled.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Changes</h2>
            <p>
              We may update this policy from time to time. Please review periodically for updates.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Contact</h2>
            <p>
              For questions about our cookie use, contact hello@sigzagphoto.com.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
