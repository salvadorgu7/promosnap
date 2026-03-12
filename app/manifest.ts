import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PromoSnap",
    short_name: "PromoSnap",
    description:
      "Encontre as melhores ofertas, compare precos e economize de verdade. Historico real de precos, cupons e os produtos mais vendidos.",
    theme_color: "#3B82F6",
    background_color: "#FFFFFF",
    display: "standalone",
    start_url: "/",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
