// ============================================
// FAQ GENERATORS — dynamic FAQ content for SEO
// ============================================

export interface FAQItem {
  q: string;
  a: string;
}

export function generateProductFAQs(product: {
  name: string;
  brand?: string;
  category?: string;
  price?: number;
}): FAQItem[] {
  const { name, brand, category, price } = product;
  const faqs: FAQItem[] = [];

  faqs.push({
    q: `Onde encontrar o melhor preço de ${name}?`,
    a: `O PromoSnap compara preços de ${name} em dezenas de lojas como Amazon, Mercado Livre, Magalu, Americanas e outras. Mostramos o preço mais baixo verificado e o histórico de preços para que você compre no melhor momento.`,
  });

  if (price && price > 0) {
    faqs.push({
      q: `${name} está com bom preço agora?`,
      a: `O preço atual de ${name} é a partir de R$ ${price.toFixed(2).replace(".", ",")}. Recomendamos verificar o histórico de preços no PromoSnap para confirmar se está abaixo da média dos últimos 30 dias. Ative um alerta de preço para ser notificado quando cair.`,
    });
  }

  if (brand) {
    faqs.push({
      q: `${name} da ${brand} é confiável?`,
      a: `${brand} é uma marca reconhecida no mercado. No PromoSnap, você pode comparar avaliações, preços e verificar em quais lojas confiáveis o ${name} está disponível. Recomendamos comprar em lojas com boa reputação.`,
    });
  }

  faqs.push({
    q: `Como receber alerta de queda de preço do ${name}?`,
    a: `No PromoSnap, acesse a página do ${name} e clique em "Criar Alerta de Preço". Informe o preço desejado e seu e-mail. Avisaremos quando o preço atingir ou ficar abaixo do valor configurado.`,
  });

  if (category) {
    faqs.push({
      q: `Quais são as alternativas ao ${name}?`,
      a: `Na categoria ${category}, existem diversas opções similares. Confira a página de ${category} no PromoSnap para comparar preços e especificações de produtos semelhantes ao ${name}.`,
    });
  }

  return faqs.slice(0, 4);
}

export function generateCategoryFAQs(category: {
  name: string;
  productCount: number;
}): FAQItem[] {
  const { name, productCount } = category;

  return [
    {
      q: `Quais são os melhores ${name} para comprar?`,
      a: `O PromoSnap monitora ${productCount > 0 ? `${productCount}+ produtos` : "diversos produtos"} na categoria ${name}. Nosso ranking considera preço, histórico de preços, avaliações e disponibilidade de frete grátis para recomendar as melhores opções.`,
    },
    {
      q: `Como encontrar ${name} com desconto?`,
      a: `No PromoSnap, filtramos ${name} por maior desconto real, comparando o preço atual com a média dos últimos 30 e 90 dias. Você também pode ativar alertas de preço para ser notificado quando um produto da categoria entrar em promoção.`,
    },
    {
      q: `O PromoSnap compara preços de ${name} em quais lojas?`,
      a: `Comparamos preços de ${name} nas principais lojas do Brasil, incluindo Amazon, Mercado Livre, Magazine Luiza, Americanas, Casas Bahia, Shopee e outras. Os preços são atualizados diversas vezes ao dia.`,
    },
  ];
}

export function generateBrandFAQs(brand: {
  name: string;
  productCount: number;
}): FAQItem[] {
  const { name, productCount } = brand;

  return [
    {
      q: `Onde encontrar os melhores preços de ${name}?`,
      a: `O PromoSnap compara preços de ${productCount > 0 ? `${productCount}+ produtos` : "diversos produtos"} da ${name} em dezenas de lojas como Amazon, Mercado Livre, Magalu e outras. Mostramos o preço mais baixo verificado e o histórico para que você compre no melhor momento.`,
    },
    {
      q: `Os descontos de ${name} no PromoSnap são reais?`,
      a: `Sim. Monitoramos o histórico de preços e comparamos com a média dos últimos 30 e 90 dias. Se o preço atual está abaixo da média, o desconto é real e indicamos com badges de oferta quente.`,
    },
    {
      q: `Como receber alertas de ofertas de ${name}?`,
      a: `Adicione produtos de ${name} aos seus favoritos e ative notificações de preço. Avisaremos quando o preço cair ou surgir uma promoção imperdível em qualquer produto da marca.`,
    },
  ];
}

/**
 * Convert FAQ items to schema.org FAQPage JSON-LD
 */
export function faqToSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}
