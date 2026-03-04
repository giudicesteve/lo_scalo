import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * GET /api/admin/reports/orders-by-month?year=2026&month=3
 * Restituisce ordini pagati (COMPLETED/DELIVERED) filtrati per mese/anno
 * per uso nei report (non paginato, restituisce tutto)
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
    const month = parseInt(searchParams.get("month") || "");

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Anno e mese validi sono richiesti" },
        { status: 400 }
      );
    }

    // Calcola date di inizio e fine mese
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Recupera ordini pagati nel range di date
    const orders = await prisma.order.findMany({
      where: {
        paidAt: {
          gte: startDate,
          lte: endDate,
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
        refunds: true,
      },
      orderBy: {
        paidAt: "asc",
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders by month:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
