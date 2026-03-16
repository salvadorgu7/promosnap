import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Indicar Amigo",
  description: "Indique amigos para o PromoSnap e ganhe beneficios.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
