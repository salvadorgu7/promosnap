import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Política de Privacidade",
  description: "Saiba como o PromoSnap coleta, usa e protege suas informações pessoais.",
  path: "/politica-privacidade",
});

export default function PoliticaPrivacidadePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display font-extrabold text-3xl text-text-primary mb-6">
        Política de Privacidade
      </h1>
      <p className="text-sm text-text-muted mb-8">Última atualização: março de 2026</p>

      <div className="prose-ps space-y-6 text-text-secondary text-sm leading-relaxed">
        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">1. Informações que coletamos</h2>
          <p>O PromoSnap coleta informações de forma limitada e transparente:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>E-mail:</strong> quando você se inscreve na newsletter ou cria alertas de preço.</li>
            <li><strong>Dados de navegação:</strong> páginas visitadas, buscas realizadas e cliques em ofertas, coletados via Google Analytics.</li>
            <li><strong>Preferências locais:</strong> favoritos, produtos vistos recentemente e configurações de exibição, armazenados no seu navegador (localStorage).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">2. Como usamos suas informações</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Enviar alertas de preço e newsletters solicitadas.</li>
            <li>Melhorar a experiência do site com base em padrões de uso.</li>
            <li>Gerar estatísticas agregadas e anônimas sobre o uso do site.</li>
            <li>Personalizar recomendações de produtos.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">3. Cookies e localStorage</h2>
          <p>Utilizamos cookies do Google Analytics para entender como os visitantes interagem com o site. Também usamos localStorage do navegador para armazenar preferências locais como favoritos e histórico de visualização. Esses dados permanecem apenas no seu dispositivo e não são enviados aos nossos servidores.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">4. Links de afiliados</h2>
          <p>Quando você clica em uma oferta no PromoSnap, pode ser redirecionado para o site do parceiro (Amazon, Mercado Livre, Shopee, Shein) através de um link de afiliado. Isso significa que podemos receber uma comissão caso você realize uma compra, sem custo adicional para você. Os parceiros podem coletar dados de acordo com suas próprias políticas de privacidade.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">5. Compartilhamento de dados</h2>
          <p>Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Google Analytics (dados anonimizados de navegação).</li>
            <li>Provedores de e-mail para envio de newsletters e alertas.</li>
            <li>Quando exigido por lei.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">6. Seus direitos</h2>
          <p>Você pode, a qualquer momento:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Cancelar sua inscrição na newsletter através do link de descadastro.</li>
            <li>Desativar alertas de preço.</li>
            <li>Limpar seus dados locais (favoritos, histórico) nas configurações do navegador.</li>
            <li>Solicitar a exclusão de seus dados entrando em contato conosco.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">7. Segurança</h2>
          <p>Adotamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração ou destruição. No entanto, nenhum método de transmissão pela internet é 100% seguro.</p>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-text-primary mb-2">8. Contato</h2>
          <p>Para dúvidas sobre esta política, entre em contato através do e-mail: <strong>contato@promosnap.com.br</strong></p>
        </section>
      </div>
    </div>
  );
}
