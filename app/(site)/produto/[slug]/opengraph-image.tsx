import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";

export const alt = "PromoSnap - Produto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #6C63FF 0%, #7C4DFF 50%, #9333EA 100%)",
            color: "white",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          PromoSnap — Produto nao encontrado
        </div>
      ),
      { ...size }
    );
  }

  const allOffers = product.listings.flatMap((l) => l.offers);
  const bestPrice = allOffers.length > 0 ? Math.min(...allOffers.map((o) => o.currentPrice)) : null;
  const bestOffer = allOffers.find((o) => o.currentPrice === bestPrice);
  const originalPrice = bestOffer?.originalPrice ?? null;
  const discount = originalPrice && bestPrice && originalPrice > bestPrice
    ? Math.round(((originalPrice - bestPrice) / originalPrice) * 100)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #F8F9FC 0%, #F1F4FA 100%)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Left — product image */}
        <div
          style={{
            display: "flex",
            width: "45%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            padding: 40,
          }}
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt=""
              width={400}
              height={400}
              style={{ objectFit: "contain", maxWidth: "100%", maxHeight: "100%", borderRadius: 16 }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 300,
                height: 300,
                borderRadius: 24,
                background: "#E8E9F0",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 80,
              }}
            >
              📦
            </div>
          )}
        </div>

        {/* Right — product info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "55%",
            height: "100%",
            padding: "50px 50px 50px 20px",
            justifyContent: "center",
          }}
        >
          {/* Brand */}
          {product.brand && (
            <div
              style={{
                display: "flex",
                fontSize: 18,
                color: "#6C63FF",
                fontWeight: 600,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {product.brand.name}
            </div>
          )}

          {/* Product name */}
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 700,
              color: "#1A1B2E",
              lineHeight: 1.2,
              marginBottom: 24,
              maxHeight: 130,
              overflow: "hidden",
            }}
          >
            {product.name.length > 80 ? product.name.slice(0, 80) + "..." : product.name}
          </div>

          {/* Price */}
          {bestPrice && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 16 }}>
              {originalPrice && originalPrice > bestPrice && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    color: "#9CA3AF",
                    textDecoration: "line-through",
                  }}
                >
                  {formatPrice(originalPrice)}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  fontSize: 48,
                  fontWeight: 800,
                  color: "#16A34A",
                }}
              >
                {formatPrice(bestPrice)}
              </div>
              {discount && discount > 0 && (
                <div
                  style={{
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 700,
                    color: "white",
                    background: "linear-gradient(135deg, #EF4444, #DC2626)",
                    padding: "6px 14px",
                    borderRadius: 10,
                  }}
                >
                  -{discount}%
                </div>
              )}
            </div>
          )}

          {/* Badge bar */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 16,
                color: "#6C63FF",
                fontWeight: 600,
                background: "rgba(108,99,255,0.08)",
                padding: "8px 16px",
                borderRadius: 10,
              }}
            >
              🔍 Compare precos
            </div>
            {product.listings.length > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 16,
                  color: "#F59E0B",
                  fontWeight: 600,
                  background: "rgba(245,158,11,0.08)",
                  padding: "8px 16px",
                  borderRadius: 10,
                }}
              >
                🏪 {product.listings.length} lojas
              </div>
            )}
          </div>

          {/* PromoSnap branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: "auto",
              paddingTop: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 800,
                color: "#6C63FF",
                letterSpacing: -0.5,
              }}
            >
              PromoSnap
            </div>
            <div style={{ display: "flex", fontSize: 14, color: "#9CA3AF" }}>
              promosnap.com.br
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
