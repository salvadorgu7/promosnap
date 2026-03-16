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
  return `Encontre as melhores ofertas de ${name} no PromoSnap. Estamos monitorando ${productCount} produtos${brandText} nos principais marketplaces do Brasil. Compare preços, veja o histórico real e descubra o melhor momento para comprar.`;
}

export function generateBrandIntro(brand: {
  name: string;
  productCount: number;
  categoryCount?: number;
}): string {
  const { name, productCount, categoryCount } = brand;
  const catText = categoryCount ? ` em ${categoryCount} categorias` : "";
  return `Acompanhe todos os produtos ${name} no PromoSnap. Temos ${productCount} produtos${catText} com preços comparados entre Amazon, Mercado Livre, Shopee e Shein. Veja qual loja oferece o melhor preço agora.`;
}

export function generateComparisonIntro(productA: string, productB: string): string {
  return `Qual é a melhor escolha: ${productA} ou ${productB}? Comparamos preços, especificações e avaliações reais para ajudar você a decidir. Veja lado a lado qual oferece o melhor custo-benefício nos principais marketplaces do Brasil.`;
}

export function generateBestPageIntro(topic: string, productCount: number): string {
  return `Descubra os melhores ${topic} de 2026 no PromoSnap. Analisamos ${productCount > 0 ? productCount : "dezenas de"} produtos com base em preço, avaliação, histórico e oferta real. Encontre a melhor opção sem cair em desconto falso.`;
}

export function generateOfferPageIntro(productName: string): string {
  return `Encontre as melhores ofertas de ${productName} com preços verificados e histórico real. O PromoSnap compara preços entre Amazon, Mercado Livre, Shopee e Shein para você encontrar o menor preço de verdade.`;
}

export function generatePricePageIntro(productName: string): string {
  return `Acompanhe o histórico de preços de ${productName} no PromoSnap. Veja como o preço variou nos últimos 90 dias, descubra o melhor momento para comprar e ative um alerta para ser avisado quando o preço cair.`;
}
