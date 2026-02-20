import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

// Funzione per ripristinare la disponibilità prodotti
async function restoreStock(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { include: { variants: true } }
        }
      }
    }
  })

  if (!order) return

  for (const item of order.items) {
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
}

export async function POST(req: Request) {
  const payload = await req.text()
  const signature = req.headers.get("stripe-signature") || ""

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    console.error(`Webhook signature verification failed: ${errorMessage}`)
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${errorMessage}` },
      { status: 400 }
    )
  }

  console.log(`Processing Stripe event: ${event.type}`)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId

        if (!orderId) {
          console.error("No orderId in session metadata")
          return NextResponse.json({ received: true })
        }

        // ATOMICO: Aggiorna solo se ancora PENDING_PAYMENT
        // Se un altro processo ha già modificato, count sarà 0
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true, giftCards: true }
        })

        if (!order) {
          console.error(`Order ${orderId} not found`)
          return NextResponse.json({ received: true })
        }

        // Determina nuovo stato
        const hasProducts = order.items.length > 0
        const hasGiftCards = order.giftCards.length > 0
        const newStatus = (hasGiftCards && !hasProducts) ? "DELIVERED" : "COMPLETED"

        // ATOMIC UPDATE: cambia stato solo se è PENDING_PAYMENT
        const updateResult = await prisma.order.updateMany({
          where: { 
            id: orderId, 
            status: "PENDING_PAYMENT"  // clausola di guardia
          },
          data: { status: newStatus }
        })

        if (updateResult.count === 0) {
          console.log(`Order ${orderId} already processed by another process, skipping`)
          return NextResponse.json({ received: true })
        }

        // Attiva gift card
        if (order.giftCards.length > 0) {
          await prisma.giftCard.updateMany({
            where: { orderId: orderId },
            data: { isActive: true, activatedAt: new Date() }
          })
        }

        console.log(`✅ Order ${orderId} completed successfully`)
        break
      }

      case "checkout.session.expired":
      case "payment_intent.canceled": {
        const session = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent
        const orderId = (session as { metadata?: { orderId?: string } }).metadata?.orderId

        if (!orderId) {
          return NextResponse.json({ received: true })
        }

        console.log(`Processing ${event.type} for order ${orderId}`)

        // ATOMICO: Tenta di aggiornare solo se PENDING_PAYMENT
        // Questo previene race condition con cancellazione manuale
        const updateResult = await prisma.order.updateMany({
          where: { 
            id: orderId, 
            status: "PENDING_PAYMENT"  // Solo se non è già stato processato
          },
          data: { 
            status: "CANCELLED",
            isArchived: true 
          }
        })

        if (updateResult.count === 0) {
          console.log(`Order ${orderId} already processed (not PENDING_PAYMENT), skipping`)
          return NextResponse.json({ received: true })
        }

        // Ripristina stock (ora sicuro perché abbiamo il lock)
        await restoreStock(orderId)

        console.log(`✅ Order ${orderId} cancelled and stock restored`)
        break
      }

      default:
        console.log(`Ignored event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    )
  }
}
