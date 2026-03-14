export interface PriceRangePageDef {
  title: string
  description: string
  intro: string
  categorySlug: string
  maxPrice: number
  faqs: { q: string; a: string }[]
}

export const PRICE_RANGE_PAGES: Record<string, PriceRangePageDef> = {
  'celulares-ate-1500': {
    title: 'Celulares até R$1.500',
    description: 'Os melhores celulares até R$1.500 com preço comparado em tempo real. Smartphones acessíveis com câmera boa, bateria duradoura e descontos reais.',
    intro: 'Encontrar um bom celular sem gastar mais de R$1.500 é totalmente possível. Reunimos os smartphones com melhor custo-benefício nessa faixa, comparando preços em diversas lojas para garantir que você aproveite as melhores ofertas disponíveis.',
    categorySlug: 'celulares',
    maxPrice: 1500,
    faqs: [
      { q: 'Qual o melhor celular até R$1.500 em 2025?', a: 'Modelos da Motorola (Moto G), Samsung (Galaxy A) e Xiaomi (Redmi Note) se destacam nessa faixa, oferecendo boas câmeras, bateria de longa duração e telas de qualidade.' },
      { q: 'Celular até R$1.500 roda jogos pesados?', a: 'A maioria dos modelos nessa faixa roda jogos populares em qualidade média. Para jogos pesados em qualidade alta, considere modelos com processadores Snapdragon 6 Gen 1 ou Dimensity 7200.' },
      { q: 'Vale a pena esperar promoção para comprar celular nessa faixa?', a: 'Sim. Em datas como Black Friday, Dia do Consumidor e Amazon Prime Day, celulares nessa faixa costumam ter descontos de 15% a 30%. O PromoSnap monitora os preços para você comprar no melhor momento.' },
    ],
  },
  'notebooks-ate-3000': {
    title: 'Notebooks até R$3.000',
    description: 'Os melhores notebooks até R$3.000 com preço comparado. Notebooks para estudo e trabalho com descontos verificados.',
    intro: 'Notebooks até R$3.000 atendem bem quem precisa de um computador para estudo, trabalho remoto e tarefas do dia a dia. Comparamos os modelos disponíveis nessa faixa de preço para ajudar você a encontrar a melhor opção sem comprometer o orçamento.',
    categorySlug: 'notebooks',
    maxPrice: 3000,
    faqs: [
      { q: 'Notebook até R$3.000 serve para trabalho?', a: 'Sim. Modelos nessa faixa com 8GB de RAM e SSD de 256GB atendem bem tarefas como navegação, planilhas, videoconferências e edição básica de documentos.' },
      { q: 'Qual processador escolher em notebooks até R$3.000?', a: 'Intel Core i5 de 12ª ou 13ª geração e AMD Ryzen 5 são as melhores opções nessa faixa. Evite processadores Celeron ou Pentium para uso profissional.' },
      { q: 'É melhor notebook com HD ou SSD?', a: 'SSD sempre. A diferença de velocidade é enorme: o sistema liga em segundos e programas abrem instantaneamente. Prefira modelos com pelo menos 256GB de SSD.' },
    ],
  },
  'fones-ate-200': {
    title: 'Fones de Ouvido até R$200',
    description: 'Os melhores fones de ouvido até R$200 com preço comparado. TWS, over-ear e intra-auriculares com as melhores ofertas.',
    intro: 'Fones de ouvido até R$200 oferecem excelente qualidade de som para o dia a dia. Selecionamos os modelos com melhor custo-benefício nessa faixa, desde TWS compactos até over-ear com graves potentes, todos com preços monitorados em tempo real.',
    categorySlug: 'audio',
    maxPrice: 200,
    faqs: [
      { q: 'Qual o melhor fone Bluetooth até R$200?', a: 'Modelos como Redmi Buds, QCY e Edifier oferecem boa qualidade de som e bateria nessa faixa. Para over-ear, marcas como Philips e JBL têm opções competitivas.' },
      { q: 'Fone barato tem cancelamento de ruído?', a: 'Alguns modelos até R$200 oferecem ANC básico que reduz ruídos constantes como ventilador e trânsito. Para ANC avançado, é necessário investir acima de R$300.' },
      { q: 'Fone TWS até R$200 dura quanto tempo?', a: 'A maioria oferece 4-6 horas de uso contínuo, com o estojo carregador estendendo para 20-30 horas no total. Modelos com Bluetooth 5.3 tendem a ter melhor eficiência energética.' },
    ],
  },
  'smart-tv-ate-2000': {
    title: 'Smart TVs até R$2.000',
    description: 'As melhores Smart TVs até R$2.000 com preço comparado. TVs 4K e Full HD com descontos reais e frete grátis.',
    intro: 'Smart TVs até R$2.000 são a porta de entrada para uma experiência de entretenimento de qualidade em casa. Comparamos modelos LED e até QLED nessa faixa, de marcas como Samsung, LG e TCL, com preços atualizados em tempo real.',
    categorySlug: 'smart-tvs',
    maxPrice: 2000,
    faqs: [
      { q: 'Consigo uma TV 4K por até R$2.000?', a: 'Sim. Marcas como TCL, Philco e Toshiba oferecem TVs 4K de 43 e 50 polegadas nessa faixa. Em promoções, Samsung e LG também entram nesse valor.' },
      { q: 'Qual tamanho de TV comprar com R$2.000?', a: 'Com esse orçamento, TVs de 43 a 50 polegadas oferecem o melhor equilíbrio entre tamanho e qualidade de imagem. Para salas menores, 43" já proporciona boa imersão.' },
      { q: 'Smart TV barata tem bons aplicativos?', a: 'Sim. A maioria dos modelos atuais roda Netflix, Prime Video, YouTube, Globoplay e Disney+ nativamente. Verifique se o sistema é Roku TV, Google TV ou Tizen para melhor experiência.' },
    ],
  },
  'air-fryer-ate-400': {
    title: 'Air Fryers até R$400',
    description: 'As melhores air fryers até R$400 com preço comparado. Fritadeiras elétricas sem óleo com descontos verificados.',
    intro: 'Air fryers até R$400 oferecem praticidade na cozinha sem pesar no bolso. Comparamos os modelos mais populares nessa faixa, de marcas como Mondial, Philco, Britânia e Cadence, para você encontrar a fritadeira ideal pelo melhor preço.',
    categorySlug: 'casa',
    maxPrice: 400,
    faqs: [
      { q: 'Qual o melhor tamanho de air fryer até R$400?', a: 'Nessa faixa de preço, modelos de 4 a 5 litros são os mais comuns e atendem bem casais e famílias pequenas. Para famílias maiores, busque modelos de 5L+ em promoção.' },
      { q: 'Air fryer digital ou analógica até R$400?', a: 'Ambas funcionam bem. Modelos digitais oferecem timer e temperatura precisos, enquanto analógicas são mais simples e confiáveis. A diferença de preço nessa faixa é pequena.' },
      { q: 'Quais marcas de air fryer têm melhor custo-benefício?', a: 'Mondial, Britânia e Cadence oferecem modelos robustos nessa faixa. Philips Walita e Oster aparecem em promoções com preços competitivos e qualidade superior de acabamento.' },
    ],
  },
}

export const PRICE_RANGE_SLUGS = Object.keys(PRICE_RANGE_PAGES)
