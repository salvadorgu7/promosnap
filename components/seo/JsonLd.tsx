interface JsonLdProps {
  data: Record<string, unknown>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebsiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "PromoSnap",
        url: "https://www.promosnap.com.br",
        description: "Compare preços de produtos em Amazon, Mercado Livre, Shopee e Shein. Encontre o menor preço com histórico de preços e alertas.",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://www.promosnap.com.br/busca?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "PromoSnap",
        url: "https://www.promosnap.com.br",
        logo: "https://www.promosnap.com.br/icons/icon-512.png",
        sameAs: [],
      }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  image,
  url,
  price,
  currency = "BRL",
  availability = "InStock",
  brand,
  ratingValue,
  reviewCount,
  offers,
}: {
  name: string;
  description: string;
  image?: string;
  url: string;
  price: number;
  currency?: string;
  availability?: string;
  brand?: string;
  ratingValue?: number;
  reviewCount?: number;
  offers?: Array<{ price: number; seller: string; url: string }>;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url,
    ...(image && { image }),
    ...(brand && {
      brand: {
        "@type": "Brand",
        name: brand,
      },
    }),
    offers: offers && offers.length > 1
      ? {
          "@type": "AggregateOffer",
          lowPrice: Math.min(...offers.map(o => o.price)),
          highPrice: Math.max(...offers.map(o => o.price)),
          priceCurrency: currency,
          offerCount: offers.length,
          offers: offers.map(o => ({
            "@type": "Offer",
            price: o.price,
            priceCurrency: currency,
            seller: { "@type": "Organization", name: o.seller },
            url: o.url,
            availability: `https://schema.org/${availability}`,
          })),
        }
      : {
          "@type": "Offer",
          price,
          priceCurrency: currency,
          availability: `https://schema.org/${availability}`,
        },
    ...(ratingValue && reviewCount && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue,
        reviewCount,
      },
    }),
  };

  return <JsonLd data={data} />;
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

export function FAQJsonLd({ questions }: { questions: { question: string; answer: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: questions.map(q => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: q.answer,
          },
        })),
      }}
    />
  );
}
