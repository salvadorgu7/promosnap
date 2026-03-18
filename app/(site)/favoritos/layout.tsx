import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Meus Favoritos",
  description: "Seus produtos favoritos salvos no PromoSnap.",
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
