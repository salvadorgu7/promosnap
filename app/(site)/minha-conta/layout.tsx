import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Minha Conta",
  description: "Gerencie seus favoritos, alertas de preço e preferências no PromoSnap.",
  path: "/minha-conta",
  noIndex: true,
});

export default function MinhaContaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
