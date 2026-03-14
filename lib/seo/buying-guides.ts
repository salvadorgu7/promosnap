export interface BuyingGuideDef {
  slug: string
  title: string
  description: string
  intro: string
  sections: Array<{
    title: string
    content: string
  }>
  relatedCategories: string[]
  relatedComparisons: string[]
  relatedBestPages: string[]
  faqs: Array<{ q: string; a: string }>
}

export const BUYING_GUIDES: Record<string, BuyingGuideDef> = {
  'como-escolher-smartphone': {
    slug: 'como-escolher-smartphone',
    title: 'Como Escolher o Melhor Smartphone em 2025',
    description: 'Guia completo para escolher o smartphone ideal: tela, camera, bateria, processador e custo-beneficio.',
    intro: 'Escolher um smartphone pode ser confuso com tantas opcoes. Este guia explica os principais criterios para tomar a melhor decisao.',
    sections: [
      { title: 'Processador e Desempenho', content: 'Snapdragon, Dimensity, Exynos ou Apple Silicon? Entenda qual faz sentido para seu uso.' },
      { title: 'Camera', content: 'Megapixels nao sao tudo. Abertura, sensor, processamento computacional e estabilizacao importam mais.' },
      { title: 'Bateria e Carregamento', content: 'Acima de 4500mAh e ideal. Carregamento rapido de 33W ou mais faz diferenca no dia a dia.' },
      { title: 'Tela', content: 'AMOLED vs IPS, taxa de atualizacao 90Hz vs 120Hz, brilho e protecao Gorilla Glass.' },
      { title: 'Custo-Beneficio', content: 'O melhor smartphone e o que atende suas necessidades sem excesso. Nem sempre o mais caro e o melhor para voce.' },
    ],
    relatedCategories: ['smartphones'],
    relatedComparisons: ['iphone-15-vs-galaxy-s24'],
    relatedBestPages: ['melhores-celulares', 'melhores-smartphones-custo-beneficio'],
    faqs: [
      { q: 'Qual o melhor smartphone ate R$1500?', a: 'Na faixa de R$1500, modelos como Redmi Note 13 e Galaxy A54 oferecem excelente custo-beneficio com boa camera e bateria.' },
      { q: 'iPhone ou Android?', a: 'Depende do ecossistema. iPhone oferece integracao Apple e atualizacoes longas. Android oferece mais variedade de preco e personalizacao.' },
      { q: 'Quantos GB de RAM preciso?', a: 'Para uso basico, 4GB basta. Para multitarefa e jogos, 6-8GB e ideal. Acima de 12GB raramente faz diferenca perceptivel.' },
    ],
  },
  'como-escolher-notebook': {
    slug: 'como-escolher-notebook',
    title: 'Como Escolher o Melhor Notebook em 2025',
    description: 'Guia completo para escolher notebook: processador, RAM, SSD, tela e uso ideal para trabalho, estudo ou gaming.',
    intro: 'Notebooks variam muito em preco e configuracao. Entenda o que importa para cada tipo de uso.',
    sections: [
      { title: 'Processador', content: 'Intel Core i5/i7 ou AMD Ryzen 5/7 para produtividade. Apple M3 para ecossistema Mac. Evite Celeron/Pentium para uso principal.' },
      { title: 'Memoria RAM', content: '8GB e o minimo aceitavel. 16GB para programacao e multitarefa pesada. 32GB para edicao de video.' },
      { title: 'Armazenamento', content: 'SSD NVMe e obrigatorio. 256GB minimo, 512GB ideal. HD mecanico so para backup.' },
      { title: 'Tela', content: 'IPS Full HD e o padrao. OLED para criacao de conteudo. Evite TN e resolucoes abaixo de Full HD.' },
      { title: 'Para Quem e Cada Tipo', content: 'Ultrabook: mobilidade. Gaming: desempenho. Workstation: profissional. 2-em-1: versatilidade.' },
    ],
    relatedCategories: ['notebooks'],
    relatedComparisons: ['macbook-air-vs-thinkpad'],
    relatedBestPages: ['melhores-notebooks', 'melhores-notebooks-custo-beneficio'],
    faqs: [
      { q: 'Notebook bom e barato existe?', a: 'Sim. Na faixa de R$2500-3500, e possivel encontrar notebooks com Ryzen 5, 8GB RAM e SSD 256GB que atendem bem para estudo e trabalho.' },
      { q: 'SSD ou HD?', a: 'Sempre SSD. A diferenca de velocidade e gigantesca — o notebook liga em segundos e programas abrem instantaneamente.' },
      { q: 'Placa de video dedicada e necessaria?', a: 'So se voce joga, faz edicao de video ou modelagem 3D. Para uso geral, a integrada e suficiente.' },
    ],
  },
  'como-escolher-fone-bluetooth': {
    slug: 'como-escolher-fone-bluetooth',
    title: 'Como Escolher o Melhor Fone Bluetooth em 2025',
    description: 'Guia completo: in-ear vs over-ear, ANC, codec, bateria e custo-beneficio para fones Bluetooth.',
    intro: 'O mercado de fones Bluetooth explodiu. TWS, over-ear, ANC, codec aptX... este guia simplifica sua decisao.',
    sections: [
      { title: 'Tipos de Fone', content: 'TWS (true wireless): compacto, sem fio. Over-ear: conforto e qualidade. Neckband: esporte.' },
      { title: 'Cancelamento de Ruido (ANC)', content: 'ANC ativo reduz ruido ambiente. Essencial para transporte publico e escritorio. Modelos de entrada ja oferecem ANC decente.' },
      { title: 'Qualidade de Audio e Codecs', content: 'SBC e basico. AAC para Apple. aptX e LDAC para Android com alta qualidade. Drivers maiores geralmente soam melhor.' },
      { title: 'Bateria', content: 'TWS: 6-8h e bom, com case ate 30h. Over-ear: 30-40h e padrao premium.' },
      { title: 'Conforto e Ajuste', content: 'Para uso prolongado, peso e encaixe importam muito. Pontas de silicone em varios tamanhos sao essenciais para TWS.' },
    ],
    relatedCategories: ['fones-bluetooth'],
    relatedComparisons: ['airpods-pro-vs-galaxy-buds'],
    relatedBestPages: ['melhores-fones-bluetooth'],
    faqs: [
      { q: 'AirPods vale a pena?', a: 'Para iPhone, sim — a integracao e perfeita. Para Android, existem alternativas com melhor custo-beneficio como Galaxy Buds e Edifier.' },
      { q: 'Fone bom ate R$200?', a: 'Edifier X3, QCY MeloBuds e Redmi Buds 4 oferecem boa qualidade nessa faixa.' },
      { q: 'Over-ear ou in-ear?', a: 'Over-ear para conforto em uso longo e qualidade sonora. In-ear/TWS para portabilidade e esporte.' },
    ],
  },
  'como-escolher-air-fryer': {
    slug: 'como-escolher-air-fryer',
    title: 'Como Escolher a Melhor Air Fryer em 2025',
    description: 'Guia completo: capacidade, potencia, funcoes e marcas para escolher a air fryer ideal.',
    intro: 'Air fryers viraram item essencial na cozinha brasileira. Mas qual tamanho e marca escolher?',
    sections: [
      { title: 'Capacidade', content: '3-4L para 1-2 pessoas. 5-6L para familias. Acima de 7L para familias grandes ou quem cozinha em quantidade.' },
      { title: 'Potencia', content: 'Minimo 1400W para eficiencia. Modelos de 1700-2000W sao mais rapidos e uniformes.' },
      { title: 'Funcoes Extras', content: 'Timer digital, desligamento automatico e receitas pre-programadas sao diferenciais uteis.' },
      { title: 'Marcas Confiaveis', content: 'Philips Walita, Mondial, Britania e Cadence sao as mais populares no Brasil com bom suporte.' },
    ],
    relatedCategories: ['casa-cozinha'],
    relatedComparisons: ['air-fryer-mondial-vs-philips'],
    relatedBestPages: ['melhores-air-fryers'],
    faqs: [
      { q: 'Air fryer gasta muita energia?', a: 'Menos que um forno convencional. Uma sessao de 20 min consome cerca de 0.5 kWh.' },
      { q: 'Qual a melhor capacidade para familia de 4?', a: '5-6 litros e ideal. Permite preparar porcoes generosas sem precisar fazer em duas levas.' },
    ],
  },
}

export const BUYING_GUIDE_SLUGS = Object.keys(BUYING_GUIDES)
