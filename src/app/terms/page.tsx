import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function TermsPage() {
  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: December 19, 2025</p>

          <div className="space-y-6 text-gray-700">
            <p>
              By using sigzagphoto, you agree to these Terms. If you do not agree, do not use the service.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and for all activities that occur under it.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Content</h2>
            <p>
              You retain ownership of content you upload. You grant us a limited license to host and display your content on the platform.
              You must have rights to all content you upload.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Payments</h2>
            <p>
              Purchases and payouts (if applicable) are subject to our payment policies and provider terms.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Prohibited Use</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Illegal activities or violations of others’ rights.</li>
              <li>Uploading malware or abusive content.</li>
              <li>Interfering with platform operations or security.</li>
            </ul>
            <h2 className="text-2xl font-semibold text-gray-900">Termination</h2>
            <p>
              We may suspend or terminate accounts that violate these Terms or applicable laws.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Disclaimers</h2>
            <p>
              The service is provided “as is” without warranties of any kind. We do not guarantee uninterrupted or error-free operation.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, we are not liable for indirect, incidental, or consequential damages.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Changes</h2>
            <p>
              We may modify these Terms. Continued use after changes constitutes acceptance.
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">Contact</h2>
            <p>
              Questions? Contact hello@sigzagphoto.com.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
