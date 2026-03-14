// ============================================
// PRODUCT COMPARISONS — SEO pages
// ============================================

export interface ComparisonDef {
  slug: string;
  title: string;
  description: string;
  intro: string;
  productA: { name: string; query: string };
  productB: { name: string; query: string };
  verdict: string;
  faqs: Array<{ q: string; a: string }>;
}

const comparisons: ComparisonDef[] = [
  {
    slug: "iphone-15-vs-galaxy-s24",
    title: "iPhone 15 vs Galaxy S24: Qual comprar em 2025?",
    description:
      "Comparativo completo entre iPhone 15 e Galaxy S24. Veja preços, câmeras, desempenho e descubra qual é o melhor custo-benefício.",
    intro:
      "O iPhone 15 e o Galaxy S24 são dois dos smartphones mais populares do mercado. Ambos oferecem câmeras de altíssima qualidade, telas brilhantes e desempenho de ponta, mas cada um tem seus pontos fortes. Neste comparativo, analisamos preços reais em dezenas de lojas para ajudar você a escolher.",
    productA: { name: "iPhone 15", query: "iphone 15" },
    productB: { name: "Galaxy S24", query: "galaxy s24" },
    verdict:
      "Se você prioriza integração com o ecossistema Apple e longevidade de software, o iPhone 15 é a escolha certa. Já o Galaxy S24 oferece mais versatilidade, tela superior e recursos de IA da Samsung. Em termos de custo-benefício no Brasil, o Galaxy S24 costuma ter preços mais competitivos.",
    faqs: [
      {
        q: "Qual tem a melhor câmera, iPhone 15 ou Galaxy S24?",
        a: "Ambos possuem câmeras excelentes. O iPhone 15 se destaca em vídeo e consistência de cores, enquanto o Galaxy S24 oferece zoom óptico superior e mais versatilidade em fotos noturnas.",
      },
      {
        q: "Qual dura mais a bateria?",
        a: "O Galaxy S24 possui bateria de 4.000 mAh contra 3.349 mAh do iPhone 15. Na prática, ambos duram um dia inteiro, mas o Galaxy leva vantagem em uso intensivo.",
      },
      {
        q: "Vale a pena esperar o iPhone 16 ou Galaxy S25?",
        a: "Se você precisa trocar agora, ambos são excelentes opções. Os preços tendem a cair quando os novos modelos são lançados, tornando o momento da troca ainda mais vantajoso.",
      },
    ],
  },
  {
    slug: "airpods-pro-vs-galaxy-buds",
    title: "AirPods Pro vs Galaxy Buds: Qual o melhor fone TWS?",
    description:
      "Comparação entre AirPods Pro e Galaxy Buds. Cancelamento de ruído, qualidade sonora, bateria e preços atualizados.",
    intro:
      "Os fones true wireless da Apple e Samsung disputam a preferência do público brasileiro. AirPods Pro e Galaxy Buds oferecem cancelamento de ruído ativo, áudio de alta qualidade e integração profunda com seus ecossistemas. Comparamos preços e recursos para facilitar sua decisão.",
    productA: { name: "AirPods Pro", query: "airpods pro" },
    productB: { name: "Galaxy Buds", query: "galaxy buds" },
    verdict:
      "Os AirPods Pro são a melhor escolha para quem usa iPhone, com cancelamento de ruído líder do segmento. Os Galaxy Buds oferecem melhor custo-benefício e funcionam perfeitamente com Android e Samsung. Em termos de preço no Brasil, os Galaxy Buds costumam ser significativamente mais acessíveis.",
    faqs: [
      {
        q: "AirPods Pro funciona bem com Android?",
        a: "Funciona via Bluetooth, mas perde recursos como detecção automática de ouvido, áudio espacial personalizado e integração com Siri. Para Android, os Galaxy Buds são mais recomendados.",
      },
      {
        q: "Qual tem melhor cancelamento de ruído?",
        a: "Os AirPods Pro 2 têm o melhor cancelamento de ruído da categoria TWS. Os Galaxy Buds Pro/FE também são competentes, mas ficam um degrau abaixo.",
      },
      {
        q: "Quanto tempo dura a bateria?",
        a: "Ambos oferecem cerca de 6 horas de uso contínuo com ANC ligado, e mais de 24 horas com o estojo de carregamento. Os Galaxy Buds têm leve vantagem em duração total.",
      },
    ],
  },
  {
    slug: "macbook-air-vs-thinkpad",
    title: "MacBook Air vs ThinkPad: Qual o melhor notebook para trabalho?",
    description:
      "MacBook Air M3 vs Lenovo ThinkPad. Produtividade, portabilidade, bateria e preços comparados.",
    intro:
      "MacBook Air e ThinkPad são referências em notebooks para profissionais. O MacBook Air com chip M3 oferece desempenho silencioso e bateria excepcional, enquanto o ThinkPad é sinônimo de durabilidade e teclado premium. Veja qual oferece o melhor custo-benefício no Brasil.",
    productA: { name: "MacBook Air", query: "macbook air" },
    productB: { name: "ThinkPad", query: "thinkpad" },
    verdict:
      "O MacBook Air M3 é imbatível em eficiência energética e performance por watt, ideal para quem trabalha com criação de conteúdo. O ThinkPad é a escolha certa para ambientes corporativos, com melhor manutenção, mais portas e compatibilidade com Windows. O MacBook costuma ter preço mais elevado no Brasil.",
    faqs: [
      {
        q: "MacBook Air aguenta programação pesada?",
        a: "Sim, o chip M3 com 8-16GB de RAM unificada lida bem com desenvolvimento, Docker e múltiplas VMs. Para desenvolvimento web e mobile, é uma excelente opção.",
      },
      {
        q: "ThinkPad tem boa durabilidade?",
        a: "Sim, os ThinkPads passam por testes militares MIL-STD 810H e são conhecidos pela robustez. O teclado é considerado o melhor entre notebooks.",
      },
      {
        q: "Qual tem melhor tela?",
        a: "O MacBook Air tem tela Liquid Retina com excelente calibração de cores. Os ThinkPads de linha alta também oferecem telas OLED de qualidade, mas os modelos de entrada têm telas inferiores.",
      },
    ],
  },
  {
    slug: "ps5-vs-xbox-series-x",
    title: "PS5 vs Xbox Series X: Qual console comprar?",
    description:
      "Comparativo PS5 vs Xbox Series X. Jogos exclusivos, Game Pass, preços no Brasil e qual vale mais a pena.",
    intro:
      "A batalha entre PlayStation 5 e Xbox Series X continua acirrada. Ambos oferecem jogos em 4K, ray tracing e SSDs ultrarrápidos. A diferença está nos exclusivos, serviços e, principalmente, nos preços praticados no Brasil. Comparamos tudo para você decidir.",
    productA: { name: "PS5", query: "ps5" },
    productB: { name: "Xbox Series X", query: "xbox series x" },
    verdict:
      "O PS5 vence em exclusivos de peso como God of War e Spider-Man. O Xbox Series X oferece o Game Pass, que é imbatível em custo-benefício para quem joga muitos títulos. No Brasil, os preços são similares, mas o Game Pass faz o Xbox ser mais econômico a longo prazo.",
    faqs: [
      {
        q: "Game Pass vale a pena no Brasil?",
        a: "Sim, o Game Pass Ultimate oferece centenas de jogos por uma mensalidade acessível, incluindo lançamentos no dia 1. Para quem joga vários títulos por mês, é extremamente vantajoso.",
      },
      {
        q: "PS5 Digital ou com disco?",
        a: "A versão digital é mais barata, mas você fica limitado a compras na PSN. A versão com disco permite comprar jogos físicos usados, o que pode economizar a longo prazo.",
      },
      {
        q: "Qual console tem jogos melhores?",
        a: "É subjetivo, mas o PS5 tem mais exclusivos aclamados pela crítica. O Xbox compensa com o Game Pass e está investindo pesado em estúdios como Bethesda e Activision Blizzard.",
      },
    ],
  },
  {
    slug: "air-fryer-mondial-vs-philips",
    title: "Air Fryer Mondial vs Philips: Qual a melhor fritadeira?",
    description:
      "Comparativo Air Fryer Mondial vs Philips Walita. Capacidade, potência, preço e qual oferece melhor custo-benefício.",
    intro:
      "As air fryers da Mondial e Philips Walita dominam o mercado brasileiro. A Mondial oferece preços mais acessíveis, enquanto a Philips aposta em tecnologia e acabamento premium. Comparamos modelos, preços e avaliações para ajudar na sua escolha.",
    productA: { name: "Air Fryer Mondial", query: "air fryer mondial" },
    productB: { name: "Air Fryer Philips", query: "air fryer philips" },
    verdict:
      "A Mondial é a melhor opção para quem busca custo-benefício e bom desempenho básico. A Philips Walita justifica o preço mais alto com melhor distribuição de calor, acabamento superior e maior durabilidade. Para uso diário intenso, a Philips compensa o investimento.",
    faqs: [
      {
        q: "Air fryer gasta muita energia?",
        a: "Não. As air fryers consomem em média 1.400W e cozinham mais rápido que fornos convencionais, resultando em economia de energia na maioria dos casos.",
      },
      {
        q: "Qual capacidade ideal de air fryer?",
        a: "Para 1-2 pessoas, 3,2L é suficiente. Para famílias de 3-4 pessoas, opte por 4-5L. Famílias maiores devem considerar modelos de 5L ou mais.",
      },
      {
        q: "A comida fica tão boa quanto frita?",
        a: "A textura é diferente — mais crocante por fora e menos oleosa. A maioria das pessoas prefere o resultado da air fryer por ser mais saudável e pratico.",
      },
    ],
  },
  {
    slug: "kindle-vs-kobo",
    title: "Kindle vs Kobo: Qual o melhor e-reader?",
    description:
      "Kindle vs Kobo Clara. Comparativo de tela, bateria, loja de livros e preços. Descubra qual leitor digital é ideal para você.",
    intro:
      "Kindle e Kobo são os dois principais e-readers do mercado. O Kindle tem integração com a Amazon e a maior loja de e-books do mundo, enquanto o Kobo oferece mais formatos e integração com bibliotecas. Comparamos preços e recursos para leitores brasileiros.",
    productA: { name: "Kindle", query: "kindle" },
    productB: { name: "Kobo", query: "kobo" },
    verdict:
      "O Kindle é a escolha mais segura para a maioria, com loja robusta e preços promocionais frequentes de e-books. O Kobo é ideal para quem quer ler ePubs sem conversão e valoriza a compatibilidade com o sistema Skoob/Overdrive. No Brasil, o Kindle costuma ser mais fácil de encontrar e com melhor preço.",
    faqs: [
      {
        q: "Kindle lê PDF bem?",
        a: "PDFs simples funcionam, mas o Kindle não é ideal para PDFs complexos com gráficos. Para isso, o Kobo com tela maior ou um tablet são melhores opções.",
      },
      {
        q: "Preciso de internet para usar e-reader?",
        a: "Não. Você só precisa de internet para comprar e baixar livros. Depois de baixados, pode ler offline sem problemas.",
      },
      {
        q: "Quanto dura a bateria do e-reader?",
        a: "Ambos duram semanas com uma única carga em uso normal (30 minutos por dia). O Kindle Paperwhite e o Kobo Clara duram cerca de 6-8 semanas.",
      },
    ],
  },
  {
    slug: "jbl-flip-vs-sony-srs",
    title: "JBL Flip vs Sony SRS: Qual a melhor caixa de som portátil?",
    description:
      "JBL Flip 6 vs Sony SRS-XB. Qualidade sonora, resistência à água, bateria e preços comparados.",
    intro:
      "JBL Flip e Sony SRS são as caixas de som Bluetooth mais procuradas no Brasil. Ambas oferecem resistência à água, bateria de longa duração e som potente para o tamanho. Comparamos especificações e preços para ajudar na escolha.",
    productA: { name: "JBL Flip", query: "jbl flip" },
    productB: { name: "Sony SRS", query: "sony srs" },
    verdict:
      "A JBL Flip 6 se destaca pelo som mais equilibrado e pela função PartyBoost para conectar múltiplas caixas. A Sony SRS-XB oferece graves mais potentes e o recurso Extra Bass. Para uso geral, a JBL é mais versátil; para festas, a Sony pode agradar mais.",
    faqs: [
      {
        q: "Posso usar na piscina?",
        a: "Sim, ambas possuem certificação IP67, resistindo a submersão em até 1 metro de água por 30 minutos. São ideais para piscina e praia.",
      },
      {
        q: "Qual tem mais bateria?",
        a: "A JBL Flip 6 oferece cerca de 12 horas, enquanto a Sony SRS-XB varia de 16 a 24 horas dependendo do modelo. A Sony leva vantagem em autonomia.",
      },
      {
        q: "Dá para atender ligação pela caixa?",
        a: "A JBL Flip permite atender chamadas com microfone embutido. A maioria dos modelos Sony SRS não possui essa função.",
      },
    ],
  },
  {
    slug: "galaxy-watch-vs-apple-watch",
    title: "Galaxy Watch vs Apple Watch: Qual o melhor smartwatch?",
    description:
      "Galaxy Watch 6 vs Apple Watch Series 9. Saúde, fitness, bateria e compatibilidade. Veja preços atualizados.",
    intro:
      "O Galaxy Watch e o Apple Watch são os smartwatches mais completos do mercado. Ambos monitoram saúde, oferecem GPS integrado e permitem pagamentos por aproximação. A escolha depende principalmente do seu smartphone. Comparamos recursos e preços no Brasil.",
    productA: { name: "Galaxy Watch", query: "galaxy watch" },
    productB: { name: "Apple Watch", query: "apple watch" },
    verdict:
      "Se você tem iPhone, o Apple Watch é a escolha natural com integração perfeita. Para usuários Android, o Galaxy Watch oferece o melhor ecossistema de smartwatch com Wear OS. O Galaxy Watch geralmente tem melhor bateria e preço mais acessível no Brasil.",
    faqs: [
      {
        q: "Galaxy Watch funciona com iPhone?",
        a: "Tecnicamente conecta via Bluetooth, mas perde a maioria dos recursos avançados. Para iPhone, o Apple Watch é muito mais funcional.",
      },
      {
        q: "Qual mede pressão arterial?",
        a: "O Galaxy Watch possui sensor de pressão arterial (após calibração com aparelho real). O Apple Watch não oferece essa função atualmente.",
      },
      {
        q: "Preciso do modelo com 4G/LTE?",
        a: "Para a maioria dos usuários, o modelo Wi-Fi/GPS é suficiente. O 4G é útil apenas se você precisa fazer ligações ou receber notificações sem o celular por perto.",
      },
    ],
  },
  {
    slug: "iphone-15-vs-iphone-14",
    title: "iPhone 15 vs iPhone 14: Vale a pena o upgrade?",
    description:
      "Comparativo iPhone 15 vs iPhone 14. Dynamic Island, USB-C, câmera e preços. Descubra se vale trocar.",
    intro:
      "Com a chegada do iPhone 15, muitos se perguntam se vale trocar o iPhone 14. O novo modelo traz Dynamic Island, USB-C e melhorias na câmera. Mas será que justifica o preço? Comparamos os dois modelos com preços reais do mercado brasileiro.",
    productA: { name: "iPhone 15", query: "iphone 15" },
    productB: { name: "iPhone 14", query: "iphone 14" },
    verdict:
      "Se você já tem o iPhone 14, a troca não é essencial — as melhorias são incrementais. Porém, se está comprando novo, o iPhone 15 é a melhor escolha pela USB-C, Dynamic Island e câmera de 48MP. O iPhone 14 se torna uma ótima opção de custo-benefício com a queda de preço.",
    faqs: [
      {
        q: "USB-C faz diferença no iPhone 15?",
        a: "Sim, você pode usar o mesmo cabo do notebook, tablet e fones. Além de praticidade, o USB-C permite transferências de dados mais rápidas no modelo Pro.",
      },
      {
        q: "A câmera do iPhone 15 é muito melhor?",
        a: "O iPhone 15 tem sensor principal de 48MP contra 12MP do iPhone 14, resultando em fotos com mais detalhes e melhor zoom digital. A diferença é perceptível em ampliações.",
      },
      {
        q: "iPhone 14 ainda recebe atualizações?",
        a: "Sim, a Apple oferece suporte de software por 5-6 anos. O iPhone 14 receberá atualizações do iOS por vários anos ainda.",
      },
    ],
  },
  {
    slug: "notebook-gamer-vs-desktop-gamer",
    title: "Notebook Gamer vs Desktop Gamer: Qual montar em 2025?",
    description:
      "Notebook gamer ou PC desktop gamer? Comparamos preço, desempenho, upgrade e portabilidade para o mercado brasileiro.",
    intro:
      "A eterna dúvida dos gamers brasileiros: investir em um notebook gamer ou montar um desktop? Cada opção tem vantagens claras. O notebook oferece portabilidade, enquanto o desktop garante melhor desempenho por real investido. Analisamos preços e cenários para ajudar na decisão.",
    productA: { name: "Notebook Gamer", query: "notebook gamer" },
    productB: { name: "Desktop Gamer", query: "desktop gamer" },
    verdict:
      "Para o melhor desempenho por real investido, o desktop gamer vence com folga — mesma performance custa 30-40% menos. O notebook gamer é ideal para quem precisa de mobilidade, estuda fora ou não tem espaço dedicado. Se portabilidade não é prioridade, o desktop é a melhor escolha financeira.",
    faqs: [
      {
        q: "Notebook gamer esquenta muito?",
        a: "Sim, notebooks gamer tendem a esquentar mais que desktops devido ao espaço limitado para refrigeração. Use uma base com cooler para melhorar a ventilação e o desempenho.",
      },
      {
        q: "Dá para fazer upgrade em notebook gamer?",
        a: "Limitado. Geralmente é possível trocar RAM e SSD, mas GPU e processador são soldados. No desktop, todos os componentes podem ser trocados individualmente.",
      },
      {
        q: "Qual gasta mais energia?",
        a: "O desktop gamer consome significativamente mais energia, especialmente com GPUs de alto desempenho. O notebook é mais eficiente energeticamente, porém com desempenho inferior.",
      },
    ],
  },
  {
    slug: "airpods-vs-galaxy-buds",
    title: "AirPods vs Galaxy Buds: Qual fone TWS comprar?",
    description:
      "Comparativo AirPods Pro vs Galaxy Buds. ANC, qualidade sonora, bateria e preco. Veja qual vale mais no Brasil.",
    intro:
      "AirPods e Galaxy Buds sao os fones TWS mais populares. A escolha depende do seu smartphone, mas tambem de preferencias sonoras e funcionalidades. Comparamos precos e recursos para ajudar sua decisao.",
    productA: { name: "AirPods", query: "airpods" },
    productB: { name: "Galaxy Buds", query: "galaxy buds" },
    verdict:
      "Para usuarios iPhone, os AirPods oferecem integracao perfeita e ANC excelente. Para Android, os Galaxy Buds tem mais recursos, melhor equalizador e custo geralmente menor no Brasil.",
    faqs: [
      {
        q: "AirPods funcionam com Android?",
        a: "Sim, conectam via Bluetooth, mas perdem recursos como audio espacial, troca automatica entre dispositivos e personalizacao de ANC.",
      },
      {
        q: "Qual tem melhor cancelamento de ruido?",
        a: "AirPods Pro 2 e Galaxy Buds2 Pro tem ANC comparavel. Em testes, os AirPods Pro 2 cancelam ligeiramente melhor ruidos graves, enquanto os Galaxy Buds lidam melhor com vozes.",
      },
      {
        q: "Qual dura mais a bateria?",
        a: "Galaxy Buds geralmente duram mais: 5-8h vs 4-6h dos AirPods. Com o case, ambos chegam a 24-30h no total.",
      },
    ],
  },
  {
    slug: "cadeira-gamer-vs-escritorio",
    title: "Cadeira Gamer vs Cadeira de Escritorio: Qual escolher?",
    description:
      "Cadeira gamer ou cadeira de escritorio ergonomica? Comparamos conforto, ergonomia, durabilidade e preco.",
    intro:
      "A escolha entre cadeira gamer e cadeira de escritorio depende do seu uso e prioridades. Cadeiras gamer focam em estetica e reclinacao, enquanto ergonomicas priorizam postura e conforto prolongado. Comparamos as opcoes com precos reais.",
    productA: { name: "Cadeira Gamer", query: "cadeira gamer" },
    productB: { name: "Cadeira Escritorio", query: "cadeira escritorio" },
    verdict:
      "Para sessoes longas de trabalho, cadeiras ergonomicas de escritorio geralmente oferecem melhor suporte lombar e ajustes. Para gamers que querem estetica e reclinacao, cadeiras gamer sao ideais. No Brasil, cadeiras gamer costumam ter melhor custo-beneficio.",
    faqs: [
      {
        q: "Cadeira gamer e ergonomica?",
        a: "Depende do modelo. Cadeiras gamer premium com apoio lombar ajustavel e bracos 4D sao ergonomicas. Modelos baratos podem ser desconfortaveis para uso prolongado.",
      },
      {
        q: "Quanto investir em uma boa cadeira?",
        a: "Cadeiras gamer decentes comecam em R$600-800. Cadeiras ergonomicas de escritorio comecam em R$1.000-1.500 para modelos com bom suporte.",
      },
      {
        q: "Qual material e melhor para o Brasil?",
        a: "Tecido mesh e o mais indicado para clima quente, pois permite ventilacao. Couro sintetico esquenta mais mas e mais facil de limpar.",
      },
    ],
  },
  {
    slug: "fritadeira-air-fryer-vs-forno",
    title: "Air Fryer vs Forno Eletrico: Qual comprar?",
    description:
      "Air fryer ou forno eletrico? Comparamos versatilidade, economia, facilidade e preco para ajudar sua escolha.",
    intro:
      "Air fryers e fornos eletricos atendem propositos diferentes na cozinha. Enquanto a air fryer se destaca em praticidade e velocidade, o forno eletrico oferece mais versatilidade e capacidade. Comparamos ambos com precos reais.",
    productA: { name: "Air Fryer", query: "air fryer" },
    productB: { name: "Forno Eletrico", query: "forno eletrico" },
    verdict:
      "Para quem busca praticidade e velocidade no dia a dia, a air fryer e a melhor escolha. Para cozinheiros que precisam de versatilidade (assar bolos, pizzas, gratinar), o forno eletrico e mais completo. O ideal e ter ambos.",
    faqs: [
      {
        q: "Air fryer substitui o forno?",
        a: "Para frituras, assados pequenos e reaquecimento, sim. Para bolos, pizzas grandes e gratinados, o forno ainda e necessario.",
      },
      {
        q: "Qual gasta menos energia?",
        a: "A air fryer geralmente consome menos energia por refeicao, pois cozinha mais rapido e em menor volume. O forno eletrico consome mais, especialmente em tempos longos de cozimento.",
      },
      {
        q: "Air fryer forno 2 em 1 vale a pena?",
        a: "Sim, modelos combinados oferecem versatilidade com capacidade maior. Sao uma otima opcao para quem tem pouco espaco na cozinha.",
      },
    ],
  },
  {
    slug: "monitor-ips-vs-va",
    title: "Monitor IPS vs VA: Qual painel e melhor?",
    description:
      "IPS ou VA? Comparamos angulo de visao, contraste, cores, tempo de resposta e preco de monitores.",
    intro:
      "IPS e VA sao as tecnologias de painel mais populares em monitores. Cada uma tem vantagens distintas que atendem perfis diferentes de uso. Comparamos ambas com foco em precos do mercado brasileiro.",
    productA: { name: "Monitor IPS", query: "monitor ips" },
    productB: { name: "Monitor VA", query: "monitor va" },
    verdict:
      "IPS e melhor para criacao de conteudo, design e jogos competitivos (melhor cor e angulo de visao). VA e melhor para filmes, jogos single-player e ambientes escuros (melhor contraste). VA geralmente custa menos no Brasil.",
    faqs: [
      {
        q: "IPS ou VA para jogos FPS?",
        a: "IPS e preferido para FPS competitivo por ter tempos de resposta mais rapidos e menor ghosting. Paineis IPS de 1ms sao ideais para jogadores competitivos.",
      },
      {
        q: "VA tem cores boas?",
        a: "VA tem boas cores, mas com angulos de visao mais limitados que IPS. Para uso frontal, a diferenca e pequena. Para trabalho criativo profissional, IPS e mais preciso.",
      },
      {
        q: "OLED e melhor que ambos?",
        a: "Sim, OLED combina o melhor de ambos: preto perfeito, cores excepcionais e tempo de resposta instantaneo. Porem, custa significativamente mais e tem risco de burn-in.",
      },
    ],
  },
];

export const COMPARISONS: Record<string, ComparisonDef> = Object.fromEntries(
  comparisons.map((c) => [c.slug, c])
);

export const COMPARISON_SLUGS: string[] = comparisons.map((c) => c.slug);

export const COMPARISON_LIST = comparisons;

/** Find comparisons that match a product name (case-insensitive substring) */
export function findComparisonsForProduct(productName: string): Array<{
  slug: string;
  title: string;
  otherProduct: string;
}> {
  const lower = productName.toLowerCase();
  return comparisons
    .filter((c) =>
      lower.includes(c.productA.query.toLowerCase()) ||
      lower.includes(c.productB.query.toLowerCase())
    )
    .map((c) => ({
      slug: c.slug,
      title: c.title,
      otherProduct: lower.includes(c.productA.query.toLowerCase())
        ? c.productB.name
        : c.productA.name,
    }));
}
