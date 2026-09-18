import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

const SITE = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
