import { buildMetadata } from "@/lib/seo/metadata";
import { Shield, ExternalLink, BarChart3, Heart } from "lucide-react";

export const metadata = buildMetadata({
  title: "Transparência",
  description: "Saiba como o PromoSnap funciona, como ganhamos dinheiro e como garantimos a confiabilidade das ofertas.",
  path: "/transparencia",
});

export default function TransparenciaPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue/10 to-accent-purple/10 mb-4">
          <Shield className="w-7 h-7 text-accent-blue" />
        </div>
        <h1 className="font-display font-extrabold text-3xl text-text-primary mb-3">
          Transparência Total
        </h1>
        <p className="text-text-muted text-base max-w-lg mx-auto">
          Acreditamos que comparadores de preço devem ser honestos. Aqui explicamos exatamente como funcionamos.
        </p>
      </div>

      <div className="space-y-8">
        <div className="card p-6 border-l-4 border-l-accent-blue">
          <div className="flex items-start gap-4">
            <ExternalLink className="w-6 h-6 text-accent-blue flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display font-bold text-lg text-text-primary mb-2">Como ganhamos dinheiro</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                O PromoSnap é gratuito para todos os usuários. Nossa receita vem de comissões de afiliados: quando você clica em uma oferta e compra no site do parceiro (Amazon, Mercado Livre, Shopee, Shein), recebemos uma pequena porcentagem da venda. Isso nunca aumenta o preço que você paga.
              </p>
              <p className="text-sm text-text-secondary leading-relaxed mt-2">
                Não cobramos dos lojistas para aparecer no site. Todas as ofertas são exibidas com base em dados reais, não em pagamento.
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6 border-l-4 border-l-accent-green">
          <div className="flex items-start gap-4">
            <BarChart3 className="w-6 h-6 text-accent-green flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display font-bold text-lg text-text-primary mb-2">Como funcionam os dados</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                Coletamos preços periodicamente das APIs e páginas públicas dos marketplaces. O histórico de preço é real — registramos snapshots ao longo do tempo para mostrar se um desconto é genuíno ou se o preço foi inflado antes de uma promoção.
              </p>
              <p className="text-sm text-text-secondary leading-relaxed mt-2">
                Nosso Score de Oferta combina desconto real, histórico, popularidade, confiabilidade da fonte e frete para dar uma nota objetiva. Não há manipulação manual desse score.
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6 border-l-4 border-l-accent-purple">
          <div className="flex items-start gap-4">
            <Heart className="w-6 h-6 text-accent-purple flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display font-bold text-lg text-text-primary mb-2">Nosso compromisso</h2>
              <ul className="text-sm text-text-secondary leading-relaxed space-y-2 mt-1">
                <li>Nunca inflamos descontos ou criamos falsa urgência.</li>
                <li>Nunca escondemos de qual loja é a oferta.</li>
                <li>Sempre mostramos quando um link é de afiliado (todos os links para lojas são).</li>
                <li>Priorizamos o melhor preço real para o usuário, não a maior comissão para nós.</li>
                <li>Dados de preço são baseados em coletas reais, não em informações fornecidas pelos lojistas.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-surface-50 to-white">
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">Variação de preços</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Preços podem variar entre o momento em que coletamos a informação e sua visita. Sempre confirme o valor final no site do vendedor antes de concluir a compra. Fazemos o possível para manter os dados atualizados, mas não garantimos precisão em tempo real.
          </p>
        </div>

        <div className="card p-6 bg-gradient-to-br from-surface-50 to-white">
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">Alertas e e-mails</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Se você se inscreve em alertas de preço ou na newsletter, usamos seu e-mail exclusivamente para enviar as notificações solicitadas. Você pode cancelar a qualquer momento. Nunca compartilhamos seu e-mail com terceiros para fins comerciais.
          </p>
        </div>
      </div>
    </div>
  );
}
