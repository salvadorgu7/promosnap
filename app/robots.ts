import { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo/url";

const APP_URL = getBaseUrl();

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
