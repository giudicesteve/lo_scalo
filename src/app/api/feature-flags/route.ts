import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cache 1 minuto (feature flags possono cambiare per toggle)
export const revalidate = 60

/**
 * GET /api/feature-flags
 * Ritorna tutti i feature flags (accesso pubblico)
 * Usato dal frontend per il check iniziale delle funzionalità abilitate
 */
export async function GET() {
  try {
    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: "asc" },
    });

    return NextResponse.json({ flags }, {
      headers: {
        // Cache 1 minuto, stale-while-revalidate 5 minuti
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error("[Feature Flags API] Error fetching flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}
