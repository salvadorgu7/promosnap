// ============================================
// INTRO GENERATORS — dynamic intro text for SEO pages
// ============================================

export function generateCategoryIntro(category: {
  name: string;
  productCount: number;
  brandCount?: number;
}): string {
  const { name, productCount, brandCount } = category;
  const brandText = brandCount ? ` de ${brandCount} marcas diferentes` : "";
  return `Encontre as melhores ofertas de ${name} no PromoSnap. Estamos monitorando ${productCount} produtos${brandText} nos principais marketplaces do Brasil. Compare precos, veja o historico real e descubra o melhor momento para comprar.`;
}

export function generateBrandIntro(brand: {
  name: string;
  productCount: number;
  categoryCount?: number;
}): string {
  const { name, productCount, categoryCount } = brand;
  const catText = categoryCount ? ` em ${categoryCount} categorias` : "";
  return `Acompanhe todos os produtos ${name} no PromoSnap. Temos ${productCount} produtos${catText} com precos comparados entre Amazon, Mercado Livre, Shopee e Shein. Veja qual loja oferece o melhor preco agora.`;
}

export function generateComparisonIntro(productA: string, productB: string): string {
  return `Qual e a melhor escolha: ${productA} ou ${productB}? Comparamos precos, especificacoes e avaliacoes reais para ajudar voce a decidir. Veja lado a lado qual oferece o melhor custo-beneficio nos principais marketplaces do Brasil.`;
}

export function generateBestPageIntro(topic: string, productCount: number): string {
  return `Descubra os melhores ${topic} de 2026 no PromoSnap. Analisamos ${productCount > 0 ? productCount : "dezenas de"} produtos com base em preco, avaliacao, historico e oferta real. Encontre a melhor opcao sem cair em desconto falso.`;
}

export function generateOfferPageIntro(productName: string): string {
  return `Encontre as melhores ofertas de ${productName} com precos verificados e historico real. O PromoSnap compara precos entre Amazon, Mercado Livre, Shopee e Shein para voce encontrar o menor preco de verdade.`;
}

export function generatePricePageIntro(productName: string): string {
  return `Acompanhe o historico de precos de ${productName} no PromoSnap. Veja como o preco variou nos ultimos 90 dias, descubra o melhor momento para comprar e ative um alerta para ser avisado quando o preco cair.`;
}
