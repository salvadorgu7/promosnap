export interface OfferPageDef {
  title: string
  description: string
  intro: string
  searchQuery: string
  faqs: { q: string; a: string }[]
}

export const OFFER_PAGES: Record<string, OfferPageDef> = {
  'iphone': {
    title: 'Ofertas de iPhone',
    description: 'As melhores ofertas de iPhone com preço comparado. iPhone 15, 14, SE e mais com descontos reais.',
    intro: 'Encontre o melhor preço de iPhone comparando dezenas de lojas em tempo real. Monitoramos promoções de iPhone 15, 14, SE e modelos anteriores para garantir que você pague o menor preço possível.',
    searchQuery: 'iphone',
    faqs: [
      { q: 'Quando o iPhone fica mais barato?', a: 'Geralmente após o lançamento de um novo modelo (setembro) e em eventos como Black Friday, Amazon Prime Day e Dia do Consumidor.' },
      { q: 'iPhone do Mercado Livre é confiável?', a: 'Sim, desde que você compre de vendedores com reputação alta e, de preferência, com envio Full. O Mercado Livre oferece garantia de compra.' },
      { q: 'Vale a pena comprar iPhone de geração anterior?', a: 'Sim, iPhones recebem atualizações por 5-6 anos. Um modelo de 1-2 gerações atrás oferece excelente custo-benefício com suporte garantido.' },
    ],
  },
  'notebook': {
    title: 'Ofertas de Notebook',
    description: 'As melhores ofertas de notebook. Compare preços de notebooks para trabalho, estudo e jogos.',
    intro: 'Notebooks são investimentos que merecem pesquisa de preço. Comparamos ofertas de notebooks em todas as lojas para que você encontre o modelo ideal com o melhor desconto, seja para trabalho, estudo ou gaming.',
    searchQuery: 'notebook',
    faqs: [
      { q: 'Qual o melhor momento para comprar notebook?', a: 'Black Friday, volta às aulas (fevereiro) e Amazon Prime Day costumam ter os melhores descontos em notebooks.' },
      { q: 'Notebook recondicionado vale a pena?', a: 'Pode ser uma boa opção com economia de 20-40%. Compre apenas de vendedores com garantia e política de devolução clara.' },
      { q: 'Qual a configuração mínima recomendada?', a: 'Para uso básico: Intel i3/Ryzen 3, 8GB RAM, SSD 256GB. Para trabalho produtivo: i5/Ryzen 5, 16GB RAM, SSD 512GB.' },
    ],
  },
  'ps5': {
    title: 'Ofertas de PS5',
    description: 'As melhores ofertas de PlayStation 5 com preço comparado. PS5, PS5 Slim, jogos e acessórios.',
    intro: 'O PS5 continua sendo o console mais desejado no Brasil. Monitoramos preços do PS5 Standard, Digital e Slim em todas as lojas para você aproveitar a melhor promoção quando ela surgir.',
    searchQuery: 'playstation 5',
    faqs: [
      { q: 'PS5 Digital ou com disco?', a: 'O PS5 Digital é mais barato, mas você fica limitado a jogos digitais. A versão com disco permite comprar jogos físicos usados, o que pode economizar a longo prazo.' },
      { q: 'Quando o PS5 fica em promoção?', a: 'Black Friday, Dia das Crianças e eventos da PlayStation (Days of Play em junho) costumam ter os melhores preços.' },
      { q: 'PS5 Slim vale a pena?', a: 'Sim, o PS5 Slim é menor, mais leve e tem SSD maior (1TB). Se você ainda não tem PS5, é a melhor opção de compra.' },
    ],
  },
  'fone-bluetooth': {
    title: 'Ofertas de Fones Bluetooth',
    description: 'As melhores ofertas de fones Bluetooth. TWS, over-ear e headsets com descontos verificados.',
    intro: 'Fones Bluetooth estão em constante promoção, mas nem todo desconto é real. Monitoramos os preços dos principais modelos para garantir que você compre no melhor momento com desconto verdadeiro.',
    searchQuery: 'fone bluetooth',
    faqs: [
      { q: 'Fone Bluetooth barato presta?', a: 'Sim, modelos a partir de R$50-100 oferecem boa qualidade sonora para uso casual. Marcas como QCY, Edifier e Haylou são boas opções.' },
      { q: 'AirPods ou alternativas?', a: 'Para iPhone, AirPods oferecem a melhor integração. Para Android, Samsung Galaxy Buds, Sony WF e Nothing Ear são excelentes alternativas, muitas vezes mais baratas.' },
      { q: 'Fone Bluetooth é à prova d\'água?', a: 'Depende do modelo. Procure classificação IPX4 (resistente a suor) ou IPX7 (submersível). Verifique a certificação antes de usar para esportes.' },
    ],
  },
  'air-fryer': {
    title: 'Ofertas de Air Fryer',
    description: 'As melhores ofertas de air fryer. Fritadeiras elétricas de todas as marcas com preço comparado.',
    intro: 'Air fryers são um dos itens mais buscados em promoções. Comparamos preços de modelos de 3L a 12L, de marcas como Mondial, Philips, Britânia e mais para você cozinhar gastando menos.',
    searchQuery: 'air fryer',
    faqs: [
      { q: 'Air fryer Mondial é boa?', a: 'Sim, a Mondial oferece modelos com ótimo custo-benefício. São ideais para quem busca funcionalidade sem gastar muito.' },
      { q: 'Air fryer com painel digital vale mais?', a: 'O painel digital facilita o controle de temperatura e tempo. A diferença de preço costuma ser R$50-100, o que compensa pela praticidade.' },
      { q: 'Air fryer é mesmo saudável?', a: 'Sim, reduz o uso de óleo em até 80% comparado com fritura tradicional. É uma forma mais saudável de preparar alimentos crocantes.' },
    ],
  },
  'smart-tv-55': {
    title: 'Ofertas de Smart TV 55"',
    description: 'As melhores ofertas de Smart TV 55 polegadas. Samsung, LG, TCL e mais com descontos reais.',
    intro: 'TVs de 55 polegadas são as mais populares no Brasil. Monitoramos preços de modelos LED, QLED e OLED em todas as lojas para que você compre sua TV no melhor preço possível.',
    searchQuery: 'smart tv 55',
    faqs: [
      { q: 'Qual a melhor TV 55" barata?', a: 'TVs LED 4K da Samsung Crystal e TCL P series oferecem excelente relação custo-benefício abaixo de R$2.500.' },
      { q: 'TV 55" Samsung ou LG?', a: 'Ambas são excelentes. Samsung destaca em brilho (QLED) e interface Tizen. LG destaca em ângulo de visão e webOS. Para OLED, LG lidera.' },
      { q: 'Smart TV 55" cabe em qualquer rack?', a: 'A maioria dos racks comporta TVs de até 60". Verifique as dimensões: TVs 55" têm aproximadamente 123cm de largura.' },
    ],
  },
  'galaxy-s24': {
    title: 'Ofertas de Galaxy S24',
    description: 'As melhores ofertas de Samsung Galaxy S24, S24+ e S24 Ultra com preço comparado.',
    intro: 'A linha Galaxy S24 trouxe Galaxy AI e câmeras aprimoradas. Monitoramos preços do S24, S24+ e S24 Ultra em todas as lojas brasileiras para que você aproveite o melhor desconto.',
    searchQuery: 'galaxy s24',
    faqs: [
      { q: 'Qual a diferença entre S24, S24+ e S24 Ultra?', a: 'S24 tem tela de 6.2". S24+ tem 6.7" e bateria maior. S24 Ultra tem 6.8", câmera de 200MP, S Pen e corpo de titânio.' },
      { q: 'Galaxy S24 vale a pena em 2025?', a: 'Sim, com a chegada do S25, os preços do S24 caíram significativamente. O Galaxy AI e câmeras continuam excelentes.' },
      { q: 'Onde comprar Galaxy S24 mais barato?', a: 'Compare preços no PromoSnap. Amazon, Mercado Livre e Samsung Shop costumam ter as melhores ofertas, especialmente com cupons.' },
    ],
  },
  'monitor-gamer': {
    title: 'Ofertas de Monitor Gamer',
    description: 'As melhores ofertas de monitor gamer. 144Hz, 240Hz, IPS e VA com preço comparado.',
    intro: 'Um bom monitor gamer faz diferença na experiência de jogo. Comparamos monitores de alta taxa de atualização em todas as lojas para que você encontre o modelo perfeito com o melhor preço.',
    searchQuery: 'monitor gamer',
    faqs: [
      { q: 'Qual a taxa de atualização ideal para jogos?', a: '144Hz é o padrão recomendado para a maioria dos jogadores. 240Hz é para competitivo. 60Hz é aceitável apenas para jogos casuais.' },
      { q: 'IPS ou VA para jogos?', a: 'IPS oferece melhores cores e ângulos de visão. VA tem melhor contraste e pretos mais profundos. Para FPS competitivo, IPS é preferido.' },
      { q: 'Monitor curvo vale a pena?', a: 'Para telas acima de 27", monitores curvos oferecem maior imersão. Para 24", tela plana é suficiente.' },
    ],
  },
  'kindle': {
    title: 'Ofertas de Kindle',
    description: 'As melhores ofertas de Kindle e e-readers. Kindle Paperwhite, Oasis e básico com descontos.',
    intro: 'O Kindle é o e-reader mais popular do Brasil. Monitoramos preços de todos os modelos, do básico ao Oasis, para que você comece ou renove sua biblioteca digital pagando menos.',
    searchQuery: 'kindle',
    faqs: [
      { q: 'Qual Kindle comprar?', a: 'Kindle Paperwhite oferece o melhor custo-benefício com tela de 6.8", luz ajustável e resistência à água. O básico atende para leitura casual.' },
      { q: 'Kindle com anúncios ou sem?', a: 'A versão com anúncios é mais barata e os ads aparecem apenas na tela de bloqueio. Para a maioria das pessoas, não incomoda.' },
      { q: 'Quando Kindle fica mais barato?', a: 'Amazon Prime Day (julho) e Black Friday são os melhores momentos. Descontos de 20-40% são comuns nessas datas.' },
    ],
  },
  'aspirador-robo': {
    title: 'Ofertas de Aspirador Robô',
    description: 'As melhores ofertas de aspirador robô. Roomba, Xiaomi, Intelbras e mais com preço comparado.',
    intro: 'Aspiradores robô automatizam a limpeza e ganham espaço nos lares brasileiros. Comparamos modelos de todas as faixas de preço, desde básicos até modelos com mapeamento laser e esvaziamento automático.',
    searchQuery: 'aspirador robo',
    faqs: [
      { q: 'Aspirador robô limpa bem?', a: 'Modelos modernos limpam muito bem pisos lisos e carpetes finos. Para limpeza pesada, ainda é necessário complementar com aspirador tradicional.' },
      { q: 'Qual o melhor aspirador robô barato?', a: 'Modelos Xiaomi e Intelbras oferecem boa relação custo-benefício a partir de R$600, com mapeamento e app de controle.' },
      { q: 'Aspirador robô funciona em casa com pets?', a: 'Sim, e é especialmente útil para manter o chão livre de pelos. Prefira modelos com sucção potente e escova anti-emaranhamento.' },
    ],
  },
  'eletronicos-hoje': {
    title: 'Ofertas de Eletronicos Hoje',
    description: 'As melhores ofertas de eletronicos do dia. Celulares, notebooks, fones e mais com descontos reais atualizados.',
    intro: 'Eletronicos sao uma das categorias com mais oscilacao de preco. Monitoramos ofertas de celulares, notebooks, fones e acessorios para que voce encontre o melhor desconto do dia.',
    searchQuery: 'eletronicos',
    faqs: [
      { q: 'Os precos de eletronicos mudam todo dia?', a: 'Sim, precos de eletronicos podem variar varias vezes ao dia nos marketplaces. O PromoSnap monitora essas variacoes para destacar os melhores momentos de compra.' },
      { q: 'Como saber se uma oferta de eletronico e real?', a: 'Verifique o historico de precos no PromoSnap. Se o preco atual esta abaixo da media dos ultimos 30 dias, o desconto e real.' },
      { q: 'Qual marketplace tem mais ofertas de eletronicos?', a: 'Amazon e Mercado Livre costumam ter o maior volume de ofertas, seguidos por Magazine Luiza e Americanas.' },
    ],
  },
  'casa-inteligente': {
    title: 'Ofertas de Casa Inteligente',
    description: 'As melhores ofertas de produtos para casa inteligente. Alexa, lampadas smart, tomadas e mais.',
    intro: 'Transforme sua casa em um ambiente inteligente gastando menos. Comparamos precos de assistentes virtuais, lampadas smart, tomadas inteligentes e sensores em todas as lojas.',
    searchQuery: 'smart home alexa',
    faqs: [
      { q: 'Por onde comecar com casa inteligente?', a: 'Comece com uma caixa inteligente (Echo Dot) e lampadas smart. Com menos de R$300 voce ja tem controle de voz para luzes e musica.' },
      { q: 'Alexa ou Google Home?', a: 'Alexa tem mais dispositivos compativeis e skills no Brasil. Google Home integra melhor com servicos Google. Ambos sao excelentes opcoes.' },
      { q: 'Casa inteligente gasta muita energia?', a: 'Nao. A maioria dos dispositivos smart consome menos de 5W em standby. Lampadas smart LED consomem menos que lampadas comuns e ainda permitem ajustar brilho.' },
    ],
  },
  'gaming-setup': {
    title: 'Ofertas para Setup Gamer',
    description: 'As melhores ofertas para montar seu setup gamer. Teclados, mouses, monitores e cadeiras com descontos.',
    intro: 'Montar um setup gamer completo exige investimento, por isso cada economia conta. Comparamos precos de perifericos, monitores, cadeiras e acessorios para que voce monte seu setup pelo menor custo.',
    searchQuery: 'gamer setup',
    faqs: [
      { q: 'Quanto custa um setup gamer basico?', a: 'Um setup basico com teclado mecanico, mouse gamer, mousepad e headset pode sair por R$500-1000. Adicionando monitor e cadeira, R$2000-4000.' },
      { q: 'Quais perifericos priorizar?', a: 'Mouse e mousepad sao os mais importantes para performance. Depois, monitor de alta taxa de atualizacao e teclado mecanico.' },
      { q: 'Periferico gamer RGB vale a pena?', a: 'RGB e estetico e nao melhora performance. Se o orcamento e limitado, priorize qualidade do sensor do mouse e switches do teclado sobre iluminacao.' },
    ],
  },
  'cozinha': {
    title: 'Ofertas para Cozinha',
    description: 'As melhores ofertas de eletrodomesticos de cozinha. Air fryers, panelas, cafeteiras e mais com descontos.',
    intro: 'Eletrodomesticos de cozinha estao entre os itens mais buscados em promocoes. Comparamos precos de air fryers, panelas eletricas, cafeteiras, liquidificadores e mais para equipar sua cozinha gastando menos.',
    searchQuery: 'cozinha eletrodomestico',
    faqs: [
      { q: 'Quais eletrodomesticos de cozinha mais desvalorizam?', a: 'Cafeteiras e liquidificadores costumam ter grandes descontos. Air fryers e panelas eletricas tambem entram em promocao frequentemente.' },
      { q: 'Eletrodomestico de marca propria e confiavel?', a: 'Marcas como Mondial e Britania oferecem otimo custo-beneficio com garantia. Para uso casual, sao opcoes excelentes.' },
      { q: 'Quando comprar eletrodomesticos de cozinha?', a: 'Black Friday, Dia das Maes e eventos como Amazon Prime Day costumam ter os maiores descontos em itens de cozinha.' },
    ],
  },
}

export const OFFER_PAGE_SLUGS = Object.keys(OFFER_PAGES)
