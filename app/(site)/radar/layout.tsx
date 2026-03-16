import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Radar de Precos",
  description: "Acompanhe precos e receba alertas de queda no PromoSnap.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
