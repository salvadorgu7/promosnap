"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Newsletter from "@/components/home/Newsletter";

const WHATSAPP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_LINK;
const TELEGRAM_LINK = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID
  ? `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID}`
  : null;

const LINKS = {
  "Ofertas": [
    { href: "/ofertas", label: "Ofertas Quentes" },
    { href: "/queda-de-preco", label: "Queda de Preço" },
    { href: "/menor-preco", label: "Menor Preço Histórico" },
    { href: "/mais-vendidos", label: "Mais Vendidos" },
    { href: "/mais-buscados", label: "Mais Buscados" },
    { href: "/cupons", label: "Cupons de Desconto" },
    { href: "/categorias", label: "Todas as Categorias" },
    { href: "/marcas", label: "Marcas" },
  ],
  "Lojas": [
    { href: "/busca?source=amazon-br", label: "Amazon Brasil" },
    { href: "/busca?source=mercadolivre", label: "Mercado Livre" },
    { href: "/busca?source=shopee", label: "Shopee" },
    { href: "/busca?source=shein", label: "Shein" },
    { href: "/como-funciona", label: "Como Comparamos" },
    { href: "/transparencia", label: "Transparência" },
  ],
  "Conta": [
    { href: "/minha-conta", label: "Minha Conta" },
    { href: "/favoritos", label: "Meus Favoritos" },
    { href: "/alertas", label: "Alertas de Preço" },
    { href: "/sobre", label: "Sobre o PromoSnap" },
    { href: "/politica-privacidade", label: "Privacidade" },
    { href: "/termos", label: "Termos de Uso" },
  ],
};

export default function Footer() {
  return (
    <footer className="mt-12 pb-16 md:pb-0 relative overflow-hidden">
      {/* Top gradient divider */}
      <div className="section-divider" />
      {/* Rich gradient background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, #F6F7FB 0%, #F1F4FA 50%, #F1F4FA 100%)",
        }}
      />
      <div className="absolute bottom-0 left-0 w-[500px] h-[200px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.05), transparent 70%)", filter: "blur(60px)" }}
      />
      <div className="absolute top-0 right-0 w-[300px] h-[150px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(124,77,255,0.04), transparent 70%)", filter: "blur(50px)" }}
      />

      {/* Compact newsletter bar */}
      <Newsletter variant="compact" />

      <div className="relative max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex mb-3 group">
              <Logo size="md" />
            </Link>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              Compare preços entre Amazon, Mercado Livre, Shopee e Shein. Histórico de 90 dias, score de oferta e alertas de queda.
            </p>
            <p className="text-xs text-surface-400 font-medium tracking-wide">promosnap.com.br</p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-display font-semibold text-sm text-text-primary mb-3 tracking-tight">
                {title}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted hover:text-brand-600 transition-colors duration-200 inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Community / Social links */}
        {(WHATSAPP_LINK || TELEGRAM_LINK) && (
          <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(124,58,237,0.10)" }}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <span className="text-sm font-semibold text-text-primary">Receba ofertas:</span>
              <div className="flex items-center gap-2">
                {WHATSAPP_LINK && (
                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 text-sm font-medium text-[#25D366] hover:bg-[#25D366]/15 hover:border-[#25D366]/30 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                )}
                {TELEGRAM_LINK && (
                  <a
                    href={TELEGRAM_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0088cc]/10 border border-[#0088cc]/20 text-sm font-medium text-[#0088cc] hover:bg-[#0088cc]/15 hover:border-[#0088cc]/30 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Telegram
                  </a>
                )}
                <Link
                  href="/canais"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-sm font-medium text-brand-500 hover:bg-brand-500/15 hover:border-brand-500/30 transition-all"
                >
                  Ver todos os canais
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Affiliate disclaimer */}
        <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(124,58,237,0.10)" }}>
          <p className="text-xs text-surface-400 leading-relaxed max-w-3xl mb-4">
            O PromoSnap pode receber comissões por compras realizadas através de links de afiliado.
            Isso não afeta o preço que você paga e nos ajuda a manter o serviço gratuito.
            Todos os preços exibidos são obtidos automaticamente e podem variar sem aviso prévio.
            Verifique sempre o valor final na loja antes de concluir sua compra.
          </p>
        </div>

        {/* Bottom bar: legal links + copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center gap-4 text-xs text-surface-400">
            <Link
              href="/politica-privacidade"
              className="hover:text-brand-600 transition-colors duration-200"
            >
              Política de Privacidade
            </Link>
            <Link
              href="/termos"
              className="hover:text-brand-600 transition-colors duration-200"
            >
              Termos de Uso
            </Link>
            <Link
              href="/transparencia"
              className="hover:text-brand-600 transition-colors duration-200"
            >
              Transparência
            </Link>
          </div>
          <p className="text-xs text-surface-400 text-center">
            &copy; {new Date().getFullYear()} PromoSnap. Preços e disponibilidade podem variar.
          </p>
        </div>
      </div>
    </footer>
  );
}
