import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import {
  getChannelStatus,
  getReadyOffers,
  getDistributionHistory,
  formatForChannel,
} from "@/lib/distribution/engine";
import type { DistributionChannel } from "@/lib/distribution/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    const channels = getChannelStatus();
    const offers = await getReadyOffers(10);
    const history = getDistributionHistory(20);

    // Generate previews for each offer per channel
    const previews = offers.map((offer) => ({
      ...offer,
      previews: {
        telegram: formatForChannel(offer, "telegram"),
        whatsapp: formatForChannel(offer, "whatsapp"),
        email: formatForChannel(offer, "email"),
        homepage: formatForChannel(offer, "homepage"),
      } as Record<DistributionChannel, string>,
    }));

    return NextResponse.json({
      channels,
      offers: previews,
      history,
    });
  } catch (error) {
    console.error("[Distribution API] Error:", error);
    return NextResponse.json(
      { error: "Falha ao carregar dados de distribuicao" },
      { status: 500 }
    );
  }
}
