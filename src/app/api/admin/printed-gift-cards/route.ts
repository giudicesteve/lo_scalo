import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { generateUniquePrintedCode } from "@/lib/printed-gift-card";

/**
 * GET /api/admin/printed-gift-cards
 * Lista di tutti i codici PG con filtri
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
    const used = searchParams.get("used");
    const value = searchParams.get("value");

    const where: any = {};
    if (used !== null) {
      where.used = used === "true";
    }
    if (value) {
      where.value = parseInt(value) * 100; // Converti euro in cents
    }

    const cards = await prisma.printedGiftCard.findMany({
      where,
      orderBy: [{ used: "asc" }, { createdAt: "desc" }],
    });

    // Statistiche
    const stats = await prisma.printedGiftCard.aggregate({
      _count: { id: true },
      _sum: { value: true },
      where: { used: false },
    });

    return NextResponse.json({
      cards,
      stats: {
        totalUnused: stats._count.id,
        totalUnusedValue: stats._sum.value || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching printed gift cards:", error);
    return NextResponse.json(
      { error: "Failed to fetch printed gift cards" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/printed-gift-cards
 * Genera N codici PG nuovi
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { quantity, value } = body;

    // Validazione
    const validQuantities = [10, 25, 50, 100, 200, 500, 1000];
    if (!validQuantities.includes(quantity)) {
      return NextResponse.json(
        { error: `Quantità non valida. Valori accettati: ${validQuantities.join(", ")}` },
        { status: 400 }
      );
    }

    if (!value || value <= 0) {
      return NextResponse.json(
        { error: "Valore non valido" },
        { status: 400 }
      );
    }

    const valueInCents = Math.round(value * 100);

    // Genera i codici
    const generatedCards = [];
    for (let i = 0; i < quantity; i++) {
      const code = await generateUniquePrintedCode(prisma);
      
      const card = await prisma.printedGiftCard.create({
        data: {
          code,
          value: valueInCents,
          createdBy: admin.email,
        },
      });
      
      generatedCards.push(card);
    }

    return NextResponse.json({
      success: true,
      generated: generatedCards.length,
      cards: generatedCards,
    }, { status: 201 });
  } catch (error) {
    console.error("Error generating printed gift cards:", error);
    return NextResponse.json(
      { error: "Failed to generate printed gift cards" },
      { status: 500 }
    );
  }
}
