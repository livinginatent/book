import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://booktab.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/settings/",
          "/currently-reading/",
          "/shelves/",
          "/checkout/",
          "/test-*/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

