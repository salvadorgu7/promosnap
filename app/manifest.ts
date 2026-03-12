import type { MetadataRoute } from "next";

// TODO: Add real PWA icons to public/icons/
// Required files:
//   - public/icons/icon-192.png (192x192)
//   - public/icons/icon-512.png (512x512)
//   - public/icons/icon-maskable.png (512x512, maskable safe zone)

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PromoSnap — Ofertas reais, preço de verdade",
    short_name: "PromoSnap",
    description:
      "Compare preços, veja histórico real e encontre os melhores descontos do Brasil",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    icons: [
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
