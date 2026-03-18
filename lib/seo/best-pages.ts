export interface BestPageDef {
  title: string
  description: string
  intro: string
  query: {
    categories?: string[]
    brands?: string[]
    keywords?: string[]
  }
  faqs: { q: string; a: string }[]
}

export const BEST_PAGES: Record<string, BestPageDef> = {
  'melhores-celulares': {
    title: 'Melhores Celulares',
    description: 'Os melhores celulares com preços comparados em tempo real. Smartphones com descontos reais, frete grátis e cashback.',
    intro: 'Escolher o celular certo pode ser desafiador com tantas opções no mercado. Reunimos os smartphones com melhor custo-benefício, analisando preço real, avaliações de compradores e histórico de preços para garantir que você faça a melhor escolha.',
    query: { categories: ['celulares'] },
    faqs: [
      { q: 'Como o PromoSnap escolhe os melhores celulares?', a: 'Nosso algoritmo analisa o score de oferta de cada smartphone, considerando preço atual vs. histórico, avaliações reais, volume de vendas e disponibilidade em múltiplas lojas.' },
      { q: 'Os preços de celulares são atualizados em tempo real?', a: 'Sim. Monitoramos os preços várias vezes ao dia em todos os marketplaces parceiros, garantindo que você sempre veja o valor mais recente.' },
      { q: 'Vale a pena comprar celular importado?', a: 'Depende do modelo e da loja. Mostramos ofertas de lojas nacionais e internacionais para que você compare garantia, prazo de entrega e preço final com impostos.' },
      { q: 'Como saber se um desconto de celular é real?', a: 'O PromoSnap mostra o histórico de preços de cada produto. Se o preço atual está abaixo da média dos últimos 30 dias, o desconto é real.' },
    ],
  },
  'melhores-smartphones-custo-beneficio': {
    title: 'Melhores Smartphones Custo-Benefício',
    description: 'Smartphones com o melhor custo-benefício do mercado. Compare preços e encontre o celular ideal sem estourar o orçamento.',
    intro: 'Nem sempre o celular mais caro é o melhor. Selecionamos smartphones que entregam a melhor experiência pelo menor preço, equilibrando câmera, bateria, desempenho e qualidade de tela em cada faixa de preço.',
    query: { categories: ['celulares'], keywords: ['custo beneficio', 'intermediario'] },
    faqs: [
      { q: 'Qual faixa de preço é considerada custo-benefício?', a: 'Smartphones entre R$800 e R$2.500 geralmente oferecem o melhor equilíbrio entre recursos e preço. Acima disso, os ganhos são incrementais.' },
      { q: 'Celular intermediário serve para jogos?', a: 'Sim, modelos intermediários com processadores como Snapdragon 7 Gen 1 ou Dimensity 7200 rodam a maioria dos jogos com boa fluidez.' },
      { q: 'Qual marca oferece melhor custo-benefício?', a: 'Samsung, Motorola e Xiaomi dominam a faixa intermediária no Brasil, cada uma com pontos fortes em câmera, bateria ou software.' },
    ],
  },
  'melhores-notebooks': {
    title: 'Melhores Notebooks',
    description: 'Os melhores notebooks com preços comparados. Encontre o notebook ideal para trabalho, estudo ou jogos com descontos reais.',
    intro: 'Encontrar o notebook perfeito exige equilibrar desempenho, preço e portabilidade. Selecionamos os melhores notebooks disponíveis no mercado brasileiro, com preços verificados e histórico real para que você compre no melhor momento.',
    query: { categories: ['notebooks'] },
    faqs: [
      { q: 'Qual a diferença entre notebook e ultrabook?', a: 'Ultrabooks são notebooks mais finos e leves, geralmente com SSDs e processadores de baixo consumo. São ideais para portabilidade, enquanto notebooks tradicionais oferecem mais desempenho por preço menor.' },
      { q: 'Quanto de RAM é recomendado em 2026?', a: 'Para uso básico, 8GB é suficiente. Para multitarefa e edição de fotos, 16GB. Para edição de vídeo ou jogos, 32GB é o ideal.' },
      { q: 'Os preços incluem frete?', a: 'Indicamos quando o frete é grátis com o badge correspondente. O preço final pode variar com o frete dependendo da sua região.' },
      { q: 'Como funciona a garantia de notebooks online?', a: 'Notebooks comprados em marketplaces como Amazon e Mercado Livre contam com garantia do fabricante. Verifique se o vendedor é oficial ou autorizado.' },
    ],
  },
  'melhores-notebooks-gamer': {
    title: 'Melhores Notebooks Gamer',
    description: 'Os melhores notebooks gamer com preços comparados. Notebooks com GPU dedicada, tela 144Hz e descontos reais.',
    intro: 'Notebooks gamer exigem um investimento maior, por isso é essencial encontrar o melhor preço. Comparamos os principais modelos com GPU dedicada, tela de alta taxa de atualização e refrigeração eficiente para você jogar sem lag.',
    query: { categories: ['notebooks'], keywords: ['gamer', 'gaming'] },
    faqs: [
      { q: 'Qual placa de vídeo mínima para jogos em 2026?', a: 'Para jogos em Full HD com qualidade média-alta, uma RTX 4050 ou equivalente é o mínimo recomendado. Para 1440p, considere RTX 4060 ou superior.' },
      { q: 'Tela de 144Hz faz diferença em notebook gamer?', a: 'Sim, a diferença é perceptível em jogos competitivos como FPS e corrida. Para jogos casuais e RPGs, 60Hz já é suficiente.' },
      { q: 'Notebook gamer serve para trabalho?', a: 'Sim, notebooks gamer são excelentes para edição de vídeo, modelagem 3D e outras tarefas pesadas, graças à GPU dedicada e ao processador potente.' },
    ],
  },
  'melhores-fones-bluetooth': {
    title: 'Melhores Fones Bluetooth',
    description: 'Os melhores fones de ouvido Bluetooth com preço comparado. TWS, over-ear e neckband com as melhores ofertas.',
    intro: 'O mercado de fones Bluetooth explodiu nos últimos anos, com opções que vão de modelos acessíveis a audiofilia. Selecionamos os fones com melhor custo-benefício, qualidade de som comprovada e preços monitorados em tempo real.',
    query: { categories: ['audio'], keywords: ['bluetooth', 'fone', 'headphone'] },
    faqs: [
      { q: 'Qual a diferença entre TWS, over-ear e neckband?', a: 'TWS são fones totalmente sem fio. Over-ear cobrem toda a orelha com melhor isolamento. Neckband ficam ao redor do pescoço com fio entre os fones.' },
      { q: 'ANC realmente funciona?', a: 'Sim, o cancelamento ativo de ruído faz diferença significativa. Modelos premium eliminam até 90% do ruído ambiente.' },
      { q: 'Quanto tempo dura a bateria de fones Bluetooth?', a: 'Fones TWS duram entre 4-8 horas, com case estendendo para 20-36 horas. Over-ear podem durar 20-60 horas.' },
    ],
  },
  'melhores-fones-cancelamento-ruido': {
    title: 'Melhores Fones com Cancelamento de Ruído',
    description: 'Os melhores fones com cancelamento de ruído ativo (ANC). Compare preços de Sony, Bose, Apple e mais.',
    intro: 'Se você trabalha em ambientes barulhentos, viaja de avião ou simplesmente quer silêncio, fones com ANC são essenciais. Selecionamos os modelos com melhor cancelamento de ruído e preço justo no mercado brasileiro.',
    query: { categories: ['audio'], keywords: ['cancelamento', 'anc', 'noise cancelling'] },
    faqs: [
      { q: 'Qual o melhor fone ANC atualmente?', a: 'Sony WH-1000XM5 e Bose QuietComfort Ultra lideram em cancelamento. Para TWS, AirPods Pro e Sony WF-1000XM5 são referência.' },
      { q: 'Fone ANC barato funciona bem?', a: 'Modelos abaixo de R$300 oferecem ANC básico que reduz ruído constante como ventilador e motor. Para cancelamento premium, invista a partir de R$500.' },
      { q: 'ANC faz mal para a audição?', a: 'Não. ANC não emite som prejudicial. Ao contrário, ao reduzir ruído externo, você tende a ouvir música em volume menor, protegendo sua audição.' },
    ],
  },
  'melhores-smart-tvs': {
    title: 'Melhores Smart TVs',
    description: 'As melhores Smart TVs com preço comparado. 4K, OLED e QLED com as melhores ofertas do mercado.',
    intro: 'Com tantas tecnologias de tela disponíveis, escolher a TV certa ficou mais complexo. Comparamos Smart TVs 4K, OLED, QLED e LED de todas as faixas de preço para ajudar você a encontrar a melhor opção para sua sala.',
    query: { categories: ['smart-tvs'] },
    faqs: [
      { q: 'Qual a diferença entre OLED, QLED e LED?', a: 'OLED oferece preto perfeito e melhor contraste. QLED oferece cores vibrantes e brilho alto. LED é a tecnologia mais acessível para a maioria dos usos.' },
      { q: 'Qual o tamanho de TV ideal para minha sala?', a: 'A distância até a TV deve ser 1.5x o tamanho da tela. Para 2 metros, 50-55 polegadas. Para 3 metros, 65 polegadas ou mais.' },
      { q: 'Smart TV precisa de TV Box?', a: 'A maioria das Smart TVs modernas roda apps nativamente. TV Boxes complementam TVs mais antigas ou com sistema operacional limitado.' },
      { q: '120Hz faz diferença para filmes?', a: 'Para filmes e séries, 60Hz é suficiente. 120Hz faz diferença real em jogos e esportes ao vivo.' },
    ],
  },
  'melhores-tvs-55-polegadas': {
    title: 'Melhores TVs 55 Polegadas',
    description: 'As melhores TVs de 55 polegadas com preço comparado. O tamanho ideal para a maioria das salas.',
    intro: '55 polegadas é o tamanho mais popular de TV no Brasil, oferecendo o equilíbrio perfeito entre imersão e espaço. Comparamos as melhores TVs de 55" para ajudar você a escolher entre LED, QLED e OLED no melhor preço.',
    query: { categories: ['smart-tvs'], keywords: ['55', '55 polegadas'] },
    faqs: [
      { q: 'TV de 55 polegadas é grande demais para apartamento?', a: 'Não. Para uma distância de 2 a 2.5 metros, 55 polegadas é o tamanho ideal. É o mais vendido no Brasil por se adaptar bem à maioria dos ambientes.' },
      { q: 'Qual a melhor TV 55 polegadas barata?', a: 'TVs LED 4K de marcas como Samsung, LG e TCL oferecem boa qualidade a partir de R$2.000. Para melhor custo-benefício, fique atento às promoções.' },
      { q: 'Vale a pena TV OLED de 55"?', a: 'Se o orçamento permite, OLED oferece qualidade de imagem superior. Mas QLED é uma excelente alternativa mais acessível com cores vibrantes.' },
    ],
  },
  'melhores-air-fryers': {
    title: 'Melhores Air Fryers',
    description: 'As melhores air fryers com preço comparado. Fritadeiras sem óleo de 3L a 12L com descontos reais.',
    intro: 'Air fryers se tornaram indispensáveis na cozinha brasileira. Comparamos os modelos mais populares, desde opções compactas até air fryers família, com preços reais e avaliações de quem já comprou.',
    query: { categories: ['casa'], keywords: ['air fryer', 'fritadeira'] },
    faqs: [
      { q: 'Qual o tamanho ideal de air fryer?', a: 'Para 1-2 pessoas, 3-4L. Para famílias, 5-7L. Para uso intenso ou famílias maiores, 8L+.' },
      { q: 'Air fryer gasta muita energia?', a: 'Consomem entre 1000W e 2000W, mas como cozinham mais rápido que fornos, o consumo total por refeição tende a ser menor.' },
      { q: 'Vale a pena air fryer digital?', a: 'Modelos digitais oferecem controle preciso de temperatura e timer, além de receitas pré-programadas. A diferença de preço geralmente compensa.' },
    ],
  },
  'melhores-cadeiras-gamer': {
    title: 'Melhores Cadeiras Gamer',
    description: 'As melhores cadeiras gamer com preço comparado. Conforto para longas sessões de jogo ou trabalho.',
    intro: 'Uma boa cadeira é investimento em saúde e produtividade. Selecionamos as cadeiras gamer que combinam ergonomia, durabilidade e preço justo, ideais tanto para gamers quanto para quem trabalha muitas horas sentado.',
    query: { categories: ['casa'], keywords: ['cadeira gamer', 'cadeira escritorio'] },
    faqs: [
      { q: 'Cadeira gamer é boa para trabalho?', a: 'Sim, desde que tenha apoio lombar ajustável e encosto reclinável. Muitas cadeiras gamer oferecem ergonomia superior a cadeiras de escritório na mesma faixa de preço.' },
      { q: 'Qual o peso máximo suportado?', a: 'A maioria das cadeiras gamer suporta entre 100kg e 150kg. Verifique a especificação do fabricante para garantir compatibilidade.' },
      { q: 'Cadeira gamer de couro ou tecido?', a: 'Tecido mesh é mais fresco para climas quentes como o Brasil. Couro sintético é mais fácil de limpar mas pode esquentar.' },
    ],
  },
  'melhores-smartwatches': {
    title: 'Melhores Smartwatches',
    description: 'Os melhores smartwatches com preço comparado. Apple Watch, Galaxy Watch, Amazfit e mais.',
    intro: 'Smartwatches evoluíram de acessórios para ferramentas de saúde e produtividade. Comparamos os principais modelos do mercado para ajudar você a encontrar o relógio inteligente ideal para seu estilo de vida e orçamento.',
    query: { categories: ['wearables'], keywords: ['smartwatch', 'relogio inteligente'] },
    faqs: [
      { q: 'Smartwatch funciona sem celular?', a: 'A maioria requer conexão com smartphone para funcionalidade completa. Modelos com LTE podem fazer chamadas e usar dados independentemente.' },
      { q: 'Qual o melhor smartwatch para saúde?', a: 'Apple Watch e Samsung Galaxy Watch lideram em sensores de saúde. Amazfit oferece boa relação custo-benefício com monitoramento cardíaco e SpO2.' },
      { q: 'Quanto tempo dura a bateria?', a: 'Apple Watch dura 1-2 dias. Galaxy Watch 2-3 dias. Modelos Amazfit e Garmin podem durar 1-2 semanas dependendo do uso.' },
    ],
  },
  'melhores-perfumes': {
    title: 'Melhores Perfumes',
    description: 'Os melhores perfumes com preço comparado. Masculinos, femininos e unissex com descontos verificados.',
    intro: 'Perfumes são um investimento pessoal que merece pesquisa de preço. Comparamos fragrâncias em diversas lojas para que você encontre seu perfume preferido pelo menor preço, com garantia de originalidade.',
    query: { categories: ['perfumes'], keywords: ['perfume', 'fragrancia', 'colonia'] },
    faqs: [
      { q: 'Como saber se o perfume é original?', a: 'Compre apenas em lojas autorizadas. O PromoSnap lista apenas marketplaces confiáveis. Verifique o código de barras e a embalagem ao receber.' },
      { q: 'Qual a diferença entre EDT, EDP e Parfum?', a: 'EDT tem 5-15% de concentração e dura 4-6h. EDP tem 15-20% e dura 6-8h. Parfum tem 20-30% e pode durar o dia todo.' },
      { q: 'Perfume importado é muito mais caro?', a: 'Nem sempre. Em promoções, perfumes importados podem ficar próximos do preço de nacionais. Monitorar o histórico ajuda a comprar no momento certo.' },
    ],
  },
  'melhores-presentes': {
    title: 'Melhores Presentes',
    description: 'Os melhores presentes com preço comparado. Ideias de presente para todas as ocasiões e orçamentos.',
    intro: 'Encontrar o presente perfeito não precisa ser caro. Reunimos produtos populares de diversas categorias que fazem sucesso como presente, desde eletrônicos até itens de beleza, todos com preço comparado em tempo real.',
    query: { keywords: ['presente', 'gift', 'kit'] },
    faqs: [
      { q: 'Quais são os presentes mais populares?', a: 'Fones Bluetooth, smartwatches, perfumes e acessórios tech lideram as buscas. Air fryers e cafeteiras também são presentes muito bem recebidos.' },
      { q: 'Como encontrar presentes baratos e bons?', a: 'Use filtros de preço e ordene por melhor oferta. Muitos produtos com ótimo custo-benefício ficam abaixo de R$200.' },
      { q: 'Posso devolver um presente comprado online?', a: 'Sim, o Código do Consumidor garante 7 dias de arrependimento para compras online. Verifique a política de troca da loja antes de comprar.' },
    ],
  },
  'melhores-teclados-mecanicos': {
    title: 'Melhores Teclados Mecanicos',
    description: 'Os melhores teclados mecanicos com preco comparado. Switches, layouts e marcas com os melhores descontos.',
    intro: 'Teclados mecanicos oferecem precisao, durabilidade e uma experiencia de digitacao superior. Comparamos os modelos mais populares do mercado brasileiro, desde opcoes entry-level ate teclados custom, com precos monitorados em tempo real.',
    query: { categories: ['perifericos'], keywords: ['teclado mecanico', 'teclado gamer', 'keyboard'] },
    faqs: [
      { q: 'Qual switch e melhor para jogos?', a: 'Switches lineares como Cherry MX Red ou Gateron Red sao os mais populares para jogos por serem rapidos e suaves. Tactile como Brown sao versateis para jogos e digitacao.' },
      { q: 'Teclado mecanico vale a pena?', a: 'Sim. A durabilidade (50-100 milhoes de toques), a precisao e o conforto justificam o investimento, especialmente para quem digita muito ou joga diariamente.' },
      { q: 'TKL ou full-size?', a: 'TKL (sem numpad) economiza espaco na mesa e e ideal para gamers. Full-size e melhor para quem usa numeros frequentemente, como em planilhas.' },
    ],
  },
  'melhores-panelas-eletricas': {
    title: 'Melhores Panelas Eletricas',
    description: 'As melhores panelas eletricas com preco comparado. Panelas de pressao, arrozeiras e multicookers com descontos reais.',
    intro: 'Panelas eletricas revolucionaram a cozinha, oferecendo praticidade e seguranca. Comparamos panelas de pressao eletricas, arrozeiras e multicookers para ajudar voce a escolher o modelo ideal para sua rotina.',
    query: { categories: ['casa'], keywords: ['panela eletrica', 'panela pressao', 'multicooker', 'arrozeira'] },
    faqs: [
      { q: 'Panela eletrica e segura?', a: 'Sim. Panelas eletricas modernas possuem multiplas valvulas de seguranca e sensores de pressao que eliminam o risco de acidentes comuns em panelas de pressao tradicionais.' },
      { q: 'Qual o tamanho ideal?', a: 'Para 1-2 pessoas, 3-4L. Para familias de 3-5 pessoas, 5-6L. Para familias maiores ou meal prep, 8L ou mais.' },
      { q: 'Multicooker substitui outros aparelhos?', a: 'Sim, multicookers podem substituir panela de pressao, arrozeira, yogurteira e ate air fryer em alguns modelos, economizando espaco na cozinha.' },
    ],
  },
  'melhores-aspiradores-robo': {
    title: 'Melhores Aspiradores Robo',
    description: 'Os melhores aspiradores robo com preco comparado. Navegacao laser, mop integrado e base auto-esvaziamento.',
    intro: 'Aspiradores robo sao um investimento em tempo e praticidade. Comparamos modelos com navegacao inteligente, succao potente e funcao mop para ajudar voce a encontrar o robo ideal para sua casa.',
    query: { categories: ['casa'], keywords: ['aspirador robo', 'robo aspirador', 'roomba'] },
    faqs: [
      { q: 'Aspirador robo funciona em casa com pets?', a: 'Sim, e e ate recomendado. Modelos com succao acima de 2500Pa lidam bem com pelos de animais. Prefira modelos com escova anti-emaranhamento.' },
      { q: 'Navegacao laser vs camera, qual melhor?', a: 'Laser (LiDAR) e mais preciso e funciona no escuro. Camera e mais barata mas pode falhar em ambientes escuros. Para melhor custo-beneficio, prefira laser.' },
      { q: 'Base auto-esvaziamento vale a pena?', a: 'Sim, especialmente para casas maiores ou com pets. A base armazena sujeira por semanas, reduzindo a manutencao a quase zero.' },
    ],
  },
  'melhores-monitores-4k': {
    title: 'Melhores Monitores 4K',
    description: 'Os melhores monitores 4K com preco comparado. IPS, VA e OLED para trabalho, jogos e criacao de conteudo.',
    intro: 'Monitores 4K oferecem nitidez impressionante para trabalho, entretenimento e criacao. Comparamos os melhores modelos do mercado brasileiro, desde opcoes acessiveis ate monitores profissionais.',
    query: { categories: ['monitores'], keywords: ['monitor 4k', 'monitor uhd', '4k'] },
    faqs: [
      { q: 'Monitor 4K vale a pena para trabalho?', a: 'Sim, especialmente para programacao, design e planilhas. A resolucao extra permite ver mais conteudo na tela com textos mais nitidos.' },
      { q: 'Qual tamanho ideal para 4K?', a: '27 polegadas e o sweet spot para 4K em mesa. 32 polegadas e otimo para quem senta mais longe. Abaixo de 27", a diferenca entre 4K e QHD e sutil.' },
      { q: 'IPS, VA ou OLED para 4K?', a: 'IPS oferece melhor precisao de cor e angulos de visao. VA tem melhor contraste e pretos mais profundos. OLED e superior em tudo, mas custa significativamente mais.' },
    ],
  },
  'melhores-tablets': {
    title: 'Melhores Tablets',
    description: 'Os melhores tablets com preco comparado. iPad, Samsung Galaxy Tab e mais — compare modelos para trabalho, estudo e entretenimento.',
    intro: 'Tablets sao dispositivos versateis para trabalho, estudo e entretenimento. Comparamos os principais modelos do mercado brasileiro, desde opcoes acessiveis ate tablets premium, com precos monitorados em tempo real para voce encontrar a melhor oferta.',
    query: { keywords: ['tablet'] },
    faqs: [
      { q: 'iPad ou Samsung Galaxy Tab: qual escolher?', a: 'O iPad oferece melhor ecossistema de apps otimizados e longevidade de software. O Galaxy Tab tem mais flexibilidade com Android, suporte a DeX e geralmente custa menos no Brasil.' },
      { q: 'Quanto de armazenamento e recomendado em um tablet?', a: 'Para uso basico (navegacao e streaming), 64GB e suficiente. Para estudo e trabalho com documentos, 128GB. Para desenho, edicao e jogos pesados, 256GB ou mais.' },
      { q: 'Tablet WiFi ou com chip celular (4G/5G)?', a: 'A versao WiFi atende a maioria dos usuarios e custa menos. A versao celular e ideal para quem precisa de internet movel fora de casa sem depender de hotspot do celular.' },
    ],
  },
  'melhores-cafeteiras': {
    title: 'Melhores Cafeteiras',
    description: 'As melhores cafeteiras com preco comparado. Cafeteiras de capsulas, espresso, coador e mais com descontos reais.',
    intro: 'Encontrar a cafeteira ideal e o primeiro passo para um cafe perfeito em casa. Comparamos cafeteiras de capsulas, espresso e tradicionais de diversas marcas, com precos monitorados em todas as lojas para voce encontrar a melhor oferta.',
    query: { keywords: ['cafeteira'] },
    faqs: [
      { q: 'Cafeteira de capsula ou tradicional: qual compensa mais?', a: 'Cafeteiras de capsula sao mais praticas e consistentes, mas o custo por xicara e maior. Cafeteiras tradicionais e espresso tem custo menor por cafe e oferecem mais controle sobre o preparo.' },
      { q: 'Quais sao as melhores marcas de cafeteira?', a: 'Nespresso e Dolce Gusto lideram em capsulas. Para espresso, DeLonghi e Tramontina sao referencia. Para coador eletrico, Mondial e Britania oferecem otimo custo-beneficio.' },
      { q: 'Como fazer a manutencao da cafeteira?', a: 'Faca a descalcificacao a cada 2-3 meses com solucao propria ou vinagre diluido. Limpe o reservatorio semanalmente e troque filtros conforme recomendacao do fabricante.' },
    ],
  },
  'melhores-caixas-som-bluetooth': {
    title: 'Melhores Caixas de Som Bluetooth',
    description: 'As melhores caixas de som Bluetooth com preco comparado. Portateis, a prova dagua e potentes com descontos verificados.',
    intro: 'Caixas de som Bluetooth sao companheiras perfeitas para festas, viagens e uso no dia a dia. Comparamos modelos portateis, resistentes a agua e de alta potencia de marcas como JBL, Sony, Harman Kardon e mais, com precos atualizados em tempo real.',
    query: { keywords: ['caixa som bluetooth'] },
    faqs: [
      { q: 'Qual a melhor caixa de som Bluetooth para uso ao ar livre?', a: 'Para uso externo, priorize modelos com certificacao IP67 ou superior, como JBL Flip e Charge ou Sony SRS-XB. Eles resistem a agua, poeira e quedas leves.' },
      { q: 'Quanto tempo dura a bateria de uma caixa Bluetooth?', a: 'Modelos compactos duram entre 8-12 horas. Caixas maiores como JBL Charge e Boombox podem durar 15-24 horas. O volume alto reduz a autonomia em ate 30%.' },
      { q: 'JBL ou concorrentes: qual marca escolher?', a: 'JBL lidera em popularidade e custo-beneficio no Brasil. Sony oferece graves mais potentes, Harman Kardon tem design premium e som refinado, e Marshall agrada quem busca estetica vintage.' },
    ],
  },
  'melhores-tenis-corrida': {
    title: 'Melhores Tênis de Corrida',
    description: 'Os melhores tênis de corrida com preços comparados. Nike, Adidas, Asics, New Balance e mais com descontos reais.',
    intro: 'Escolher o tênis de corrida certo impacta diretamente seu desempenho e conforto. Comparamos os principais modelos de marcas como Nike, Adidas, Asics e New Balance, analisando amortecimento, durabilidade, peso e preço para você encontrar o par ideal.',
    query: { categories: ['tenis'], keywords: ['corrida', 'running'] },
    faqs: [
      { q: 'Qual o melhor tênis de corrida para iniciantes?', a: 'Para iniciantes, modelos com bom amortecimento e estabilidade são ideais. Nike Revolution, Asics Gel-Contend e Adidas Duramo são ótimas opções com preço acessível.' },
      { q: 'Tênis de corrida precisa ser trocado a cada quantos km?', a: 'A recomendação é trocar entre 500-800km de uso. O amortecimento perde eficiência gradualmente, aumentando o risco de lesões.' },
      { q: 'Qual a diferença entre tênis neutro e estável?', a: 'Tênis neutros são para pisada neutra ou supinada, com amortecimento uniforme. Tênis estáveis têm suporte extra no arco para corredores com pisada pronada.' },
      { q: 'Nike ou Asics para corrida?', a: 'Asics é referência em amortecimento e durabilidade para corridas longas. Nike lidera em leveza e design para corridas rápidas. Ambas são excelentes — depende do seu estilo.' },
    ],
  },
  'melhores-tenis-casual': {
    title: 'Melhores Tênis Casual',
    description: 'Os melhores tênis casual com preços comparados. Nike Air Force, Adidas Superstar, New Balance 574 e mais com descontos.',
    intro: 'Tênis casual combinam estilo e conforto para o dia a dia. Selecionamos os modelos mais desejados de Nike, Adidas, New Balance e Puma com preços verificados em múltiplas lojas para você encontrar o melhor negócio.',
    query: { categories: ['tenis'], keywords: ['casual', 'lifestyle'] },
    faqs: [
      { q: 'Qual o tênis casual mais versátil?', a: 'Nike Air Force 1, Adidas Stan Smith e New Balance 574 são os modelos mais versáteis, combinando com praticamente qualquer look casual.' },
      { q: 'Tênis branco como conservar?', a: 'Limpe regularmente com escova macia e sabão neutro. Use protetor impermeabilizante e evite máquina de lavar. Guarde em local seco e arejado.' },
      { q: 'Qual marca tem melhor custo-benefício em tênis casual?', a: 'Puma e New Balance oferecem excelente custo-benefício na faixa de R$200-400. Nike e Adidas cobram premium pela marca mas têm mais modelos icônicos.' },
    ],
  },
  'melhores-tenis-custo-beneficio': {
    title: 'Melhores Tênis Custo-Benefício',
    description: 'Tênis com melhor custo-benefício do mercado. Compare preços e encontre o par ideal sem estourar o orçamento.',
    intro: 'Encontrar um tênis bom e barato é possível se você souber onde procurar. Reunimos os modelos com melhor relação preço-qualidade, comparando amortecimento, durabilidade e conforto em cada faixa de preço.',
    query: { categories: ['tenis'], keywords: ['custo beneficio', 'barato', 'promoção'] },
    faqs: [
      { q: 'Quanto custa um bom tênis em 2026?', a: 'Na faixa de R$150-300 você encontra tênis de boa qualidade para uso casual. Para corrida, a partir de R$250 já existem modelos com amortecimento decente.' },
      { q: 'Tênis barato vale a pena?', a: 'Modelos entry-level de grandes marcas (Nike Revolution, Adidas Duramo, Puma Softride) são baratos e confiáveis. Evite marcas desconhecidas sem avaliações.' },
      { q: 'Onde encontrar os melhores descontos em tênis?', a: 'O PromoSnap monitora preços em Amazon, Mercado Livre, Shopee e Magazine Luiza. Datas como Black Friday, Dia do Consumidor e trocas de coleção oferecem os maiores descontos.' },
    ],
  },
  'melhores-celulares-ate-1500': {
    title: 'Melhores Celulares até R$ 1.500',
    description: 'Os melhores celulares até R$ 1.500 com preços comparados. Smartphones intermediários com melhor custo-benefício.',
    intro: 'A faixa até R$ 1.500 concentra os smartphones com melhor custo-benefício do mercado brasileiro. Comparamos modelos de Samsung, Motorola, Xiaomi e mais para ajudar você a escolher o celular ideal nesse orçamento.',
    query: { categories: ['celulares'], keywords: ['até 1500', 'intermediário', 'custo benefício'] },
    faqs: [
      { q: 'Qual o melhor celular até R$ 1.500 em 2026?', a: 'Galaxy A54, Motorola Moto G84 e Xiaomi Redmi Note 13 Pro são as melhores opções nessa faixa, cada um com pontos fortes em câmera, bateria ou desempenho.' },
      { q: 'Celular até R$ 1.500 roda jogos?', a: 'Sim, modelos com Snapdragon 695 ou superior rodam a maioria dos jogos com qualidade média. Para jogos pesados em alta qualidade, considere a faixa acima de R$ 2.000.' },
      { q: 'Vale esperar promoção ou comprar agora?', a: 'Use o histórico de preços do PromoSnap para verificar. Se o preço atual está abaixo da média dos últimos 30 dias, é uma boa hora para comprar.' },
    ],
  },
  'melhores-notebooks-ate-3000': {
    title: 'Melhores Notebooks até R$ 3.000',
    description: 'Os melhores notebooks até R$ 3.000 com preços comparados. Notebooks para trabalho e estudo com custo-benefício.',
    intro: 'Notebooks até R$ 3.000 são a escolha mais popular para estudantes e profissionais. Comparamos modelos de Lenovo, Acer, Samsung e Dell que oferecem bom desempenho, tela decente e SSD nessa faixa de preço.',
    query: { categories: ['notebooks'], keywords: ['até 3000', 'estudar', 'trabalho'] },
    faqs: [
      { q: 'Qual o melhor notebook até R$ 3.000 para estudar?', a: 'Lenovo IdeaPad e Acer Aspire lideram nessa faixa. Priorize modelos com 8GB RAM, SSD de 256GB e processador Intel i5 ou Ryzen 5.' },
      { q: 'Notebook com SSD faz diferença?', a: 'Sim, enorme. Um SSD torna o notebook até 5x mais rápido no boot e abertura de programas comparado a HD mecânico. É o upgrade mais impactante nessa faixa.' },
      { q: 'Tela IPS ou TN nessa faixa de preço?', a: 'Sempre prefira IPS quando disponível. Telas TN têm cores desbotadas e ângulos de visão ruins. Muitos notebooks até R$ 3.000 já oferecem IPS Full HD.' },
    ],
  },
  // ═══════ NEW: high-intent commercial pages ═══════
  'melhores-perfumes-masculinos': {
    title: 'Melhores Perfumes Masculinos',
    description: 'Os melhores perfumes masculinos com precos comparados. Fragancias com melhor custo-beneficio e avaliacao.',
    intro: 'Escolher um perfume masculino e muito pessoal, mas o preco nao precisa ser misterio. Comparamos precos de perfumes nacionais e importados em todas as lojas para voce encontrar sua fragrancia ideal pelo melhor preco.',
    query: { categories: ['beleza'], keywords: ['perfume masculino', 'colonia masculina'] },
    faqs: [
      { q: 'Qual o melhor perfume masculino custo-beneficio?', a: 'Malbec do Boticario e Kaiak da Natura sao excelentes opcoes nacionais. Para importados, 212 VIP e Bleu de Chanel lideram em avaliacao.' },
      { q: 'Onde comprar perfume mais barato?', a: 'Compare precos entre Mercado Livre, Amazon e lojas oficiais. Fique atento ao historico de precos para aproveitar descontos reais.' },
    ],
  },
  'melhores-ferramentas-eletricas': {
    title: 'Melhores Ferramentas Eletricas',
    description: 'As melhores ferramentas eletricas com precos comparados. Parafusadeiras, furadeiras e mais com desconto.',
    intro: 'Ferramentas eletricas sao investimento de longo prazo. Comparamos precos de Bosch, DeWalt, Makita e Tramontina para voce montar sua bancada sem pagar caro.',
    query: { categories: ['ferramentas'], keywords: ['parafusadeira', 'furadeira', 'serra'] },
    faqs: [
      { q: 'Qual a melhor parafusadeira custo-beneficio?', a: 'A Bosch GSB 12V e a mais recomendada para uso domestico. Para uso profissional, DeWalt e Makita lideram.' },
      { q: 'Parafusadeira a bateria ou com fio?', a: 'A bateria e muito mais pratica para 90% dos usos domesticos. Com fio so compensa para trabalho pesado continuo.' },
    ],
  },
  'melhores-brinquedos': {
    title: 'Melhores Brinquedos',
    description: 'Os melhores brinquedos com precos comparados. LEGO, Barbie, Hot Wheels e mais com desconto.',
    intro: 'Brinquedos sao presentes que marcam. Comparamos precos entre todas as lojas para voce encontrar os melhores brinquedos sem pagar a mais, especialmente em datas sazonais como Natal e Dia das Criancas.',
    query: { categories: ['brinquedos'], keywords: ['LEGO', 'Barbie', 'Hot Wheels', 'brinquedo'] },
    faqs: [
      { q: 'Quando brinquedos ficam mais baratos?', a: 'Janeiro e marco costumam ter os melhores precos. Antes do Dia das Criancas (outubro) e Natal os precos sobem. Use o historico do PromoSnap para comparar.' },
      { q: 'LEGO original vs compativel?', a: 'LEGO original tem qualidade e encaixe superiores, mas custa mais. Para criancas pequenas, blocos compativeis podem ser uma boa opcao inicial.' },
    ],
  },
  // ── NOVOS — Cluster smartphones ──────────────────────────────
  'melhores-celulares-samsung': {
    title: 'Melhores Celulares Samsung',
    description: 'Os melhores celulares Samsung com preço comparado. Galaxy S, A e M com histórico real e descontos verificados.',
    intro: 'A Samsung domina o mercado brasileiro de smartphones com uma linha completa que vai do básico Galaxy M ao flagship Galaxy S. Selecionamos os melhores modelos de cada linha com base em preço real, avaliações e histórico de quedas.',
    query: { categories: ['celulares'], brands: ['Samsung'], keywords: ['samsung', 'galaxy'] },
    faqs: [
      { q: 'Qual a diferença entre Galaxy S, A e M?', a: 'Galaxy S são os flagships premium da Samsung. Galaxy A são os intermediários com ótimo custo-benefício. Galaxy M são os mais acessíveis, focados em bateria e preço.' },
      { q: 'Galaxy S24 ou Galaxy A55: qual escolher?', a: 'Para máxima performance e câmera, Galaxy S24. Para custo-benefício no dia a dia, Galaxy A55 entrega 80% do S24 por metade do preço.' },
      { q: 'Celulares Samsung têm atualização longa?', a: 'Sim. Samsung garante 4 anos de atualizações Android e 5 anos de segurança para a linha Galaxy S e A a partir de 2023.' },
      { q: 'Samsung One UI é boa interface?', a: 'One UI é uma das melhores interfaces Android do mercado, com recursos exclusivos como DeX, Link to Windows e ferramentas de produtividade avançadas.' },
    ],
  },

  // ── NOVOS — Cluster notebooks ──────────────────────────────
  'melhores-notebooks-trabalho': {
    title: 'Melhores Notebooks para Trabalho',
    description: 'Os melhores notebooks para trabalho remoto, home office e escritório em 2026. Compare preços com histórico real.',
    intro: 'Trabalhar de onde quiser exige um notebook confiável, leve e com bateria que dura o dia todo. Selecionamos os melhores laptops para home office e trabalho remoto, equilibrando desempenho, autonomia e custo-benefício.',
    query: { categories: ['notebooks'], keywords: ['trabalho', 'home office', 'empresarial', 'escritorio'] },
    faqs: [
      { q: 'Qual o melhor processador para trabalho em 2026?', a: 'Intel Core Ultra 5/7 ou AMD Ryzen 7 série 8000 são excelentes para trabalho. Para máxima autonomia, processadores ARM como Apple M3 e Snapdragon X Elite lideram.' },
      { q: 'Quanto de RAM é suficiente para trabalho?', a: 'Para a maioria das tarefas, 16GB RAM e SSD 512GB são o ponto ideal. Se você usa muitas abas ou ferramentas pesadas, 32GB garante mais tranquilidade.' },
      { q: 'Vale a pena notebook com tela 2K para trabalho?', a: 'Sim, para trabalho com textos e planilhas, uma tela de 14" com resolução 2K (2560×1600) é significativamente mais confortável que Full HD.' },
    ],
  },

  // ── NOVOS — Cluster eletrodomésticos ──────────────────────────────
  'melhores-geladeiras': {
    title: 'Melhores Geladeiras',
    description: 'As melhores geladeiras com preços comparados em 2026. Frost free, duplex e inverse com histórico real de preços.',
    intro: 'Escolher uma geladeira é uma decisão de longo prazo — você vai usá-la por mais de 10 anos. Comparamos os modelos mais vendidos em capacidade, eficiência energética, tecnologia frost free e custo-benefício real.',
    query: { categories: ['eletrodomesticos'], keywords: ['geladeira', 'refrigerador', 'frost free', 'inverter'] },
    faqs: [
      { q: 'Frost free ou ciclo frio?', a: 'Frost free é superior para praticidade — não forma gelo e o resfriamento é mais uniforme. Ciclo frio é mais barato, mas exige degelo manual periódico.' },
      { q: 'Geladeira inverter vale mais?', a: 'Sim para economizar energia. Geladeiras inverter ajustam o compressor à necessidade, economizando até 40% de energia em relação às convencionais.' },
      { q: 'Qual capacidade ideal para cada família?', a: 'Para 1-2 pessoas: 300-350L. Para 3-4 pessoas: 400-450L. Para famílias maiores: 500L+. Prefira ter uma margem extra de capacidade.' },
      { q: 'Qual a melhor marca de geladeira?', a: 'Brastemp e Consul (Whirlpool) lideram em assistência técnica no Brasil. LG e Samsung oferecem mais tecnologia com boa durabilidade.' },
    ],
  },
  'melhores-micro-ondas': {
    title: 'Melhores Micro-ondas',
    description: 'Os melhores micro-ondas em 2026. Compare preços de micro-ondas de bancada, com grill e inverter nas melhores lojas.',
    intro: 'O micro-ondas é um dos eletrodomésticos mais usados da cozinha. Com modelos simples a partir de R$300 até combinados grill por R$1.500+, ajudamos você a encontrar o modelo certo para sua rotina e orçamento.',
    query: { categories: ['eletrodomesticos'], keywords: ['micro-ondas', 'microondas', 'forno micro-ondas'] },
    faqs: [
      { q: 'Micro-ondas com grill vale a pena?', a: 'Se você quer gratinar, dourar e assar além de aquecer, sim. Micro-ondas com grill substitui o forno para preparações rápidas e ocupa menos espaço.' },
      { q: 'Qual a potência ideal de micro-ondas?', a: 'Para uso básico, 700-900W é suficiente. Para cozinhar de verdade e preparações mais rápidas, busque 1.000-1.200W.' },
      { q: 'Micro-ondas inverter é melhor?', a: 'Sim para descongelar e cozinhar uniformemente. O inverter regula a potência continuamente, evitando pontos quentes e preservando melhor a textura dos alimentos.' },
    ],
  },
  'melhores-cafeteiras-espresso': {
    title: 'Melhores Cafeteiras Espresso',
    description: 'As melhores cafeteiras espresso e de cápsula em 2026. Compare Nespresso, Dolce Gusto, 3 Corações e mais.',
    intro: 'O café em casa evoluiu muito. De cápsulas rápidas à espresso verdadeiro, cada estilo tem seu equipamento ideal. Comparamos as melhores máquinas de café por categoria: cápsula, pressão e filtro premium, com preços históricos verificados.',
    query: { categories: ['eletrodomesticos'], keywords: ['cafeteira', 'espresso', 'capsula', 'nespresso'] },
    faqs: [
      { q: 'Nespresso ou Dolce Gusto: qual escolher?', a: 'Nespresso usa pressão maior (19 bar) e produz espresso mais cremoso. Dolce Gusto oferece mais variedade de bebidas (choco, cappuccino) e cápsulas mais baratas.' },
      { q: 'Cafeteira de pressão vs cápsula: qual é melhor?', a: 'Cafeteiras de pressão (como De\'Longhi) fazem espresso de qualidade barista. Cápsulas são mais práticas e rápidas, mas o custo por xícara é mais alto.' },
      { q: 'Quanto custa o café em cápsula por mês?', a: 'Uma cápsula Nespresso custa em média R$3-5. Tomando 2 cafés/dia, são R$180-300/mês. Cafeteiras de pressão reduzem para R$1-2 por xícara com café em pó.' },
    ],
  },

  // ── NOVOS — Cluster audio ──────────────────────────────
  'melhores-headphones-gamer': {
    title: 'Melhores Headphones Gamer',
    description: 'Os melhores headphones e fones para jogos em 2026. Som surround, microfone embutido e conforto para longas sessões.',
    intro: 'Um bom headphone gamer faz diferença real em jogos online — você ouve passos, tiros e sons ambientes que outros jogadores perdem. Selecionamos os melhores headsets com som surround, microfone claro e conforto para sessões longas.',
    query: { categories: ['audio'], keywords: ['headphone gamer', 'headset', 'fone gamer', 'surround'] },
    faqs: [
      { q: 'Som surround vale a pena em headphone gamer?', a: 'Para FPS competitivo como CS2 e Valorant, som surround virtual faz diferença real na localização de inimigos. Para jogos single-player, é opcional.' },
      { q: 'Headphone gamer com fio ou sem fio?', a: 'Fio garante zero latência — essencial para competitivo. Sem fio é mais prático para uso casual. Evite sem fio para jogos em que 20ms de delay importa.' },
      { q: 'Qual a diferença entre headphone gamer e de música?', a: 'Headphones gamer priorizam frequências médias e altas (sons de passos, disparos). Headphones de música têm resposta mais plana ou bass-boost para som mais natural.' },
    ],
  },

  // ── NOVOS — Cluster gaming ──────────────────────────────
  'melhores-monitores-gamer': {
    title: 'Melhores Monitores Gamer',
    description: 'Os melhores monitores para jogos em 2026. 144Hz, 240Hz, 1ms e QHD com preços comparados e descontos reais.',
    intro: 'Um monitor gamer rápido é tão importante quanto a placa de vídeo. Com telas de 144Hz a 360Hz, 1ms de resposta e painel IPS ou VA, selecionamos os melhores monitores para cada configuração e orçamento.',
    query: { categories: ['monitores'], keywords: ['monitor gamer', 'monitor 144hz', 'monitor 240hz', 'tela gamer'] },
    faqs: [
      { q: '144Hz ou 240Hz: qual escolher?', a: 'Para jogos competitivos em alta resolução, 144Hz com QHD é o melhor custo-benefício. 240Hz+ só se justifica com GPU de alto nível e foco em FPS competitivo.' },
      { q: 'IPS ou VA para jogos?', a: 'IPS tem melhor qualidade de cor e ângulos de visão — ideal para RPGs e jogos coloridos. VA tem contraste superior e pretos mais profundos — ótimo para jogos de terror e filmes.' },
      { q: '27" ou 32" para jogos?', a: 'Para Full HD, 27" é o máximo recomendado. Para QHD (1440p), 27"-32" é ideal. Para 4K, 32"+ aproveita melhor a resolução.' },
    ],
  },

  // ── NOVOS — Cluster wearables ──────────────────────────────
  'melhores-pulseiras-fitness': {
    title: 'Melhores Pulseiras Fitness',
    description: 'As melhores pulseiras fitness e smartbands em 2026. Xiaomi Mi Band, Fitbit, Garmin e mais com preços comparados.',
    intro: 'Quer monitorar sua saúde sem gastar o mesmo que um smartwatch? Pulseiras fitness oferecem monitor cardíaco, contagem de passos, sono e notificações por uma fração do preço. Comparamos as melhores para você.',
    query: { categories: ['wearables'], keywords: ['pulseira fitness', 'smartband', 'xiaomi band', 'fitbit'] },
    faqs: [
      { q: 'Pulseira fitness ou smartwatch: o que comprar?', a: 'Se você quer só monitoramento de saúde e notificações simples, pulseira fitness é mais barata e mais leve. Se quer apps, pagamento e mais recursos, vá de smartwatch.' },
      { q: 'Xiaomi Band vale a pena?', a: 'Sim. O Mi Band 8 oferece monitoramento de frequência cardíaca, SpO2, sono e GPS conectado por menos de R$300 — o melhor custo-benefício da categoria.' },
    ],
  },

  // ── NOVOS — Cluster tênis ──────────────────────────────
  'melhores-tenis-academia': {
    title: 'Melhores Tênis para Academia',
    description: 'Os melhores tênis para musculação, crossfit e treinos funcionais em 2026. Compare preços com histórico real.',
    intro: 'Tênis para academia são diferentes de tênis de corrida. Você precisa de estabilidade lateral, amortecimento moderado e solado plano para agachamentos e levantamentos. Selecionamos os melhores para cada tipo de treino.',
    query: { categories: ['tenis'], keywords: ['tenis academia', 'crossfit', 'musculação', 'treino funcional'] },
    faqs: [
      { q: 'Tênis de corrida serve para academia?', a: 'Não é ideal. Tênis de corrida têm amortecimento alto no calcanhar que prejudica estabilidade em agachamentos. Para academia, busque modelos de treino ou cross training.' },
      { q: 'Qual a diferença entre tênis cross training e musculação?', a: 'Cross training é mais versátil — serve para HIIT, funcional e musculação leve. Para musculação pesada, tênis de levantamento com solado plano e rígido são superiores.' },
    ],
  },

  // ── NOVOS — Cluster perfumes ──────────────────────────────
  'melhores-perfumes-femininos': {
    title: 'Melhores Perfumes Femininos',
    description: 'Os melhores perfumes femininos em 2026. Florais, orientais e frescos com preços comparados e histórico real.',
    intro: 'O mercado de perfumes femininos é vasto, com fragrâncias que vão de florais leves a orientais intensos. Reunimos os perfumes com melhor fixação, avaliação e custo-benefício no mercado brasileiro, das versões nacionais às importadas acessíveis.',
    query: { categories: ['perfumes'], keywords: ['perfume feminino', 'fragancia feminina', 'colonia feminina', 'eau de parfum'] },
    faqs: [
      { q: 'Qual perfume feminino tem mais fixação?', a: 'Perfumes orientais e amaderados têm maior fixação — podem durar 8-12 horas. Frescos e cítricos fixam por 3-5 horas. Concentrações EDP (Eau de Parfum) fixam mais que EDT.' },
      { q: 'Perfume nacional ou importado para mulher?', a: 'O Brasil tem ótimas opções nacionais como Natura, O Boticário e Eudora. Para perfumes internacionais de luxo, a diferença de qualidade justifica o preço em muitos casos.' },
      { q: 'Como conservar perfume feminino?', a: 'Guarde longe de luz solar e calor. A melhor opção é na caixa original em local fresco e seco. Evite o banheiro, que tem variação de temperatura e umidade.' },
    ],
  },

  // ── NOVOS — Cluster presentes / brinquedos ──────────────────────────────
  'melhores-presentes-criancas': {
    title: 'Melhores Presentes para Crianças',
    description: 'Os melhores presentes para crianças de todas as idades em 2026. Brinquedos educativos, jogos e kits com preços comparados.',
    intro: 'Escolher o presente certo para uma criança envolve faixa etária, interesse e segurança. Selecionamos brinquedos que equilibram diversão, aprendizado e qualidade, desde opções para bebês até adolescentes, com preços verificados em tempo real.',
    query: { categories: ['brinquedos'], keywords: ['presente crianca', 'brinquedo educativo', 'lego', 'boneca'] },
    faqs: [
      { q: 'Qual brinquedo para criança de 2-4 anos?', a: 'Blocos de montar (LEGO DUPLO), massinha de modelar, brinquedos de encaixe e carrinhos simples são ótimos para desenvolvimento motor e cognitivo nessa faixa.' },
      { q: 'Brinquedo importado tem garantia no Brasil?', a: 'Verifique se tem certificação INMETRO — obrigatória para brinquedos. Produtos importados sem certificação podem não ter assistência técnica no país.' },
      { q: 'Qual o budget ideal para presente de criança?', a: 'R$80-150 resolve bem para a maioria das ocasiões. Para presentes especiais, R$200-400 permite brinquedos de maior qualidade. LEGO e jogos de tabuleiro têm ótimo valor duradouro.' },
    ],
  },
  // smart-tvs, aspiradores-robo, cafeteiras, notebooks-gamer already defined above
}

export const BEST_PAGE_SLUGS = Object.keys(BEST_PAGES)
