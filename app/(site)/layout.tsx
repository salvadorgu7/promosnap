import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import Sidebar from "@/components/layout/Sidebar";
import PromoBanner from "@/components/ui/PromoBanner";
import PromoModal from "@/components/ui/PromoModal";
import ReturnHook from "@/components/engagement/ReturnHook";
import StickyAlertBar from "@/components/engagement/StickyAlertBar";
import ChatBubble from "@/components/ai/ChatBubble";
import WebVitals from "@/components/analytics/WebVitals";
import { organizationSchema, websiteSchema } from "@/lib/seo/metadata";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Sitewide structured data — Organization + WebSite (SearchAction) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema()) }}
      />
      <StickyAlertBar />
      <PromoBanner />
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
      </div>
      <ReturnHook />
      <Footer />
      <BottomNav />
      <PromoModal />
      <ChatBubble />
      <WebVitals />
    </div>
  );
}
