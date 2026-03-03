import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { calculateGiftCardExpiry } from "@/lib/gift-card-expiry";

/**
 * GET /api/admin/gift-card-settings
 * Restituisce la configurazione delle gift card (scadenza)
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

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Recupera configurazione scadenza
    const expiryConfig = await prisma.giftCardExpiryConfig.findUnique({
      where: { id: "gift-card-expiry" },
    });

    // Calcola data di scadenza predefinita
    const defaultExpiryDate = expiryConfig
      ? calculateGiftCardExpiry(expiryConfig.expiryType, expiryConfig.expiryTime)
      : null;

    return NextResponse.json({
      expiryConfig: expiryConfig || {
        expiryType: "END_OF_MONTH",
        expiryTime: "ONE_YEAR",
      },
      defaultExpiryDate: defaultExpiryDate?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error fetching gift card settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
