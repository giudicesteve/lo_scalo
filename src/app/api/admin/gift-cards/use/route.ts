import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - Usa una gift card
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, amount, note, receiptNumber, receiptImage } = body;

    if (!id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "ID gift card e importo sono obbligatori" },
        { status: 400 }
      );
    }

    if (!receiptNumber || receiptNumber.trim() === "") {
      return NextResponse.json(
        { error: "Numero scontrino obbligatorio" },
        { status: 400 }
      );
    }

    const giftCard = await prisma.giftCard.findUnique({
      where: { id },
    });

    if (!giftCard) {
      return NextResponse.json(
        { error: "Gift card non trovata" },
        { status: 404 }
      );
    }

    if (giftCard.remainingValue < amount) {
      return NextResponse.json(
        { error: "Credito insufficiente", remainingValue: giftCard.remainingValue },
        { status: 400 }
      );
    }

    const newRemaining = giftCard.remainingValue - amount;

    // Aggiorna la gift card
    await prisma.giftCard.update({
      where: { id },
      data: {
        remainingValue: newRemaining,
        isActive: newRemaining > 0,
        isArchived: newRemaining <= 0,
      },
    });

    // Crea transazione completa
    const transaction = await prisma.giftCardTransaction.create({
      data: {
        giftCardId: id,
        amount: amount,
        type: "USE",
        note: note?.trim() || "Utilizzo al bar",
        receiptNumber: receiptNumber.trim(),
        receiptImage: receiptImage || null,
      },
    });

    return NextResponse.json({
      success: true,
      remainingValue: newRemaining,
      transaction,
    });
  } catch (error) {
    console.error("Error using gift card:", error);
    return NextResponse.json(
      { error: "Errore durante l'utilizzo della gift card" },
      { status: 500 }
    );
  }
}
