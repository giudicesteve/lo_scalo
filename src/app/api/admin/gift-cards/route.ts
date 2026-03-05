import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { centsToEuro } from "@/lib/utils/currency";
import { checkAdmin } from "@/lib/api-auth"

// Force dynamic - uses auth()
export const dynamic = 'force-dynamic'

// GET - Lista gift card con paginazione e filtri per tab
export async function GET(req: Request) {
  try {
    // Check admin authentication
    const authCheck = await checkAdmin();
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab"); // "active" | "exhausted" | "unavailable"
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Build where clause
    const where: {
      remainingValue?: { gt?: number; equals?: number };
      isExpired?: boolean;
      isSoftDeleted?: boolean;
      OR?: Array<{
        isExpired?: boolean;
        isSoftDeleted?: boolean;
      }>;
      AND?: Array<{
        OR?: Array<{
          code?: { contains: string; mode: "insensitive" };
          order?: {
            email?: { contains: string; mode: "insensitive" };
            orderNumber?: { contains: string; mode: "insensitive" };
            phone?: { contains: string; mode: "insensitive" };
          };
        }>;
      }>;
    } = {};

    // Filtro per tab
    if (tab === "active") {
      // Attive: ha credito residuo (> 0), non scadute, non cancellate
      where.remainingValue = { gt: 0 };
      where.isExpired = false;
      where.isSoftDeleted = false;
    } else if (tab === "exhausted") {
      // Credito esaurito: credito 0, non scadute, non cancellate
      where.remainingValue = { equals: 0 };
      where.isExpired = false;
      where.isSoftDeleted = false;
    } else if (tab === "unavailable") {
      // Non Disponibili: scadute OPPURE cancellate (soft deleted)
      where.OR = [{ isExpired: true }, { isSoftDeleted: true }];
    }

    // Ricerca testuale
    if (search) {
      where.AND = [
        {
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { order: { email: { contains: search, mode: "insensitive" } } },
            { order: { orderNumber: { contains: search, mode: "insensitive" } } },
            { order: { phone: { contains: search, mode: "insensitive" } } },
          ],
        },
      ];
    }

    // Get total count
    const totalCount = await prisma.giftCard.count({ where });

    const giftCards = await prisma.giftCard.findMany({
      where,
      orderBy: { purchasedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        order: {
          select: { email: true, orderNumber: true, phone: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    
    // Convert monetary values from cents to euro
    const transformedGiftCards = giftCards.map((gc) => ({
      ...gc,
      initialValue: centsToEuro(gc.initialValue),
      remainingValue: centsToEuro(gc.remainingValue),
      transactions: gc.transactions.map((t) => ({
        ...t,
        amount: centsToEuro(t.amount),
      })),
    }));
    
    return NextResponse.json({
      giftCards: transformedGiftCards,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch gift cards" },
      { status: 500 }
    );
  }
}
