import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering - uses req.url
export const dynamic = "force-dynamic";

// GET - Lista tutte le gift card scadute in un mese specifico
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || "");
    const month = parseInt(searchParams.get("month") || "");

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Invalid year or month" },
        { status: 400 }
      );
    }

    // Calcola inizio e fine mese in UTC
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const expiredGiftCards = await prisma.giftCard.findMany({
      where: {
        isExpired: true,
        expiresAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: {
        expiresAt: "asc",
      },
      include: {
        order: {
          select: {
            email: true,
            orderNumber: true,
            phone: true,
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(expiredGiftCards);
  } catch (error) {
    console.error("Error fetching expired gift cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch expired gift cards" },
      { status: 500 }
    );
  }
}
