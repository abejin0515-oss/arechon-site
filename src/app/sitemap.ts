import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

const SITE = SITE_URL;

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
