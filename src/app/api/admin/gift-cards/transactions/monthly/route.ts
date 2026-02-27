import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering - uses req.url
export const dynamic = "force-dynamic";

// GET - Lista tutte le transazioni gift card per un mese specifico
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

    // Calcola inizio e fine mese in UTC (considerando timezone italiana)
    // Il mese in JavaScript è 0-based, quindi sottraiamo 1
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const transactions = await prisma.giftCardTransaction.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        giftCard: {
          include: {
            order: {
              select: {
                email: true,
                orderNumber: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching gift card transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch gift card transactions" },
      { status: 500 }
    );
  }
}
