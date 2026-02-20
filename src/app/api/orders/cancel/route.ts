import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Cancella ordine e ripristina disponibilità
export async function POST(req: Request) {
  try {
    const { orderNumber } = await req.json()

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Numero ordine richiesto" },
        { status: 400 }
      )
    }

    console.log(`🚫 Cancellazione manuale ordine #${orderNumber}`)

    // Trova l'ordine (solo ID, non serve tutto)
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, status: true }
    })

    if (!order) {
      return NextResponse.json(
        { error: "Ordine non trovato" },
        { status: 404 }
      )
    }

    // ATOMICO: Tenta di aggiornare solo se PENDING_PAYMENT
    // Se webhook ha già processato, count sarà 0
    const updateResult = await prisma.order.updateMany({
      where: { 
        id: order.id,
        status: "PENDING_PAYMENT"  // clausola di guardia atomica
      },
      data: { 
        status: "CANCELLED",
        isArchived: true 
      }
    })

    if (updateResult.count === 0) {
      console.log(`Order #${orderNumber} already processed (not PENDING_PAYMENT)`)
      return NextResponse.json({ 
        success: true, 
        message: "Ordine già processato" 
      })
    }

    // Ottieni items per ripristinare stock
    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: { include: { variants: true } }
          }
        }
      }
    })

    if (!orderWithItems) {
      return NextResponse.json({ success: true })
    }

    // Ripristina disponibilità prodotti
    for (const item of orderWithItems.items) {
      const product = item.product
      
      if (product.hasSizes && item.size) {
        const variant = product.variants.find(v => v.size === item.size)
        if (variant) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { increment: item.quantity } }
          })
        }
      } else {
        const variant = product.variants[0]
        if (variant) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { increment: item.quantity } }
          })
        }
      }
    }

    console.log(`✅ Order #${orderNumber} cancelled manually, stock restored`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error cancelling order:", error)
    return NextResponse.json(
      { error: "Errore durante la cancellazione" },
      { status: 500 }
    )
  }
}
