import { MetadataRoute } from "next";

const APP_URL = process.env.APP_URL || "https://promosnap.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
