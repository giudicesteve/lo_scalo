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
      orders,
      refunds,
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
