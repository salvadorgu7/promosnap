import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import { getBaseUrl } from "@/lib/seo/url";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PromoSnap — Ofertas reais, preço de verdade",
    template: "%s | PromoSnap",
  },
  description:
    "Encontre as melhores ofertas, compare preços e economize de verdade. Histórico real de preços, cupons e os produtos mais vendidos.",
  metadataBase: new URL(getBaseUrl()),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "PromoSnap",
    title: "PromoSnap — Ofertas reais, preço de verdade",
    description:
      "Encontre as melhores ofertas, compare preços e economize de verdade.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PromoSnap" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PromoSnap",
    description:
      "Ofertas reais, preço de verdade. Compare preços e economize.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: "PromoSnap",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#9333EA",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${plusJakarta.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "PromoSnap",
              url: "https://promosnap.com.br",
              logo: "https://promosnap.com.br/icon-512x512.png",
              description: "Comparador de precos inteligente do Brasil",
              sameAs: [],
            }),
          }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
