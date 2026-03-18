import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Indicar Amigo",
  description: "Indique amigos para o PromoSnap e ganhe beneficios.",
  robots: { index: false, follow: false }, // Página de CTA de referral — sem valor orgânico
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
