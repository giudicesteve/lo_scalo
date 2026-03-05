import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';

// POST - Archivia o ripristina una gift card
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdmin();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { id: giftCardId } = await params;
    const body = await req.json();
    const { isArchived } = body;

    if (typeof isArchived !== "boolean") {
      return NextResponse.json(
        { error: "Parametro isArchived richiesto" },
        { status: 400 }
      );
    }

    const giftCard = await prisma.giftCard.findUnique({
      where: { id: giftCardId },
    });

    if (!giftCard) {
      return NextResponse.json(
        { error: "Gift card non trovata" },
        { status: 404 }
      );
    }

    const updatedGiftCard = await prisma.giftCard.update({
      where: { id: giftCardId },
      data: {
        isArchived,
        // Se ripristiniamo, assicuriamoci che sia attiva se ha credito
        isActive: isArchived ? false : giftCard.remainingValue > 0,
      },
    });

    return NextResponse.json({
      success: true,
      giftCard: {
        id: updatedGiftCard.id,
        isArchived: updatedGiftCard.isArchived,
        isActive: updatedGiftCard.isActive,
      },
    });
  } catch (error) {
    console.error("Error archiving gift card:", error);
    return NextResponse.json(
      { error: "Errore durante l'operazione" },
      { status: 500 }
    );
  }
}
