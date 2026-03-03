import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/admin/feature-flags
 * Aggiorna un feature flag (richiede autenticazione admin)
 * Body: { key: string, enabled: boolean }
 */
export async function PUT(request: Request) {
  try {
    // Verifica autenticazione
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    // Verifica che l'utente sia un admin valido
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden - Admin privileges required" },
        { status: 403 }
      );
    }

    // Parsing body
    const body = await request.json();
    const { key, enabled } = body;

    // Validazione input
    if (!key || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid input - key and enabled are required" },
        { status: 400 }
      );
    }

    // Verifica che il flag esista
    const existingFlag = await prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!existingFlag) {
      return NextResponse.json(
        { error: `Feature flag with key '${key}' not found` },
        { status: 404 }
      );
    }

    // Aggiorna il flag
    const updatedFlag = await prisma.featureFlag.update({
      where: { key },
      data: {
        enabled,
        updatedBy: session.user.email || session.user.name || "Admin",
      },
    });

    console.log(`[Feature Flags API] Flag '${key}' updated to ${enabled} by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      flag: updatedFlag,
    });
  } catch (error) {
    console.error("[Feature Flags API] Error updating flag:", error);
    return NextResponse.json(
      { error: "Failed to update feature flag" },
      { status: 500 }
    );
  }
}
