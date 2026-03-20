import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import OfferCard from "../OfferCard"
import type { ProductCard } from "@/types"

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}))

// Mock analytics
vi.mock("@/lib/analytics/events", () => ({
  analytics: { offerClick: vi.fn() },
}))

const mockProduct: ProductCard = {
  id: "prod-1",
  name: "iPhone 15 Pro 128GB Preto",
  slug: "iphone-15-pro-128gb-preto",
  imageUrl: "https://example.com/iphone.jpg",
  brand: "Apple",
  category: "Celulares",
  categorySlug: "celulares",
  bestOffer: {
    offerId: "offer-1",
    price: 5499,
    originalPrice: 7999,
    discount: 31,
    sourceSlug: "amazon",
    sourceName: "Amazon",
    affiliateUrl: "https://amazon.com.br/dp/B09XYZ?tag=promosnap-20",
    isFreeShipping: true,
    offerScore: 85,
  },
  offersCount: 3,
  popularityScore: 75,
  badges: [
    { type: "hot_deal", label: "Oferta Quente", color: "red" },
    { type: "free_shipping", label: "Frete Grátis", color: "green" },
  ],
}

describe("OfferCard", () => {
  it("renders product name", () => {
    render(<OfferCard product={mockProduct} />)
    expect(screen.getByText("iPhone 15 Pro 128GB Preto")).toBeDefined()
  })

  it("renders formatted price", () => {
    render(<OfferCard product={mockProduct} />)
    // formatPrice returns R$ formatted string
    const priceElements = screen.getAllByText(/5\.499|5,499|5499/)
    expect(priceElements.length).toBeGreaterThan(0)
  })

  it("renders discount badge", () => {
    render(<OfferCard product={mockProduct} />)
    expect(screen.getByText("-31%")).toBeDefined()
  })

  it("renders badges", () => {
    render(<OfferCard product={mockProduct} />)
    expect(screen.getByText("Oferta Quente")).toBeDefined()
  })

  it("renders source name", () => {
    render(<OfferCard product={mockProduct} />)
    expect(screen.getByText("Amazon")).toBeDefined()
  })

  it("renders offers count when > 1", () => {
    render(<OfferCard product={mockProduct} />)
    expect(screen.getByText("3 lojas")).toBeDefined()
  })

  it("renders CTA with affiliate link", () => {
    render(<OfferCard product={mockProduct} />)
    // High score = "Aproveitar Agora"
    expect(screen.getByText("Aproveitar Agora")).toBeDefined()
  })

  it("renders product link to product page", () => {
    render(<OfferCard product={mockProduct} />)
    const links = screen.getAllByRole("link")
    const productLinks = links.filter((l) => l.getAttribute("href")?.includes("/produto/iphone-15-pro"))
    expect(productLinks.length).toBeGreaterThan(0)
  })

  it("renders 'Comparar Preços' when no affiliate URL", () => {
    const noAffiliate = {
      ...mockProduct,
      bestOffer: { ...mockProduct.bestOffer, affiliateUrl: "#", offerId: "" },
    }
    render(<OfferCard product={noAffiliate} />)
    expect(screen.getByText("Comparar Preços")).toBeDefined()
  })

  it("renders brand link", () => {
    render(<OfferCard product={mockProduct} />)
    expect(screen.getByText("Apple")).toBeDefined()
  })
})
