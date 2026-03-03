import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * GET /api/admin/printed-gift-cards/csv
 * Scarica CSV con codici PG
 * Query params:
 * - value: filtra per valore (in euro, es: 50)
 * - includeUsed: se "true", include anche le card usate
 * - batchId: scarica solo i codici di un batch specifico
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
    const value = searchParams.get("value");
    const includeUsed = searchParams.get("includeUsed") === "true";
    const batchId = searchParams.get("batchId");

    // Build where clause
    const where: any = {};
    
    if (batchId) {
      // Se specificato batchId, prendi solo quel batch
      where.batchId = batchId;
    } else if (!includeUsed) {
      // Default: solo non usati
      where.used = false;
    }
    
    if (value) {
      where.value = parseInt(value) * 100; // Converti euro in cents
    }

    const cards = await prisma.printedGiftCard.findMany({
      where,
      orderBy: [{ used: "asc" }, { createdAt: "desc" }],
    });

    if (cards.length === 0) {
      return NextResponse.json(
        { error: "Nessun codice disponibile" },
        { status: 404 }
      );
    }

    // Genera CSV
    const headers = includeUsed 
      ? ["Code", "QR_Code", "Value", "Status", "Used_At"]
      : ["Code", "QR_Code", "Value"];
      
    const rows = cards.map((card) => {
      const valueEuro = (card.value / 100).toFixed(2);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${card.code}`;
      
      if (includeUsed) {
        return [
          card.code, 
          qrUrl, 
          `€${valueEuro}`,
          card.used ? "USATA" : "DISPONIBILE",
          card.usedAt ? new Date(card.usedAt).toLocaleDateString("it-IT") : ""
        ];
      }
      
      return [card.code, qrUrl, `€${valueEuro}`];
    });

    // Genera CSV con BOM UTF-8 per supportare correttamente il simbolo €
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const bom = "\uFEFF"; // UTF-8 BOM
    const csv = bom + csvContent;

    // Nome file
    const timestamp = new Date().toISOString().split("T")[0];
    if (batchId) {
      const batchValue = cards[0]?.value ? `EUR${cards[0].value / 100}` : "BATCH";
      const filename = `lo-scalo-${batchValue}-${batchId.split("-")[1] || timestamp}.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }
    
    const valueSuffix = value ? `-EUR${value}` : "";
    const filename = `lo-scalo-gift-cards${valueSuffix}-${timestamp}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
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
