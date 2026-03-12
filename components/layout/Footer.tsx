import Link from "next/link";
import { Zap } from "lucide-react";

const LINKS = {
  Navegacao: [
    { href: "/ofertas", label: "Ofertas Quentes" },
    { href: "/menor-preco", label: "Menor Preco Historico" },
    { href: "/mais-vendidos", label: "Mais Vendidos" },
    { href: "/cupons", label: "Cupons" },
    { href: "/categorias", label: "Categorias" },
    { href: "/marcas", label: "Marcas" },
    { href: "/guias", label: "Guias de Compra" },
    { href: "/trending", label: "Tendencias" },
  ],
  Legal: [
    { href: "/politica-privacidade", label: "Politica de Privacidade" },
    { href: "/termos", label: "Termos de Uso" },
    { href: "/transparencia", label: "Transparencia" },
  ],
  Sobre: [
    { href: "/sobre", label: "Sobre o PromoSnap" },
    { href: "/indicar", label: "Programa de Indicacao" },
    { href: "/minha-conta", label: "Minha Conta" },
    { href: "/favoritos", label: "Meus Favoritos" },
  ],
};

export default function Footer() {
  return (
    <footer className="mt-12 relative overflow-hidden">
      {/* Top gradient divider */}
      <div className="section-divider" />
      {/* Rich gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-50/90 via-surface-100/60 to-surface-100/80 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[200px] bg-accent-blue/3 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-brand-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-display font-extrabold text-lg tracking-tight text-surface-900">
                Promo<span className="text-gradient">Snap</span>
              </span>
            </Link>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              Ofertas reais, preco de verdade. Compare precos, acompanhe historico e encontre os melhores descontos do Brasil.
            </p>
            <p className="text-xs text-text-muted font-medium">promosnap.com.br</p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-display font-semibold text-sm text-text-primary mb-3">
                {title}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted hover:text-accent-blue transition-colors"
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
        <div className="mt-8 pt-6 border-t border-surface-200/60">
          <p className="text-xs text-text-muted leading-relaxed max-w-3xl mb-4">
            O PromoSnap pode receber comissoes por compras realizadas atraves de links de afiliado.
            Isso nao afeta o preco que voce paga e nos ajuda a manter o servico gratuito.
            Todos os precos exibidos sao obtidos automaticamente e podem variar sem aviso previo.
            Verifique sempre o valor final na loja antes de concluir sua compra.
          </p>
        </div>

        {/* Bottom bar: legal links + copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center gap-4 text-xs text-text-muted">
            <Link
              href="/politica-privacidade"
              className="hover:text-accent-blue transition-colors"
            >
              Politica de Privacidade
            </Link>
            <Link
              href="/termos"
              className="hover:text-accent-blue transition-colors"
            >
              Termos de Uso
            </Link>
            <Link
              href="/transparencia"
              className="hover:text-accent-blue transition-colors"
            >
              Transparencia
            </Link>
          </div>
          <p className="text-xs text-text-muted text-center">
            &copy; {new Date().getFullYear()} PromoSnap. Precos e disponibilidade podem variar.
          </p>
        </div>
      </div>
    </footer>
  );
}
