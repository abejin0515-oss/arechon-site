import type { MetadataRoute } from "next";

const SITE = "https://arechon.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE,
      lastModified: new Date("2026-06-03"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];
}
