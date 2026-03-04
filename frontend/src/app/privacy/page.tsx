import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: December 19, 2025</p>

          <div className="space-y-6 text-gray-700">
            <p>
              We value your privacy. This Privacy Policy explains what information we collect, how we use it,
              and your rights regarding your personal data when using sigzagphoto.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account data such as name, email, password, and role.</li>
              <li>Profile details you provide (phone, country, website, address, currency).</li>
              <li>Usage information such as pages viewed, interactions, and device data.</li>
            </ul>
            <h2 className="text-2xl font-semibold text-gray-900">How We Use Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and improve our services, including authentication and personalization.</li>
              <li>To communicate with you about updates, security, and support.</li>
              <li>To maintain safety, prevent fraud, and comply with legal obligations.</li>
            </ul>
            <h2 className="text-2xl font-semibold text-gray-900">Sharing of Information</h2>
            <p>
              We do not sell your personal information. We may share data with service providers under contract
              (e.g., hosting, analytics, payments) and when required by law.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Your Rights</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access, update, or delete your account information.</li>
              <li>Opt out of non-essential communications.</li>
              <li>Request a copy of your data subject to verification.</li>
            </ul>
            <h2 className="text-2xl font-semibold text-gray-900">Contact</h2>
            <p>
              If you have questions, contact us at hello@sigzagphoto.com.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
