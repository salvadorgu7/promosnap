/**
 * PromoSnap — Topical Authority Clusters
 *
 * Source of truth for the site's topical authority map.
 * Each cluster defines:
 *   - hub: the main category/landing page for the cluster
 *   - melhores: which /melhores/ pages belong to this cluster
 *   - comparisons: which /comparar/ pages belong to this cluster
 *   - offers: which /ofertas/ pages belong to this cluster
 *   - valeAPena: which /vale-a-pena/ pages belong to this cluster
 *   - faixas: which /faixa-preco/ pages belong to this cluster
 *   - keywords: core search terms that define the cluster
 *   - relatedClusters: sibling clusters for cross-linking
 *   - priority: 1=highest, 5=lowest (commercial potential × traffic potential)
 */

export interface ClusterSatellite {
  /** Route path relative to site root */
  href: string
  /** Link label shown in interlinking blocks */
  label: string
  /** Whether this satellite page already exists in the codebase */
  exists: boolean
}

export interface ClusterDef {
  /** Unique cluster ID — matches category slug */
  id: string
  /** Display name for the cluster */
  name: string
  /** Hub page href */
  hub: string
  /** Hub label */
  hubLabel: string
  /** Primary keywords driving the cluster */
  keywords: string[]
  /** Category slugs in the DB that map to this cluster */
  categorySlugs: string[]
  /** /melhores/ satellite pages */
  melhores: ClusterSatellite[]
  /** /comparar/ satellite pages */
  comparisons: ClusterSatellite[]
  /** /ofertas/ satellite pages */
  offers: ClusterSatellite[]
  /** /vale-a-pena/ satellite pages */
  valeAPena: ClusterSatellite[]
  /** /faixa-preco/ satellite pages */
  faixas: ClusterSatellite[]
  /** Related cluster IDs for cross-linking */
  relatedClusters: string[]
  /** Commercial priority 1 (highest) to 5 (lowest) */
  priority: 1 | 2 | 3 | 4 | 5
  /** Seasonal relevance months (1-12). Empty = evergreen. */
  seasonalMonths?: number[]
}

export const CLUSTERS: Record<string, ClusterDef> = {
  // ─────────────────────────────────────────────────────────
  // CLUSTER 1 — SMARTPHONES & CELULARES (priority 1)
  // ─────────────────────────────────────────────────────────
  smartphones: {
    id: 'smartphones',
    name: 'Celulares & Smartphones',
    hub: '/categoria/celulares',
    hubLabel: 'Todos os Celulares',
    keywords: ['celular', 'smartphone', 'iphone', 'samsung galaxy', 'xiaomi', 'motorola', 'redmi'],
    categorySlugs: ['celulares', 'smartphones'],
    priority: 1,
    melhores: [
      { href: '/melhores/melhores-celulares', label: 'Melhores Celulares', exists: true },
      { href: '/melhores/melhores-smartphones-custo-beneficio', label: 'Melhores Smartphones Custo-Benefício', exists: true },
      { href: '/melhores/melhores-celulares-ate-1500', label: 'Melhores Celulares até R$1.500', exists: true },
      { href: '/melhores/melhores-celulares-samsung', label: 'Melhores Celulares Samsung', exists: false },
    ],
    comparisons: [
      { href: '/comparar/iphone-15-vs-galaxy-s24', label: 'iPhone 15 vs Galaxy S24', exists: true },
      { href: '/comparar/iphone-15-vs-iphone-14', label: 'iPhone 15 vs iPhone 14', exists: true },
      { href: '/comparar/iphone-15-vs-galaxy-s23', label: 'iPhone 15 vs Galaxy S23', exists: true },
      { href: '/comparar/galaxy-a54-vs-moto-g84', label: 'Galaxy A54 vs Moto G84', exists: true },
      { href: '/comparar/redmi-note-13-vs-galaxy-a54', label: 'Redmi Note 13 vs Galaxy A54', exists: true },
      { href: '/comparar/samsung-vs-xiaomi', label: 'Samsung vs Xiaomi: qual comprar?', exists: false },
    ],
    offers: [
      { href: '/ofertas/iphone', label: 'Ofertas iPhone', exists: true },
      { href: '/ofertas/galaxy-s24', label: 'Ofertas Galaxy S24', exists: true },
      { href: '/ofertas/celulares-samsung', label: 'Ofertas Celulares Samsung', exists: false },
    ],
    valeAPena: [
      { href: '/vale-a-pena/vale-a-pena-smartphone-caro', label: 'Smartphone caro vale a pena?', exists: false },
    ],
    faixas: [
      { href: '/faixa-preco/celulares-ate-1000', label: 'Celulares até R$1.000', exists: false },
      { href: '/faixa-preco/celulares-ate-2000', label: 'Celulares até R$2.000', exists: false },
      { href: '/faixa-preco/celulares-ate-3000', label: 'Celulares até R$3.000', exists: false },
    ],
    relatedClusters: ['wearables', 'audio'],
  },

  // ─────────────────────────────────────────────────────────
  // CLUSTER 2 — NOTEBOOKS & COMPUTADORES (priority 1)
  // ─────────────────────────────────────────────────────────
  notebooks: {
    id: 'notebooks',
    name: 'Notebooks & Computadores',
    hub: '/categoria/notebooks',
    hubLabel: 'Todos os Notebooks',
    keywords: ['notebook', 'laptop', 'computador', 'macbook', 'chromebook', 'ultrabook'],
    categorySlugs: ['notebooks', 'computadores'],
    priority: 1,
    melhores: [
      { href: '/melhores/melhores-notebooks', label: 'Melhores Notebooks', exists: true },
      { href: '/melhores/melhores-notebooks-gamer', label: 'Melhores Notebooks Gamer', exists: true },
      { href: '/melhores/melhores-notebooks-ate-3000', label: 'Melhores Notebooks até R$3.000', exists: true },
      { href: '/melhores/melhores-notebooks-trabalho', label: 'Melhores Notebooks para Trabalho', exists: false },
    ],
    comparisons: [
      { href: '/comparar/macbook-air-vs-thinkpad', label: 'MacBook Air vs ThinkPad', exists: true },
      { href: '/comparar/macbook-air-vs-ideapad', label: 'MacBook Air vs IdeaPad', exists: true },
      { href: '/comparar/dell-inspiron-vs-asus-vivobook', label: 'Dell Inspiron vs ASUS VivoBook', exists: true },
      { href: '/comparar/notebook-gamer-vs-desktop-gamer', label: 'Notebook Gamer vs Desktop Gamer', exists: true },
      { href: '/comparar/notebook-windows-vs-macbook', label: 'Notebook Windows vs MacBook', exists: false },
    ],
    offers: [
      { href: '/ofertas/notebook', label: 'Ofertas Notebook', exists: true },
    ],
    valeAPena: [
      { href: '/vale-a-pena/vale-a-pena-macbook', label: 'MacBook vale a pena?', exists: false },
    ],
    faixas: [
      { href: '/faixa-preco/notebooks-ate-2000', label: 'Notebooks até R$2.000', exists: false },
      { href: '/faixa-preco/notebooks-ate-4000', label: 'Notebooks até R$4.000', exists: false },
    ],
    relatedClusters: ['gaming', 'monitores'],
  },

  // ─────────────────────────────────────────────────────────
  // CLUSTER 3 — AUDIO (priority 2)
  // ─────────────────────────────────────────────────────────
  audio: {
    id: 'audio',
    name: 'Fones & Áudio',
    hub: '/categoria/audio',
    hubLabel: 'Todos os Fones e Caixas de Som',
    keywords: ['fone', 'headphone', 'earbuds', 'caixa de som', 'bluetooth', 'tws', 'anc'],
    categorySlugs: ['audio', 'fones-de-ouvido', 'caixas-de-som'],
    priority: 2,
    melhores: [
      { href: '/melhores/melhores-fones-bluetooth', label: 'Melhores Fones Bluetooth', exists: true },
      { href: '/melhores/melhores-fones-cancelamento-ruido', label: 'Melhores Fones com Cancelamento de Ruído', exists: true },
      { href: '/melhores/melhores-caixas-som-bluetooth', label: 'Melhores Caixas de Som Bluetooth', exists: true },
      { href: '/melhores/melhores-headphones-gamer', label: 'Melhores Headphones Gamer', exists: false },
    ],
    comparisons: [
      { href: '/comparar/airpods-pro-vs-galaxy-buds', label: 'AirPods Pro vs Galaxy Buds', exists: true },
      { href: '/comparar/airpods-vs-galaxy-buds', label: 'AirPods vs Galaxy Buds', exists: true },
      { href: '/comparar/jbl-flip-vs-sony-srs', label: 'JBL Flip vs Sony SRS', exists: true },
      { href: '/comparar/headphone-vs-earbuds', label: 'Headphone vs Earbuds: qual é melhor?', exists: false },
      { href: '/comparar/jbl-vs-marshall', label: 'JBL vs Marshall: qual caixa de som comprar?', exists: false },
    ],
    offers: [
      { href: '/ofertas/fone-bluetooth', label: 'Ofertas Fone Bluetooth', exists: true },
      { href: '/ofertas/ofertas-som-audio', label: 'Ofertas Som & Áudio', exists: true },
    ],
    valeAPena: [
      { href: '/vale-a-pena/vale-a-pena-airpods', label: 'AirPods valem a pena?', exists: false },
      { href: '/vale-a-pena/vale-a-pena-cancelamento-ruido', label: 'Fone com cancelamento de ruído vale a pena?', exists: false },
    ],
    faixas: [
      { href: '/faixa-preco/fones-ate-300', label: 'Fones de Ouvido até R$300', exists: false },
    ],
    relatedClusters: ['smartphones', 'gaming'],
  },

  // ─────────────────────────────────────────────────────────
  // CLUSTER 4 — TV & SMART TV (priority 2)
  // ─────────────────────────────────────────────────────────
  smarttv: {
    id: 'smarttv',
    name: 'Smart TVs',
    hub: '/categoria/smart-tvs',
    hubLabel: 'Todas as Smart TVs',
    keywords: ['smart tv', 'televisão', '4k', 'qled', 'oled', '55 polegadas', '65 polegadas'],
    categorySlugs: ['smart-tvs', 'televisores', 'tvs'],
    priority: 2,
    melhores: [
      { href: '/melhores/melhores-smart-tvs', label: 'Melhores Smart TVs', exists: true },
      { href: '/melhores/melhores-tvs-55-polegadas', label: 'Melhores TVs 55 Polegadas', exists: true },
      { href: '/melhores/melhores-tvs-4k-custo-beneficio', label: 'Melhores TVs 4K Custo-Benefício', exists: false },
    ],
    comparisons: [
      { href: '/comparar/monitor-ips-vs-va', label: 'TV QLED vs OLED: qual vale mais?', exists: false },
      { href: '/comparar/smart-tv-samsung-vs-lg', label: 'Smart TV Samsung vs LG', exists: false },
    ],
    offers: [
      { href: '/ofertas/smart-tv-55', label: 'Ofertas Smart TV 55"', exists: true },
    ],
    valeAPena: [
      { href: '/vale-a-pena/vale-a-pena-tv-oled', label: 'TV OLED vale a pena?', exists: false },
    ],
    faixas: [
      { href: '/faixa-preco/smart-tvs-ate-2000', label: 'Smart TVs até R$2.000', exists: false },
      { href: '/faixa-preco/smart-tvs-ate-4000', label: 'Smart TVs até R$4.000', exists: false },
    ],
    relatedClusters: ['gaming', 'casa-inteligente'],
  },

  // ─────────────────────────────────────────────────────────
  // CLUSTER 5 — ELETRODOMÉSTICOS / COZINHA (priority 2)
  // ─────────────────────────────────────────────────────────
  eletrodomesticos: {
    id: 'eletrodomesticos',
    name: 'Eletrodomésticos & Cozinha',
    hub: '/categoria/eletrodomesticos',
    hubLabel: 'Todos os Eletrodomésticos',
    keywords: ['air fryer', 'fritadeira', 'cafeteira', 'panela elétrica', 'micro-ondas', 'geladeira', 'fogão'],
    categorySlugs: ['eletrodomesticos', 'cozinha', 'fogoes-geladeiras'],
    priority: 2,
    melhores: [
      { href: '/melhores/melhores-air-fryers', label: 'Melhores Air Fryers', exists: true },
      { href: '/melhores/melhores-panelas-eletricas', label: 'Melhores Panelas Elétricas', exists: true },
      { href: '/melhores/melhores-cafeteiras', label: 'Melhores Cafeteiras', exists: true },
      { href: '/melhores/melhores-geladeiras', label: 'Melhores Geladeiras', exists: false },
      { href: '/melhores/melhores-micro-ondas', label: 'Melhores Micro-ondas', exists: false },
      { href: '/melhores/melhores-cafeteiras-espresso', label: 'Melhores Cafeteiras Espresso', exists: false },
    ],
    comparisons: [
      { href: '/comparar/air-fryer-mondial-vs-philips', label: 'Air Fryer Mondial vs Philips', exists: true },
      { href: '/comparar/fritadeira-air-fryer-vs-forno', label: 'Air Fryer vs Forno Elétrico', exists: true },
      { href: '/comparar/cafeteira-expresso-vs-nespresso', label: 'Cafeteira Expresso vs Nespresso', exists: false },
      { href: '/comparar/geladeira-frost-free-vs-inverter', label: 'Geladeira Frost Free vs Inverter', exists: false },
    ],
    offers: [
      { href: '/ofertas/air-fryer', label: 'Ofertas Air Fryer', exists: true },
      { href: '/ofertas/cozinha', label: 'Ofertas para Cozinha', exists: true },
      { href: '/ofertas/cafeteiras', label: 'Ofertas Cafeteiras', exists: false },
      { href: '/ofertas/geladeiras', label: 'Ofertas Geladeiras', exists: false },
    ],
    valeAPena: [
      { href: '/vale-a-pena/vale-a-pena-air-fryer', label: 'Air Fryer vale a pena?', exists: true },
      { href: '/vale-a-pena/vale-a-pena-nespresso', label: 'Nespresso vale a pena?', exists: false },
    ],
    faixas: [
      { href: '/faixa-preco/air-fryers-ate-400', label: 'Air Fryers até R$400', exists: false },
    ],
    relatedClusters: ['casa-inteligente'],
    seasonalMonths: [5, 6, 12], // Dia das Mães, Dia dos Pais, Natal
  },

  // ─────────────────────────────────────────────────────────
  // CLUSTER 6 — GAMING (priority 2)
  // ─────────────────────────────────────────────────────────
  gaming: {
    id: 'gaming',
    name: 'Games & Gaming',
    hub: '/categoria/games',
    hubLabel: 'Games & Consoles',
    keywords: ['ps5', 'xbox', 'nintendo switch', 'console', 'jogo', 'gaming', 'game', 'playstation'],
    categorySlugs: ['games', 'consoles', 'acessorios-gamer'],
    priority: 2,
    melhores: [
      { href: '/melhores/melhores-cadeiras-gamer', label: 'Melhores Cadeiras Gamer', exists: true },
      { href: '/melhores/melhores-teclados-mecanicos', label: 'Melhores Teclados Mecânicos', exists: true },
      { href: '/melhores/melhores-monitores-4k', label: 'Melhores Monitores 4K', exists: true },
      { href: '/melhores/melhores-headphones-gamer', label: 'Melhores Headphones Gamer', exists: false },
    ],
    comparisons: [
      { href: '/comparar/ps5-vs-xbox-series-x', label: 'PS5 vs Xbox Series X', exists: true },
      { href: '/comparar/nintendo-switch-vs-ps5', label: 'Nintendo Switch vs PS5', exists: true },
      { href: '/comparar/notebook-gamer-vs-desktop-gamer', label: 'Notebook Gamer vs Desktop Gamer', exists: true },
      { href: '/comparar/cadeira-gamer-vs-escritorio', label: 'Cadeira Gamer vs Escritório', exists: true },
      { href: '/comparar/monitor-ips-vs-va', label: 'Monitor IPS vs VA', exists: true },
    ],
    offers: [
      { href: '/ofertas/ps5', label: 'Ofertas PS5', exists: true },
      { href: '/ofertas/monitor-gamer', label: 'Ofertas Monitor Gamer', exists: true },
      { href: '/ofertas/gaming-setup', label: 'Ofertas Gaming Setup', exists: true },
    ],
    valeAPena: [
      { href: '/vale-a-pena/vale-a-pena-ps5', label: 'PS5 vale a pena?', exists: false },
      { href: '/vale-a-pena/vale-a-pena-cadeira-gamer', label: 'Cadeira Gamer vale a pena?', exists: false },
    ],
    faixas: [
      { href: '/faixa-preco/cadeiras-gamer-ate-1000', label: 'Cadeiras Gamer até R$1.000', exists: false },
    ],
    relatedClusters: ['notebooks', 'audio', 'monitores'],
    seasonalMonths: [12, 1], // Natal, Janeiro (volta às aulas)
  },

  // ─────────────────────────────────────────────────────────
  // CLUSTER 7 — WEARABLES (priority 3)
  // ─────────────────────────────────────────────────────────
  wearables: {
    id: 'wearables',
    name: 'Wearables & Smartwatches',
    hub: '/categoria/wearables',
    hubLabel: 'Smartwatches & Wearables',
    keywords: ['smartwatch', 'relogio inteligente', 'apple watch', 'galaxy watch', 'pulseira fitness', 'xiaomi band'],
    categorySlugs: ['wearables', 'smartwatches', 'relogios-inteligentes'],
    priority: 3,
    melhores: [
      { href: '/melhores/melhores-smartwatches', label: 'Melhores Smartwatches', exists: true },
      { href: '/melhores/melhores-pulseiras-fitness', label: 'Melhores Pulseiras Fitness', exists: false },
    ],
    comparisons: [
      { href: '/comparar/galaxy-watch-vs-apple-watch', label: 'Galaxy Watch vs Apple Watch', exists: true },
      { href: '/comparar/smartwatch-samsung-vs-xiaomi', label: 'Samsung Watch vs Xiaomi Band', exists: false },
    ],
    offers: [
      { href: '/ofertas/ofertas-smartwatch', label: 'Ofertas Smartwatch', exists: true },
    ],
    valeAPena: [
      { href: '/vale-a-pena/vale-a-pena-apple-watch', label: 'Apple Watch vale a pena?', exists: false },
    ],
    faixas: [
      { href: '/faixa-preco/smartwatches-ate-500', label: 'Smartwatches até R$500', exists: false },
    ],
    relatedClusters: ['smartphones', 'audio'],
    seasonalMonths: [6, 12], // Dia dos Pais, Natal
  },

  // ─────────────────────────────────────────────────────────
  // CLUSTER 8 — TÊNIS & CALÇADOS (priority 3)
  // ─────────────────────────────────────────────────────────
  tenis: {
    id: 'tenis',
    name: 'Tênis & Calçados',
    hub: '/categoria/tenis',
    hubLabel: 'Todos os Tênis',
    keywords: ['tenis', 'calçado', 'nike', 'adidas', 'puma', 'new balance', 'corrida', 'casual'],
    categorySlugs: ['tenis', 'calcados', 'esportes'],
    priority: 3,
    melhores: [
      { href: '/melhores/melhores-tenis-corrida', label: 'Melhores Tênis de Corrida', exists: true },
      { href: '/melhores/melhores-tenis-casual', label: 'Melhores Tênis Casuais', exists: true },
      { href: '/melhores/melhores-tenis-custo-beneficio', label: 'Melhores Tênis Custo-Benefício', exists: true },
      { href: '/melhores/melhores-tenis-academia', label: 'Melhores Tênis para Academia', exists: false },
    ],
    comparisons: [
      { href: '/comparar/nike-air-max-vs-adidas-ultraboost', label: 'Nike Air Max vs Adidas Ultraboost', exists: true },
      { href: '/comparar/new-balance-574-vs-nike-air-force-1', label: 'New Balance 574 vs Nike Air Force 1', exists: true },
      { href: '/comparar/nike-revolution-vs-adidas-duramo', label: 'Nike Revolution vs Adidas Duramo', exists: true },
      { href: '/comparar/adidas-vs-puma', label: 'Adidas vs Puma: qual marca comprar?', exists: false },
      { href: '/comparar/tenis-corrida-vs-academia', label: 'Tênis de Corrida vs Academia: diferenças', exists: false },
    ],
    offers: [
      { href: '/ofertas/tenis', label: 'Ofertas Tênis', exists: false },
    ],
    valeAPena: [
      { href: '/vale-a-pena/vale-a-pena-tenis-caro', label: 'Tênis caro vale a pena?', exists: false },
    ],
    faixas: [
      { href: '/faixa-preco/tenis-ate-300', label: 'Tênis até R$300', exists: false },
      { href: '/faixa-preco/tenis-ate-500', label: 'Tênis até R$500', exists: false },
    ],
    relatedClusters: ['presentes'],
    seasonalMonths: [1, 2, 3], // Janeiro–Março (verão, academia)
  },

  // ─────────────────────────────────────────────────────────
  // CLUSTER 9 — PERFUMES & BELEZA (priority 3)
  // ─────────────────────────────────────────────────────────
  perfumes: {
    id: 'perfumes',
    name: 'Perfumes & Beleza',
    hub: '/categoria/perfumes',
    hubLabel: 'Todos os Perfumes',
    keywords: ['perfume', 'colônia', 'eau de parfum', 'desodorante', 'beleza', 'cosméticos'],
    categorySlugs: ['perfumes', 'beleza', 'cosmeticos'],
    priority: 3,
    melhores: [
      { href: '/melhores/melhores-perfumes', label: 'Melhores Perfumes', exists: true },
      { href: '/melhores/melhores-perfumes-masculinos', label: 'Melhores Perfumes Masculinos', exists: true },
      { href: '/melhores/melhores-perfumes-femininos', label: 'Melhores Perfumes Femininos', exists: false },
      { href: '/melhores/melhores-perfumes-custo-beneficio', label: 'Melhores Perfumes Custo-Benefício', exists: false },
    ],
    comparisons: [
      { href: '/comparar/perfume-nacional-vs-importado', label: 'Perfume Nacional vs Importado: vale a diferença?', exists: false },
      { href: '/comparar/eau-de-parfum-vs-eau-de-toilette', label: 'Eau de Parfum vs Eau de Toilette', exists: false },
    ],
    offers: [
      { href: '/ofertas/perfumes', label: 'Ofertas Perfumes', exists: false },
    ],
    valeAPena: [
      { href: '/vale-a-pena/vale-a-pena-perfume-importado', label: 'Perfume importado vale a pena?', exists: false },
    ],
    faixas: [
      { href: '/faixa-preco/perfumes-ate-200', label: 'Perfumes até R$200', exists: false },
    ],
    relatedClusters: ['presentes'],
    seasonalMonths: [5, 6, 12], // Dia das Mães, Dia dos Pais, Natal
  },

  // ─────────────────────────────────────────────────────────
  // CLUSTER 10 — BRINQUEDOS & PRESENTES (priority 3)
  // ─────────────────────────────────────────────────────────
  presentes: {
    id: 'presentes',
    name: 'Brinquedos & Presentes',
    hub: '/categoria/brinquedos',
    hubLabel: 'Brinquedos & Presentes',
    keywords: ['brinquedo', 'presente', 'lego', 'boneca', 'carrinho', 'natal', 'criança', 'kit'],
    categorySlugs: ['brinquedos', 'presentes'],
    priority: 3,
    melhores: [
      { href: '/melhores/melhores-brinquedos', label: 'Melhores Brinquedos', exists: true },
      { href: '/melhores/melhores-presentes', label: 'Melhores Presentes', exists: true },
      { href: '/melhores/melhores-brinquedos-natal', label: 'Melhores Brinquedos para o Natal', exists: false },
      { href: '/melhores/melhores-presentes-criancas', label: 'Melhores Presentes para Crianças', exists: false },
    ],
    comparisons: [
      { href: '/comparar/lego-vs-blocos-genericos', label: 'LEGO vs Blocos Genéricos: vale a diferença?', exists: false },
    ],
    offers: [
      { href: '/ofertas/brinquedos', label: 'Ofertas Brinquedos', exists: false },
    ],
    valeAPena: [
      { href: '/vale-a-pena/vale-a-pena-lego', label: 'LEGO vale a pena?', exists: false },
    ],
    faixas: [
      { href: '/faixa-preco/brinquedos-ate-200', label: 'Brinquedos até R$200', exists: false },
    ],
    relatedClusters: ['gaming'],
    seasonalMonths: [10, 11, 12], // Outubro, Novembro, Dezembro
  },
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

/** All cluster IDs sorted by priority */
export const CLUSTER_IDS = Object.keys(CLUSTERS)

/** Get a cluster by ID */
export function getCluster(id: string): ClusterDef | undefined {
  return CLUSTERS[id]
}

/** Get all satellites for a cluster (flat list) */
export function getClusterSatellites(clusterId: string): ClusterSatellite[] {
  const c = CLUSTERS[clusterId]
  if (!c) return []
  return [
    ...c.melhores,
    ...c.comparisons,
    ...c.offers,
    ...c.valeAPena,
    ...c.faixas,
  ]
}

/** Find which cluster(s) a page belongs to */
export function findClustersForPage(href: string): ClusterDef[] {
  return Object.values(CLUSTERS).filter((cluster) =>
    getClusterSatellites(cluster.id).some((s) => s.href === href) ||
    cluster.hub === href
  )
}

/** Find which cluster matches a category slug */
export function findClusterByCategory(categorySlug: string): ClusterDef | undefined {
  return Object.values(CLUSTERS).find((c) =>
    c.categorySlugs.some(
      (s) => s === categorySlug || categorySlug.includes(s) || s.includes(categorySlug)
    )
  )
}

/** Get cluster-aware related links for a melhores page */
export function getClusterLinksForMelhores(melhoresSlug: string): {
  offers: ClusterSatellite[]
  comparisons: ClusterSatellite[]
  valeAPena: ClusterSatellite[]
  sibling: ClusterSatellite[]
} {
  const cluster = Object.values(CLUSTERS).find((c) =>
    c.melhores.some((m) => m.href === `/melhores/${melhoresSlug}`)
  )
  if (!cluster) return { offers: [], comparisons: [], valeAPena: [], sibling: [] }

  const sibling = cluster.melhores
    .filter((m) => m.href !== `/melhores/${melhoresSlug}`)
    .slice(0, 3)

  return {
    offers: cluster.offers.filter((o) => o.exists).slice(0, 3),
    comparisons: cluster.comparisons.filter((c) => c.exists).slice(0, 4),
    valeAPena: cluster.valeAPena.filter((v) => v.exists).slice(0, 2),
    sibling,
  }
}

/** Get cluster coverage stats */
export function getClusterCoverage(clusterId: string): {
  total: number
  existing: number
  missing: number
  pct: number
} {
  const sats = getClusterSatellites(clusterId)
  const existing = sats.filter((s) => s.exists).length
  const total = sats.length
  return { total, existing, missing: total - existing, pct: total > 0 ? Math.round((existing / total) * 100) : 0 }
}

/** Sorted clusters by priority then coverage gap */
export function getClustersRankedByGap(): Array<ClusterDef & { coverage: ReturnType<typeof getClusterCoverage> }> {
  return Object.values(CLUSTERS)
    .map((c) => ({ ...c, coverage: getClusterCoverage(c.id) }))
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      return a.coverage.pct - b.coverage.pct // lower coverage first
    })
}
