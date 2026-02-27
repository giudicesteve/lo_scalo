import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Lista tutte le gift card con transazioni
// Usa searchParams per forzare comportamento dinamico (no cache)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const archivedParam = searchParams.get("archived");
    const activeParam = searchParams.get("active");

    const where: { isArchived?: boolean; isActive?: boolean } = {};

    // Se archived è specificato, filtra
    if (archivedParam !== null) {
      where.isArchived = archivedParam === "true";
    }

    // Se active è specificato, filtra
    if (activeParam !== null) {
      where.isActive = activeParam === "true";
    }

    const giftCards = await prisma.giftCard.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { purchasedAt: "desc" },
      include: {
        order: {
          select: { email: true, orderNumber: true, phone: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return NextResponse.json(giftCards);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch gift cards" },
      { status: 500 }
    );
  }
}
