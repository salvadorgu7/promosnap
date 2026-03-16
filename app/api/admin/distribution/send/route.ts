import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import {
  addDistributionPost,
  recordChannelSend,
  formatForChannel,
  getReadyOffers,
} from "@/lib/distribution/engine";
import { sendTelegramMessage } from "@/lib/distribution/telegram";
import type { DistributionChannel } from "@/lib/distribution/types";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { offerId, channel } = body as {
      offerId: string;
      channel: DistributionChannel;
    };

    if (!offerId || !channel) {
      return NextResponse.json(
        { error: "offerId e channel sao obrigatorios" },
        { status: 400 }
      );
    }

    const validChannels: DistributionChannel[] = [
      "homepage",
      "email",
      "telegram",
      "whatsapp",
    ];
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { error: `Canal invalido: ${channel}` },
        { status: 400 }
      );
    }

    // Find the offer in ready offers
    const readyOffers = await getReadyOffers(50);
    const offer = readyOffers.find((o) => o.offerId === offerId);

    if (!offer) {
      return NextResponse.json(
        { error: "Oferta nao encontrada ou nao elegivel para distribuicao" },
        { status: 404 }
      );
    }

    const formattedMessage = formatForChannel(offer, channel);

    // Handle channel-specific sending
    switch (channel) {
      case "telegram": {
        const result = await sendTelegramMessage(formattedMessage);
        const post = addDistributionPost({
          channel: "telegram",
          title: offer.productName,
          body: formattedMessage,
          offerIds: [offerId],
          status: result.success ? "sent" : "failed",
          sentAt: result.success ? new Date() : null,
          error: result.error || null,
        });

        if (result.success) {
          recordChannelSend("telegram");
        }

        return NextResponse.json({
          success: result.success,
          post,
          telegramMessageId: result.messageId,
          error: result.error,
        });
      }

      case "whatsapp": {
        // WhatsApp is manual — return copyable message
        const post = addDistributionPost({
          channel: "whatsapp",
          title: offer.productName,
          body: formattedMessage,
          offerIds: [offerId],
          status: "previewed",
          sentAt: null,
          error: null,
        });

        return NextResponse.json({
          success: true,
          post,
          message: formattedMessage,
          instruction:
            "Copie a mensagem acima e envie manualmente no WhatsApp.",
        });
      }

      case "email": {
        // Email distribution uses existing email infrastructure
        const post = addDistributionPost({
          channel: "email",
          title: offer.productName,
          body: formattedMessage,
          offerIds: [offerId],
          status: "previewed",
          sentAt: null,
          error: null,
        });

        return NextResponse.json({
          success: true,
          post,
          message: formattedMessage,
          instruction:
            "Use o painel de Email Marketing para enviar esta oferta via e-mail.",
        });
      }

      case "homepage": {
        // Homepage distribution = marking for highlight
        const post = addDistributionPost({
          channel: "homepage",
          title: offer.productName,
          body: formattedMessage,
          offerIds: [offerId],
          status: "sent",
          sentAt: new Date(),
          error: null,
        });

        recordChannelSend("homepage");

        return NextResponse.json({
          success: true,
          post,
          instruction:
            "Oferta marcada para destaque na pagina inicial. O carrossel sera atualizado automaticamente.",
        });
      }

      default:
        return NextResponse.json(
          { error: "Canal nao suportado" },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error("distribution-send.failed", { error });
    return NextResponse.json(
      { error: "Falha ao enviar distribuicao" },
      { status: 500 }
    );
  }
}
