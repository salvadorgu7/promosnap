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
    "Compare preços na Amazon, Mercado Livre, Shopee e Magalu. Histórico de 90 dias, alertas de queda e cupons. Economize de verdade com dados reais.",
  metadataBase: new URL(getBaseUrl()),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "PromoSnap",
    title: "PromoSnap — Ofertas reais, preço de verdade",
    description:
      "Encontre as melhores ofertas, compare preços e economize de verdade.",
    images: [{ url: "/og-promosnap.png", width: 1200, height: 630, alt: "PromoSnap — Ofertas que realmente fazem diferença" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PromoSnap",
    description:
      "Ofertas reais, preço de verdade. Compare preços e economize.",
    images: ["/og-promosnap.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-64x64.png", type: "image/png", sizes: "64x64" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
  themeColor: "#0B1020",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const baseUrl = getBaseUrl()
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
              url: baseUrl,
              logo: `${baseUrl}/promosnap-logo-horizontal.png`,
              description: "Comparador de precos inteligente do Brasil. Ofertas reais, preco de verdade.",
              sameAs: [],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "PromoSnap",
              url: baseUrl,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${baseUrl}/busca?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
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
