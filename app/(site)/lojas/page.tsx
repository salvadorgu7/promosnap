import Link from "next/link";
import { Store, ExternalLink } from "lucide-react";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({ title: "Lojas Parceiras", path: "/lojas" });

const stores = [
  { name: "Amazon Brasil", slug: "amazon-br", description: "A maior loja online do mundo. Produtos originais e frete grátis para Prime.", url: "https://www.amazon.com.br", gradient: "from-accent-orange/10 to-accent-orange/5", border: "border-accent-orange/20" },
  { name: "Mercado Livre", slug: "mercadolivre", description: "O maior marketplace da América Latina. Milhões de produtos e Mercado Envios.", url: "https://www.mercadolivre.com.br", gradient: "from-accent-yellow/10 to-accent-yellow/5", border: "border-accent-yellow/20" },
  { name: "Shopee", slug: "shopee", description: "Frete grátis, cupons e promoções diárias em milhares de categorias.", url: "https://shopee.com.br", gradient: "from-accent-red/10 to-accent-red/5", border: "border-accent-red/20" },
  { name: "Shein", slug: "shein", description: "Moda acessível com entrega internacional. Roupas, acessórios e mais.", url: "https://br.shein.com", gradient: "from-accent-purple/10 to-accent-purple/5", border: "border-accent-purple/20" },
];

export default function LojasPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Store className="h-6 w-6 text-accent-purple" />
        <div>
          <h1 className="text-3xl font-bold font-display text-surface-900">Lojas Parceiras</h1>
          <p className="text-sm text-surface-500">Comparamos preços das maiores lojas do Brasil</p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {stores.map((s) => (
          <div key={s.slug} className={`card p-6 bg-gradient-to-br ${s.gradient} ${s.border}`}>
            <h2 className="text-xl font-bold font-display text-surface-900 mb-2">{s.name}</h2>
            <p className="text-sm text-surface-600 mb-4 leading-relaxed">{s.description}</p>
            <div className="flex gap-2">
              <Link href={`/busca?source=${s.slug}`} className="btn-secondary text-sm">Ver ofertas</Link>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm">
                <ExternalLink className="h-3.5 w-3.5" /> Visitar
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
