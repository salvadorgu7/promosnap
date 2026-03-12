import prisma from "@/lib/db/prisma";
import { BannerActions } from "./banner-actions";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const banners = await prisma.banner.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Banners</h1>
          <p className="text-sm text-text-muted">Gerenciar banners do site</p>
        </div>
      </div>

      <BannerActions banners={banners} />
    </div>
  );
}
