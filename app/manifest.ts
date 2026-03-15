import type { MetadataRoute } from "next";

// Icons: Place custom icons in public/icons/ to override the defaults below.
// Recommended files:
//   - public/icons/icon-192.png (192x192)
//   - public/icons/icon-512.png (512x512)
//   - public/icons/icon-maskable.png (512x512, maskable safe zone)
//
// Until custom icons are added, the manifest uses the Next.js-generated
// favicon as a fallback so the PWA manifest remains valid.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PromoSnap — Ofertas reais, preço de verdade",
    short_name: "PromoSnap",
    description:
      "Compare preços, veja histórico real e encontre os melhores descontos do Brasil",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#9333EA",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "64x64 32x32 24x24 16x16",
        type: "image/x-icon",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
