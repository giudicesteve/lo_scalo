import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getItalyMonthRange } from "@/lib/date-utils";

/**
 * GET /api/admin/reports/orders-by-year?year=2026
 * Restituisce ordini pagati (COMPLETED/DELIVERED) filtrati per anno
 * per uso nei report metrics (non paginato, restituisce tutto)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    });

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || "");

    if (!year) {
      return NextResponse.json(
        { error: "Anno valido è richiesto" },
        { status: 400 }
      );
    }

    // Calcola date UTC per inizio/fine anno in Italia
    // Gennaio = mese 1, Dicembre = mese 12
    const { start: startOfYear } = getItalyMonthRange(year, 1);
    const { end: endOfYear } = getItalyMonthRange(year, 12);

    // Recupera ordini pagati nell'anno
    const orders = await prisma.order.findMany({
      where: {
        paidAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
        status: {
          in: ["COMPLETED", "DELIVERED"],
        },
      },
      include: {
        items: {
          include: {
            Product: true,
          },
        },
        giftCards: true,
        refunds: {
          select: {
            id: true,
            refundNumber: true,
            totalRefunded: true,
            refundedAt: true,
          },
        },
      },
      orderBy: {
        paidAt: "asc",
      },
    });

    // Converti valori da cents a euro
    const ordersInEuro = orders.map(order => ({
      ...order,
      total: order.total / 100,
      items: order.items.map(item => ({
        ...item,
        unitPrice: item.unitPrice / 100,
        totalPrice: item.totalPrice / 100,
      })),
      giftCards: order.giftCards.map(gc => ({
        ...gc,
        initialValue: gc.initialValue / 100,
      })),
    }))

    return NextResponse.json({ orders: ordersInEuro });
  } catch (error) {
    console.error("Error fetching orders by year:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
