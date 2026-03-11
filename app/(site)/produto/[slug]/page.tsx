import Link from "next/link";
import { ExternalLink, ShoppingCart, Star, BarChart3, ChevronRight, Store, Shield } from "lucide-react";
import PriceChart from "@/components/charts/PriceChart";
import { buildMetadata, productSchema, breadcrumbSchema } from "@/lib/seo/metadata";
import { formatPrice } from "@/lib/utils";
import type { PriceHistoryPoint, PriceStats } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = slug.replace(/-/g, " ");
  return buildMetadata({ title: `${name} - Melhor Preço`, path: `/produto/${slug}` });
}

const mockOffers = [
  { id: "1", sourceName: "Amazon", sourceSlug: "amazon-br", seller: "Amazon.com.br", price: 4299, originalPrice: 5999, isFreeShipping: true, rating: 4.7, reviewsCount: 1230, affiliateUrl: "#", offerScore: 92 },
  { id: "2", sourceName: "Mercado Livre", sourceSlug: "mercadolivre", seller: "ML Store Oficial", price: 4399, originalPrice: 5899, isFreeShipping: true, rating: 4.5, reviewsCount: 890, affiliateUrl: "#", offerScore: 87 },
  { id: "3", sourceName: "Shopee", sourceSlug: "shopee", seller: "Shopee Mall", price: 4499, originalPrice: 5999, isFreeShipping: false, rating: 4.3, reviewsCount: 320, affiliateUrl: "#", offerScore: 78 },
];

const mockHistory: PriceHistoryPoint[] = Array.from({ length: 90 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - (89 - i));
  return { date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), price: Math.round(4800 + Math.sin(i / 10) * 400 + Math.random() * 200) };
});

const mockStats: PriceStats = { current: 4299, min30d: 4199, max30d: 5200, avg30d: 4650, min90d: 4199, max90d: 5999, avg90d: 4900, allTimeMin: 4099, trend: "down" };

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = { name: "iPhone 15 128GB Azul", brand: "Apple", category: "Celulares", categorySlug: "eletronicos", imageUrl: "", description: "O iPhone 15 traz o chip A16 Bionic, câmera de 48MP, Dynamic Island e conector USB-C.", specs: { Tela: '6.1" Super Retina XDR', Chip: "A16 Bionic", Câmera: "48MP + 12MP", Armazenamento: "128GB" } };
  const bestPrice = Math.min(...mockOffers.map((o) => o.price));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-1 text-xs text-text-muted mb-6">
        <Link href="/" className="hover:text-text-secondary">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/categoria/${product.categorySlug}`} className="hover:text-text-secondary">{product.category}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text-secondary">{product.brand}</span>
      </nav>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema({ name: product.name, description: product.description, brand: product.brand, offers: mockOffers.map((o) => ({ price: o.price, url: o.affiliateUrl, seller: o.seller, availability: "InStock" })) })) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([{ name: "Home", url: "/" }, { name: product.category, url: `/categoria/${product.categorySlug}` }, { name: product.name, url: `/produto/${slug}` }])) }} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Image + Specs */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card aspect-square flex items-center justify-center p-8">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <ShoppingCart className="h-24 w-24 text-surface-300" />
            )}
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Especificações</h3>
            <div className="space-y-2">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-text-muted">{k}</span>
                  <span className="text-text-secondary font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Info + Offers + Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">{product.brand}</span>
              <span className="badge-lowest">📉 Preço em queda</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary mb-2">{product.name}</h1>
            <p className="text-sm text-text-secondary leading-relaxed">{product.description}</p>
          </div>

          {/* Best price */}
          <div className="card p-5 border-accent-blue/30 bg-accent-blue/5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-text-muted mb-1">Melhor preço encontrado</p>
                <p className="text-3xl font-bold text-accent-blue font-display">{formatPrice(bestPrice)}</p>
                <p className="text-xs text-text-muted mt-1">em {mockOffers.find((o) => o.price === bestPrice)?.sourceName}</p>
              </div>
              <a href={mockOffers.find((o) => o.price === bestPrice)?.affiliateUrl || "#"} target="_blank" rel="noopener noreferrer nofollow" className="btn-primary">
                <ExternalLink className="h-4 w-4" /> Ver Oferta
              </a>
            </div>
          </div>

          {/* Price comparison */}
          <div>
            <h2 className="text-lg font-bold font-display text-text-primary mb-3 flex items-center gap-2">
              <Store className="h-4 w-4 text-text-muted" /> Comparar Preços ({mockOffers.length} lojas)
            </h2>
            <div className="space-y-2">
              {mockOffers.sort((a, b) => a.price - b.price).map((offer, i) => (
                <div key={offer.id} className={`card flex items-center gap-4 p-4 ${i === 0 ? "border-accent-blue/30 bg-accent-blue/5" : ""}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-accent-blue text-white" : "bg-surface-100 text-text-muted"}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">{offer.sourceName}</p>
                    <p className="text-xs text-text-muted">{offer.seller}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {offer.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-accent-orange">
                          <Star className="h-3 w-3 fill-current" /> {offer.rating}
                        </span>
                      )}
                      {offer.isFreeShipping && <span className="badge-shipping text-[10px] px-1.5 py-0">Frete grátis</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    {offer.originalPrice && <p className="text-xs text-text-muted line-through">{formatPrice(offer.originalPrice)}</p>}
                    <p className={`text-lg font-bold font-display ${i === 0 ? "text-accent-blue" : "text-text-primary"}`}>{formatPrice(offer.price)}</p>
                  </div>
                  <a href={offer.affiliateUrl} target="_blank" rel="noopener noreferrer nofollow" className={i === 0 ? "btn-primary text-sm py-2" : "btn-secondary text-sm py-2"}>
                    <ExternalLink className="h-3.5 w-3.5" /> Ver
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Price history */}
          <div>
            <h2 className="text-lg font-bold font-display text-text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-text-muted" /> Histórico de Preço
            </h2>
            <PriceChart data={mockHistory} stats={mockStats} />
          </div>

          {/* Trust */}
          <div className="card p-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-accent-blue flex-shrink-0" />
            <p className="text-xs text-text-muted leading-relaxed">
              Os preços são atualizados periodicamente. O PromoSnap não vende produtos — ao clicar em &ldquo;Ver Oferta&rdquo;, você é redirecionado para a loja parceira. Podemos receber comissões por compras via links.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
