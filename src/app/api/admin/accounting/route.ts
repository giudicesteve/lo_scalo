import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getItalyDayRange } from "@/lib/date-utils";

/**
 * GET /api/admin/accounting?date=2026-03-04
 * Restituisce ordini e rimborsi per una data specifica (timezone Italia)
 * per la contabilità giornaliera
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
    const dateParam = searchParams.get("date");

    if (!dateParam || !dateParam.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return NextResponse.json(
        { error: "Data richiesta nel formato YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const [year, month, day] = dateParam.split("-").map(Number);
    const { start, end } = getItalyDayRange(year, month, day);

    // Fetch ordini pagati nella data (usando paidAt)
    const orders = await prisma.order.findMany({
      where: {
        paidAt: {
          gte: start,
          lte: end,
        },
        status: {
          in: ["PENDING", "COMPLETED", "DELIVERED"],
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

    // Fetch rimborsi nella data (usando refundedAt)
    const refunds = await prisma.refund.findMany({
      where: {
        refundedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            email: true,
            orderSource: true,
          },
        },
      },
      orderBy: {
        refundedAt: "asc",
      },
    });

    // Calcola productTotal e giftCardTotal per ogni rimborso (items è JSON)
    // NOTA: nel database price/value sono in CENTS!
    const refundsWithTotals = refunds.map(refund => {
      const items = refund.items as Array<{type: string, price?: number, value?: number, quantity?: number}>
      const productTotal = items
        .filter(item => item.type === 'PRODUCT')
        .reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
      const giftCardTotal = items
        .filter(item => item.type === 'GIFT_CARD')
        .reduce((sum, item) => sum + (item.value || 0), 0)
      
      return {
        ...refund,
        productTotal, // Già in cents
        giftCardTotal, // Già in cents
      }
    })

    // Converti valori da cents a euro per ordini
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

    // Converti valori da cents a euro per rimborsi
    const refundsInEuro = refundsWithTotals.map(refund => ({
      ...refund,
      items: refund.items, // Esplicitamente includi items (JSON)
      totalRefunded: refund.totalRefunded / 100,
      productTotal: refund.productTotal / 100,
      giftCardTotal: refund.giftCardTotal / 100,
    }))

    // Conta ordini problematici (COMPLETED/DELIVERED senza paidAt, creati in questa data)
    const problematicOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: {
          in: ["COMPLETED", "DELIVERED"],
        },
        paidAt: null,
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    return NextResponse.json({
      orders: ordersInEuro,
      refunds: refundsInEuro,
      problematicOrders,
      meta: {
        date: dateParam,
        timezone: "Europe/Rome",
        range: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching accounting data:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounting data" },
      { status: 500 }
    );
  }
}
