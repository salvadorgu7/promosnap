"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Newsletter from "@/components/home/Newsletter";

const LINKS = {
  "Navegação": [
    { href: "/ofertas", label: "Ofertas Quentes" },
    { href: "/menor-preco", label: "Menor Preço Histórico" },
    { href: "/mais-vendidos", label: "Mais Vendidos" },
    { href: "/cupons", label: "Cupons" },
    { href: "/categorias", label: "Categorias" },
    { href: "/marcas", label: "Marcas" },
    { href: "/guias", label: "Guias de Compra" },
    { href: "/trending", label: "Tendências" },
  ],
  Legal: [
    { href: "/politica-privacidade", label: "Política de Privacidade" },
    { href: "/termos", label: "Termos de Uso" },
    { href: "/transparencia", label: "Transparência" },
  ],
  Sobre: [
    { href: "/sobre", label: "Sobre o PromoSnap" },
    { href: "/indicar", label: "Programa de Indicação" },
    { href: "/minha-conta", label: "Minha Conta" },
    { href: "/favoritos", label: "Meus Favoritos" },
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
        style={{ background: "radial-gradient(ellipse, rgba(108,99,255,0.05), transparent 70%)", filter: "blur(60px)" }}
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
              Ofertas reais, preço de verdade. Compare preços, acompanhe histórico e encontre os melhores descontos do Brasil.
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

        {/* Affiliate disclaimer */}
        <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(108,99,255,0.10)" }}>
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
