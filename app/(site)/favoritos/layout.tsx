import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Meus Favoritos",
  description: "Seus produtos favoritos salvos no PromoSnap.",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
