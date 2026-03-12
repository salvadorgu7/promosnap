import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: 10 req/min for newsletter
  const rl = rateLimit(req, "newsletter");
  if (!rl.success) return rateLimitResponse(rl);
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "E-mail e obrigatorio" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "E-mail invalido" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await prisma.subscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.status === "ACTIVE") {
        return NextResponse.json({
          ok: true,
          status: "already_subscribed",
          message: "Este e-mail ja esta inscrito na nossa newsletter.",
        });
      }

      // Re-activate unsubscribed user
      await prisma.subscriber.update({
        where: { id: existing.id },
        data: { status: "ACTIVE" },
      });

      return NextResponse.json({
        ok: true,
        status: "reactivated",
        message: "Inscricao reativada com sucesso!",
      });
    }

    // Create new subscriber
    await prisma.subscriber.create({
      data: {
        email: normalizedEmail,
        source: "website",
      },
    });

    return NextResponse.json({
      ok: true,
      status: "subscribed",
      message: "Inscricao realizada com sucesso! Voce recebera nossas melhores ofertas.",
    });
  } catch (error) {
    console.error("[newsletter] Subscribe error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar inscricao",
      },
      { status: 500 }
    );
  }
}
