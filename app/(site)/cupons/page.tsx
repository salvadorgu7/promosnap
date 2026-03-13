import { Ticket } from "lucide-react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getActiveCoupons } from "@/lib/db/queries";
import CouponFilter from "./CouponFilter";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return buildMetadata({
    title: "Cupons de Desconto",
    description:
      "Cupons de desconto válidos para Amazon, Mercado Livre, Shopee e mais. Copie e economize nas suas compras.",
    path: "/cupons",
  });
}

export default async function CuponsPage() {
  const coupons = await getActiveCoupons();

  const serialized = coupons.map((c: any) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    endAt: c.endAt ? c.endAt.toISOString() : null,
    sourceName: c.source?.name || "Geral",
    sourceSlug: c.source?.slug || "geral",
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Cupons", url: "/cupons" },
            ])
          ),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Cupons de Desconto" },
        ]}
      />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Ticket className="w-7 h-7 text-accent-orange" />
          <h1 className="text-3xl font-bold font-display text-text-primary">
            Cupons de Desconto
          </h1>
        </div>
        <p className="text-sm text-text-muted">
          {serialized.length > 0
            ? `${serialized.length} cupom${serialized.length !== 1 ? "ns" : ""} ativo${serialized.length !== 1 ? "s" : ""} verificado${serialized.length !== 1 ? "s" : ""}`
            : "Nenhum cupom ativo no momento"}
        </p>
      </div>

      {serialized.length > 0 ? (
        <CouponFilter coupons={serialized} />
      ) : (
        <EmptyState
          icon={Ticket}
          title="Nenhum cupom ativo"
          description="Estamos buscando novos cupons. Volte em breve para conferir as novidades!"
          ctaLabel="Ver ofertas"
          ctaHref="/ofertas"
        />
      )}
    </div>
  );
}
