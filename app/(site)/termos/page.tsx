import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Termos de Uso",
  description: "Termos e condições de uso do PromoSnap — comparador de preços e ofertas.",
  path: "/termos",
});

export default function TermosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display font-extrabold text-3xl text-text-primary mb-6">
        Termos de Uso
      </h1>
      <p className="text-sm text-text-muted mb-8">Última atualização: março de 2026</p>

      <div className="prose-ps space-y-6 text-text-secondary text-sm leading-relaxed">
        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">1. Aceitação dos termos</h2>
          <p>Ao acessar e usar o PromoSnap (promosnap.com.br), você concorda com estes termos de uso. Se não concordar com algum deles, por favor não utilize o site.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">2. Sobre o PromoSnap</h2>
          <p>O PromoSnap é um comparador de preços que agrega informações de diferentes marketplaces brasileiros. Não somos uma loja e não vendemos produtos diretamente. Nosso papel é ajudar você a encontrar as melhores ofertas comparando preços, históricos e condições de diferentes fontes.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">3. Preços e disponibilidade</h2>
          <p>Os preços exibidos no PromoSnap são coletados periodicamente dos marketplaces parceiros e podem sofrer variações a qualquer momento. Não garantimos a precisão, completude ou atualidade dos preços exibidos. O preço final sempre deve ser confirmado diretamente no site do vendedor antes da compra.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">4. Links de afiliados e monetização</h2>
          <p>O PromoSnap utiliza links de afiliado para gerar receita. Quando você clica em um link de oferta e realiza uma compra no site do parceiro, podemos receber uma comissão. Isso não altera o preço que você paga. Somos transparentes sobre este modelo: ele nos permite manter o serviço gratuito para todos os usuários.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">5. Score de oferta</h2>
          <p>O score de oferta do PromoSnap é calculado por um algoritmo que considera desconto real, histórico de preço, popularidade, confiabilidade da fonte e condições de envio. Ele serve como uma ferramenta auxiliar de decisão e não constitui recomendação financeira ou garantia de qualidade do produto.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">6. Conteúdo editorial</h2>
          <p>Os guias, artigos e comparações publicados no PromoSnap são de caráter informativo e representam a opinião da equipe editorial com base nos dados disponíveis. Não substituem pesquisa pessoal ou aconselhamento profissional.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">7. Uso permitido</h2>
          <p>Você pode usar o PromoSnap para fins pessoais e não comerciais. É proibido:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Realizar scraping automatizado dos dados do site.</li>
            <li>Reproduzir conteúdo editorial sem autorização.</li>
            <li>Utilizar o site para fins ilegais ou fraudulentos.</li>
            <li>Tentar acessar áreas administrativas sem autorização.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">8. Limitação de responsabilidade</h2>
          <p>O PromoSnap não se responsabiliza por transações realizadas nos sites de terceiros, problemas com entregas, qualidade de produtos ou qualquer disputa entre você e os vendedores. Nossa responsabilidade limita-se à exibição de informações comparativas.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">9. Alterações nos termos</h2>
          <p>Podemos atualizar estes termos periodicamente. Alterações significativas serão comunicadas no site. O uso continuado do PromoSnap após alterações constitui aceitação dos novos termos.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">10. Contato</h2>
          <p>Para dúvidas sobre estes termos: <strong>contato@promosnap.com.br</strong></p>
        </section>
      </div>
    </div>
  );
}
