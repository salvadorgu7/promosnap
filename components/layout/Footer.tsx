import Link from "next/link";
import { Zap } from "lucide-react";

const LINKS = {
  Categorias: [
    { href: "/categoria/celulares", label: "Celulares" },
    { href: "/categoria/notebooks", label: "Notebooks" },
    { href: "/categoria/tv-audio", label: "Smart TVs" },
    { href: "/categoria/gamer", label: "Gamer" },
    { href: "/categoria/casa", label: "Casa" },
    { href: "/categorias", label: "Ver todas →" },
  ],
  Ofertas: [
    { href: "/ofertas", label: "Ofertas Quentes" },
    { href: "/menor-preco", label: "Menor Preço Histórico" },
    { href: "/mais-vendidos", label: "Mais Vendidos" },
    { href: "/cupons", label: "Cupons" },
    { href: "/guias", label: "Guias de Compra" },
    { href: "/trending", label: "Tendências" },
  ],
  PromoSnap: [
    { href: "/sobre", label: "Sobre" },
    { href: "/transparencia", label: "Transparência" },
    { href: "/marcas", label: "Marcas" },
    { href: "/indicar", label: "Indique" },
    { href: "/minha-conta", label: "Minha Conta" },
    { href: "/favoritos", label: "Meus Favoritos" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-surface-200 bg-gradient-to-b from-white to-surface-50/80 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
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
              Ofertas reais, preço de verdade. Compare preços, acompanhe histórico e encontre os melhores descontos do Brasil.
            </p>
            <p className="text-xs text-text-muted">promosnap.com.br</p>
          </div>
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-display font-semibold text-sm text-text-primary mb-3">{title}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-text-muted hover:text-accent-blue transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal links */}
        <div className="mt-8 pt-6 border-t border-surface-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap justify-center gap-4 text-xs text-text-muted">
            <Link href="/politica-privacidade" className="hover:text-accent-blue transition-colors">Política de Privacidade</Link>
            <Link href="/termos" className="hover:text-accent-blue transition-colors">Termos de Uso</Link>
            <Link href="/transparencia" className="hover:text-accent-blue transition-colors">Transparência</Link>
          </div>
          <p className="text-xs text-text-muted text-center">
            © {new Date().getFullYear()} PromoSnap. Preços e disponibilidade podem variar. Links de afiliado podem gerar comissão.
          </p>
        </div>
      </div>
    </footer>
  );
}
