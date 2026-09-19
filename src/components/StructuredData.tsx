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
        "AI コーディングツール（Claude Code）に指示を出して個人で制作した Web ポートフォリオ。",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#site`,
      url: SITE,
      name: "Arechon",
      inLanguage: "ja",
      publisher: { "@id": `${SITE}/#org` },
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
