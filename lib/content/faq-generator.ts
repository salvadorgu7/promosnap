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
    q: `Onde encontrar o melhor preco de ${name}?`,
    a: `O PromoSnap compara precos de ${name} em dezenas de lojas como Amazon, Mercado Livre, Magalu, Americanas e outras. Mostramos o preco mais baixo verificado e o historico de precos para que voce compre no melhor momento.`,
  });

  if (price && price > 0) {
    faqs.push({
      q: `${name} esta com bom preco agora?`,
      a: `O preco atual de ${name} e a partir de R$ ${price.toFixed(2).replace(".", ",")}. Recomendamos verificar o historico de precos no PromoSnap para confirmar se esta abaixo da media dos ultimos 30 dias. Ative um alerta de preco para ser notificado quando cair.`,
    });
  }

  if (brand) {
    faqs.push({
      q: `${name} da ${brand} e confiavel?`,
      a: `${brand} e uma marca reconhecida no mercado. No PromoSnap, voce pode comparar avaliacoes, precos e verificar em quais lojas confiaveis o ${name} esta disponivel. Recomendamos comprar em lojas com boa reputacao.`,
    });
  }

  faqs.push({
    q: `Como receber alerta de queda de preco do ${name}?`,
    a: `No PromoSnap, acesse a pagina do ${name} e clique em "Criar Alerta de Preco". Informe o preco desejado e seu e-mail. Avisaremos quando o preco atingir ou ficar abaixo do valor configurado.`,
  });

  if (category) {
    faqs.push({
      q: `Quais sao as alternativas ao ${name}?`,
      a: `Na categoria ${category}, existem diversas opcoes similares. Confira a pagina de ${category} no PromoSnap para comparar precos e especificacoes de produtos semelhantes ao ${name}.`,
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
      q: `Quais sao os melhores ${name} para comprar?`,
      a: `O PromoSnap monitora ${productCount > 0 ? `${productCount}+ produtos` : "diversos produtos"} na categoria ${name}. Nosso ranking considera preco, historico de precos, avaliacoes e disponibilidade de frete gratis para recomendar as melhores opcoes.`,
    },
    {
      q: `Como encontrar ${name} com desconto?`,
      a: `No PromoSnap, filtramos ${name} por maior desconto real, comparando o preco atual com a media dos ultimos 30 e 90 dias. Voce tambem pode ativar alertas de preco para ser notificado quando um produto da categoria entrar em promocao.`,
    },
    {
      q: `O PromoSnap compara precos de ${name} em quais lojas?`,
      a: `Comparamos precos de ${name} nas principais lojas do Brasil, incluindo Amazon, Mercado Livre, Magazine Luiza, Americanas, Casas Bahia, Shopee e outras. Os precos sao atualizados diversas vezes ao dia.`,
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
      q: `Onde encontrar os melhores precos de ${name}?`,
      a: `O PromoSnap compara precos de ${productCount > 0 ? `${productCount}+ produtos` : "diversos produtos"} da ${name} em dezenas de lojas como Amazon, Mercado Livre, Magalu e outras. Mostramos o preco mais baixo verificado e o historico para que voce compre no melhor momento.`,
    },
    {
      q: `Os descontos de ${name} no PromoSnap sao reais?`,
      a: `Sim. Monitoramos o historico de precos e comparamos com a media dos ultimos 30 e 90 dias. Se o preco atual esta abaixo da media, o desconto e real e indicamos com badges de oferta quente.`,
    },
    {
      q: `Como receber alertas de ofertas de ${name}?`,
      a: `Adicione produtos de ${name} aos seus favoritos e ative notificacoes de preco. Avisaremos quando o preco cair ou surgir uma promocao imperdivel em qualquer produto da marca.`,
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
