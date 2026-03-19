import { buildMetadata } from "@/lib/seo/metadata"
export const metadata = buildMetadata({ title: "Radar", noIndex: true })
export default function Layout({ children }: { children: React.ReactNode }) { return children }
