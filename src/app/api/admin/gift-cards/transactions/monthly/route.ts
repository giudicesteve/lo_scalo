import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { centsToEuro } from "@/lib/utils/currency";
import { getItalyMonthRange } from "@/lib/date-utils";

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

    // Calcola date UTC corrispondenti all'inizio/fine del mese in Italia
    const { start, end } = getItalyMonthRange(year, month)

    const transactions = await prisma.giftCardTransaction.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
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

    // Convert amounts from cents to euro
    const transformedTransactions = transactions.map((t) => ({
      ...t,
      amount: centsToEuro(t.amount),
      giftCard: {
        ...t.giftCard,
        initialValue: centsToEuro(t.giftCard.initialValue),
        remainingValue: centsToEuro(t.giftCard.remainingValue),
      },
    }));

    return NextResponse.json(transformedTransactions);
  } catch (error) {
    console.error("Error fetching gift card transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch gift card transactions" },
      { status: 500 }
    );
  }
}
