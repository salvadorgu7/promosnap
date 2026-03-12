import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
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
    default: "PromoSnap — Ofertas reais, preco de verdade",
    template: "%s | PromoSnap",
  },
  description:
    "Encontre as melhores ofertas, compare precos e economize de verdade. Historico real de precos, cupons e os produtos mais vendidos.",
  metadataBase: new URL(
    process.env.APP_URL || "https://promosnap.com.br"
  ),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "PromoSnap",
    title: "PromoSnap — Ofertas reais, preco de verdade",
    description:
      "Encontre as melhores ofertas, compare precos e economize de verdade.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PromoSnap",
    description:
      "Ofertas reais, preco de verdade. Compare precos e economize.",
  },
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
  themeColor: "#4f46e5",
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
      <body className="min-h-screen font-sans antialiased">
        <GoogleAnalytics />
        {children}
      </body>
    </html>
  );
}
