import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  const authCheck = await checkAdmin();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }
  try {
    // Esegui tutte le count in parallelo
    const [active, exhausted, unavailable] = await Promise.all([
      // Attive: ha credito residuo (> 0), non scadute, non cancellate
      prisma.giftCard.count({
        where: {
          remainingValue: { gt: 0 },
          isExpired: false,
          isSoftDeleted: false,
        },
      }),
      // Credito esaurito: credito 0, non scadute, non cancellate
      prisma.giftCard.count({
        where: {
          remainingValue: { equals: 0 },
          isExpired: false,
          isSoftDeleted: false,
        },
      }),
      // Non Disponibili: scadute OPPURE cancellate (soft deleted)
      prisma.giftCard.count({
        where: {
          OR: [{ isExpired: true }, { isSoftDeleted: true }],
        },
      }),
    ]);

    return NextResponse.json({
      active,
      exhausted,
      unavailable,
    });
  } catch (error) {
    console.error("Error fetching gift card counts:", error);
    return NextResponse.json(
      { error: "Failed to fetch counts" },
      { status: 500 }
    );
  }
}
