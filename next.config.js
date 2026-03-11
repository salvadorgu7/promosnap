/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.mercadolibre.com" },
      { protocol: "https", hostname: "**.mlstatic.com" },
      { protocol: "https", hostname: "**.shopee.com.br" },
      { protocol: "https", hostname: "**.shein.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
    ],
  },
};

module.exports = nextConfig;
