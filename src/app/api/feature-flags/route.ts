import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({ flags });
  } catch (error) {
    console.error("[Feature Flags API] Error fetching flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}
