import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { euroToCents, centsToEuro } from "@/lib/utils/currency";
import { withRateLimit, rateLimitConfigs } from "@/lib/rate-limit-middleware";
import { checkAdmin } from "@/lib/api-auth";

export const dynamic = 'force-dynamic';

// POST - Usa una gift card
export async function POST(req: Request) {
  const authCheck = await checkAdmin();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  // Rate limiting: max 100 richieste al minuto per admin
  const rateLimitResponse = withRateLimit(req, rateLimitConfigs.adminApi)
  if (rateLimitResponse) {
    console.warn(`[RATE LIMIT] Bloccato uso gift card`)
    return rateLimitResponse
  }

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

    // Convert amount from euro (frontend) to cents (database comparison)
    const amountCents = euroToCents(amount);
    const remainingValueEuro = centsToEuro(giftCard.remainingValue);

    if (giftCard.remainingValue < amountCents) {
      return NextResponse.json(
        { error: "Credito insufficiente", remainingValue: remainingValueEuro },
        { status: 400 }
      );
    }

    const newRemainingCents = giftCard.remainingValue - amountCents;

    // Aggiorna la gift card
    await prisma.giftCard.update({
      where: { id },
      data: {
        remainingValue: newRemainingCents,
        isActive: newRemainingCents > 0,
        isArchived: newRemainingCents <= 0,
      },
    });

    // Crea transazione completa
    const transaction = await prisma.giftCardTransaction.create({
      data: {
        giftCardId: id,
        amount: amountCents, // Save in cents
        type: "USE",
        note: note?.trim() || "Utilizzo al bar",
        receiptNumber: receiptNumber.trim(),
        receiptImage: receiptImage || null,
      },
    });

    return NextResponse.json({
      success: true,
      remainingValue: centsToEuro(newRemainingCents), // Return in euro
      transaction: {
        ...transaction,
        amount: centsToEuro(transaction.amount), // Return in euro
      },
    });
  } catch (error) {
    console.error("Error using gift card:", error);
    return NextResponse.json(
      { error: "Errore durante l'utilizzo della gift card" },
      { status: 500 }
    );
  }
}
