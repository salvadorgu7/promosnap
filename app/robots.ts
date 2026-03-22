import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo/url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin-login",
          "/api/",
          "/minha-conta",
          "/favoritos",
          "/radar",
          "/alertas",
          "/indicar",
        ],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
