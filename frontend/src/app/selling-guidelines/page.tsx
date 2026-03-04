import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function SellingGuidelinesPage() {
  return (
    <main>
      <Navbar />
      <section className="pt-24 pb-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Selling Guidelines</h1>
          <p className="text-gray-600 mb-8">Last updated: December 19, 2025</p>

          <div className="space-y-8 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Getting Started</h2>
              <p>
                To sell on sigzagphoto, create an account as a Photographer or Business, complete your profile, and upload
                high‑quality images that meet our technical and legal requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Quality Standards</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Minimum resolution: 2000px on the shortest side (higher preferred).</li>
                <li>Sharp focus, correct exposure, and accurate colors.</li>
                <li>No watermarks, borders, or excessive compression artifacts.</li>
                <li>Clear, descriptive titles and relevant tags/keywords.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Legal Requirements</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must own the rights to all content you upload.</li>
                <li>Model releases are required for recognizable people.</li>
                <li>Property releases may be required for private locations, artworks, or trademarks.</li>
                <li>No copyrighted or trademarked content unless you have permission.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Prohibited Content</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Illegal, hateful, sexually explicit, or violent content.</li>
                <li>Images that violate privacy or depict unlawful activity.</li>
                <li>Misleading metadata or spammy keywording.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Pricing & Licensing</h2>
              <p>
                Pricing may be set by you or the platform depending on the category. Unless otherwise stated, images are
                licensed for standard commercial and editorial uses. Buyers must follow the license terms and usage limits.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Review & Approval</h2>
              <p>
                Submissions may be reviewed for quality, legal compliance, and relevance. We reserve the right to approve,
                reject, or remove content that does not meet our standards.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Payments & Taxes</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Earnings are paid out according to your selected payout method.</li>
                <li>You are responsible for any applicable taxes in your jurisdiction.</li>
                <li>Chargebacks or fraud may lead to payout holds or account review.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Takedowns & Disputes</h2>
              <p>
                If you believe content infringes your rights, contact us with details for review. We may remove content and
                notify the uploader as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Best Practices</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Upload cohesive sets and keep portfolios curated.</li>
                <li>Use clear titles, accurate tags, and relevant categories.</li>
                <li>Provide releases proactively to speed up approvals.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Contact</h2>
              <p>Questions about selling? Reach us at hello@sigzagphoto.com.</p>
            </section>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
