import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Lista tutte le gift card con transazioni
export async function GET() {
  try {
    const giftCards = await prisma.giftCard.findMany({
      orderBy: { purchasedAt: "desc" },
      include: {
        order: {
          select: { email: true, orderNumber: true, phone: true },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    })
    return NextResponse.json(giftCards)
  } catch {
    return NextResponse.json({ error: "Failed to fetch gift cards" }, { status: 500 })
  }
}
