import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * GET /api/admin/printed-gift-cards/csv
 * Scarica CSV con tutti i codici PG non usati
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

    // Prendi solo i codici non usati
    const cards = await prisma.printedGiftCard.findMany({
      where: { used: false },
      orderBy: { createdAt: "desc" },
    });

    if (cards.length === 0) {
      return NextResponse.json(
        { error: "Nessun codice disponibile" },
        { status: 404 }
      );
    }

    // Genera CSV
    const headers = ["Code", "QR_Code", "Value"];
    const rows = cards.map((card) => {
      const valueEuro = (card.value / 100).toFixed(2);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${card.code}`;
      return [card.code, qrUrl, `€${valueEuro}`];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    // Nome file con timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `lo-scalo-gift-cards-${timestamp}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating CSV:", error);
    return NextResponse.json(
      { error: "Failed to generate CSV" },
      { status: 500 }
    );
  }
}
