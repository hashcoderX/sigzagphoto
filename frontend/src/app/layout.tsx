import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import LiveChatButton from '@/components/LiveChatButton';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "sigzagphoto",
  title: {
    default: "sigzagphoto – Creative Photography Marketplace",
    template: "%s | sigzagphoto",
  },
  description: "sigzagphoto connects photographers and buyers worldwide. Upload, showcase, enhance, and sell your photography.",
  keywords: [
    "stock photos", "photography marketplace", "buy photos", "sell photos",
    "portrait photography", "landscape photography", "photo editing", "AI enhance",
  ],
  authors: [{ name: "Sudharma Hewavitharana" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      ['max-snippet']: -1,
      ['max-image-preview']: 'large',
      ['max-video-preview']: -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "sigzagphoto",
    title: "sigzagphoto – Creative Photography Marketplace",
    description: "Upload, showcase, enhance, and sell your photography.",
    images: [
      { url: "/og-default.jpg", width: 1200, height: 630, alt: "sigzagphoto" },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "sigzagphoto – Creative Photography Marketplace",
    description: "Upload, showcase, enhance, and sell your photography.",
    images: ["/og-default.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} ${inter.variable} antialiased`}
        style={{ fontFamily: 'var(--font-poppins)' }}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "sigzagphoto",
            url: siteUrl,
            logo: new URL('/favicon.ico', siteUrl).toString(),
          }) }}
        />
        {children}
        <LiveChatButton />
      </body>
    </html>
  );
}
