// ============================================
// META GENERATORS — dynamic title/description for SEO
// ============================================

export interface MetaOutput {
  title: string;
  description: string;
}

export function generateProductMeta(product: {
  name: string;
  brand?: string;
  category?: string;
  price?: number;
  discount?: number;
}): MetaOutput {
  const { name, brand, price, discount } = product;

  const priceStr = price
    ? ` a partir de R$ ${price.toFixed(2).replace(".", ",")}`
    : "";

  const discountStr =
    discount && discount > 0 ? ` com até ${discount}% de desconto` : "";

  const brandStr = brand ? ` da ${brand}` : "";

  return {
    title: `${name}${brandStr} - Melhor Preço e Ofertas`,
    description: `Compare preços de ${name}${brandStr}${priceStr}${discountStr}. Histórico real de preços, cupons e alertas de queda. Encontre a melhor oferta no PromoSnap.`,
  };
}

export function generateCategoryMeta(category: {
  name: string;
  productCount: number;
}): MetaOutput {
  const { name, productCount } = category;
  const countStr = productCount > 0 ? `${productCount}+ produtos` : "ofertas";

  return {
    title: `${name} - Melhores Ofertas e Preços`,
    description: `Compare preços de ${countStr} em ${name}. Encontre as melhores ofertas, descontos reais e frete grátis. Histórico de preços e alertas no PromoSnap.`,
  };
}

export function generateBrandMeta(brand: {
  name: string;
  productCount: number;
}): MetaOutput {
  const { name, productCount } = brand;
  const countStr = productCount > 0 ? `${productCount}+ produtos` : "ofertas";

  return {
    title: `${name} - Melhores Ofertas e Preços`,
    description: `Encontre ${countStr} de ${name} com preços comparados. Veja descontos reais, histórico de preços e economize em produtos ${name} no PromoSnap.`,
  };
}
