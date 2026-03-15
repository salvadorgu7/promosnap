import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin-login", "/api/admin", "/api/cron"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
