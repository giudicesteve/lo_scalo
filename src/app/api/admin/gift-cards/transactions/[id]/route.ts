import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// DELETE - Elimina una transazione e ripristina il credito
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id

    // Trova la transazione
    const transaction = await prisma.giftCardTransaction.findUnique({
      where: { id: transactionId },
      include: { giftCard: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transazione non trovata" },
        { status: 404 }
      )
    }

    // Calcola il nuovo residuo
    const newRemainingValue =
      transaction.giftCard.remainingValue + transaction.amount

    // Ripristina il credito e rimuovi da archivio se necessario
    const updatedGiftCard = await prisma.giftCard.update({
      where: { id: transaction.giftCardId },
      data: {
        remainingValue: newRemainingValue,
        isActive: true,
        isArchived: false,
      },
    })

    // Elimina la transazione
    await prisma.giftCardTransaction.delete({
      where: { id: transactionId },
    })

    return NextResponse.json({
      success: true,
      message: "Transazione eliminata e credito ripristinato",
      giftCard: {
        id: updatedGiftCard.id,
        remainingValue: updatedGiftCard.remainingValue,
        isArchived: updatedGiftCard.isArchived,
      },
    })
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json(
      { error: "Errore durante l'eliminazione" },
      { status: 500 }
    )
  }
}
