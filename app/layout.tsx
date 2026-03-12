import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "PromoSnap — Ofertas reais, preço de verdade", template: "%s | PromoSnap" },
  description: "Encontre as melhores ofertas, compare preços e economize de verdade. Histórico real de preços, cupons e os produtos mais vendidos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
