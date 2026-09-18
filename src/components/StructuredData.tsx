import { SITE_URL } from "@/lib/site";

const SITE = SITE_URL;

const data = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      name: "Arechon",
      url: SITE,
      logo: `${SITE}/apple-icon`,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Sendai",
        addressRegion: "Miyagi",
        addressCountry: "JP",
      },
      areaServed: {
        "@type": "City",
        name: "Sendai",
      },
      description:
        "仙台拠点の個人事業。Claude Code 活用の高速・高品質 Web 制作スタジオ。",
      email: "hello@arechon.dev",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#site`,
      url: SITE,
      name: "Arechon",
      inLanguage: "ja",
      publisher: { "@id": `${SITE}/#org` },
    },
    {
      "@type": "ProfessionalService",
      "@id": `${SITE}/#service`,
      url: SITE,
      name: "Arechon — Web制作・薄保守",
      provider: { "@id": `${SITE}/#org` },
      areaServed: "Japan",
      serviceType: "Web Design and Development",
      offers: [
        {
          "@type": "AggregateOffer",
          name: "Web制作スポット",
          priceCurrency: "JPY",
          lowPrice: "100000",
          highPrice: "300000",
          offerCount: 1,
        },
        {
          "@type": "Offer",
          name: "薄保守 (月額)",
          priceCurrency: "JPY",
          price: "7500",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "7500",
            priceCurrency: "JPY",
            unitCode: "MON",
            referenceQuantity: {
              "@type": "QuantitativeValue",
              value: 1,
              unitCode: "MON",
            },
          },
        },
      ],
    },
  ],
};

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
