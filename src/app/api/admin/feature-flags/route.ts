import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cacheConfig, generateCacheHeaders } from "@/lib/cache-config";

// Force dynamic - uses auth()
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/feature-flags
 * Ritorna tutti i feature flags (richiede canManageAdmins)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    });

    if (!admin || !admin.canManageAdmins) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const flags = await prisma.featureFlag.findMany({
      orderBy: { key: "asc" },
    });

    return NextResponse.json({ flags }, {
      headers: generateCacheHeaders(
        cacheConfig.featureFlags.ttl,
        cacheConfig.featureFlags.staleWhileRevalidate
      ),
    });
  } catch (error) {
    console.error("[Feature Flags API] Error fetching flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/feature-flags
 * Aggiorna un feature flag (richiede canManageAdmins)
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

    // Verifica che l'utente sia un admin con permessi di gestione
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email! },
    });

    if (!admin || !admin.canManageAdmins) {
      return NextResponse.json(
        { error: "Forbidden - Admin management privileges required" },
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
