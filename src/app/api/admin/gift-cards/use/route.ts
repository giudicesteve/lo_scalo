import { NextResponse } from "next/server"


import { prisma } from "@/lib/prisma"

// POST - Usa una gift card
export async function POST(req: Request) {
  
  try {
    const body = await req.json()
    const { id, amount } = body

    const giftCard = await prisma.giftCard.findUnique({
      where: { id },
    })

    if (!giftCard) {
      return NextResponse.json({ error: "Gift card not found" }, { status: 404 })
    }

    if (giftCard.remainingValue < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    const newRemaining = giftCard.remainingValue - amount

    // Aggiorna la gift card
    await prisma.giftCard.update({
      where: { id },
      data: {
        remainingValue: newRemaining,
        isActive: newRemaining > 0,
        isArchived: newRemaining <= 0,
      },
    })

    // Crea transazione
    await prisma.giftCardTransaction.create({
      data: {
        giftCardId: id,
        amount: amount,
        type: "USE",
        note: "Utilizzo al bar",
      },
    })

    return NextResponse.json({ success: true, remainingValue: newRemaining })
  } catch {
    return NextResponse.json({ error: "Failed to use gift card" }, { status: 500 })
  }
}

