import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { sendOrderConfirmation, sendAdminNotification } from "@/lib/email"
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
          include: { 
            items: { include: { product: true } }, 
            giftCards: true 
          }
        })

        if (!order) {
          console.error(`Order ${orderId} not found`)
          return NextResponse.json({ received: true })
        }

        // Determina nuovo stato
        const hasProducts = order.items.length > 0
        const hasGiftCards = order.giftCards.length > 0
        const newStatus = (hasGiftCards && !hasProducts) ? "DELIVERED" : "COMPLETED"

        // Estrai il Payment Intent ID (può essere stringa o oggetto)
        const paymentIntentId = typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id

        // ATOMIC UPDATE: cambia stato solo se è PENDING_PAYMENT
        const updateResult = await prisma.order.updateMany({
          where: { 
            id: orderId, 
            status: "PENDING_PAYMENT"  // clausola di guardia
          },
          data: { 
            status: newStatus,
            stripePaymentId: session.id,           // ID sessione (cs_...)
            stripePaymentIntentId: paymentIntentId // ID payment (pi_...)
          }
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

        // Invia email solo se non già inviate (idempotenza)
        console.log(`📧 [WEBHOOK] Check email for order ${orderId}: emailSent=${order.emailSent}`)
        if (!order.emailSent) {
          console.log(`📧 [WEBHOOK] 🚀 INVIO EMAIL per ordine ${orderId}`)
          const orderDetails = {
            orderNumber: order.orderNumber,
            email: order.email,
            phone: order.phone || undefined,
            total: order.total,
            items: order.items.map(item => ({
              name: item.product.name,
              quantity: item.quantity,
              size: item.size || undefined,
              totalPrice: item.totalPrice
            })),
            giftCards: order.giftCards.map(gc => ({
              code: gc.code,
              initialValue: gc.initialValue
            })),
            createdAt: order.createdAt
          }

          try {
            // Invia email sequenzialmente con delay per rispettare rate limit (2 req/sec)
            console.log(`📧 [WEBHOOK] Chiamo sendOrderConfirmation per ${order.orderNumber}`)
            const results = []
            
            // 1. Email cliente (sempre) - include gift card se presenti
            results.push(await sendOrderConfirmation(orderDetails))
            await new Promise(r => setTimeout(r, 600)) // 600ms delay
            
            // 2. Email admin
            results.push(await sendAdminNotification(orderDetails))

            console.log('Email sending results:', {
              customer: results[0].success,
              admin: results[1].success,
              attachments: results[0].attachments || 0
            })

            // Segna come inviato solo se almeno l'email cliente è andata a buon fine
            if (results[0].success) {
              await prisma.order.update({
                where: { id: orderId },
                data: { emailSent: true }
              })
              console.log(`✅ [WEBHOOK] Email SENT e MARKED per order ${orderId}`)
            } else {
              console.log(`❌ [WEBHOOK] Email FALLITA per order ${orderId}, non marco come inviata`)
            }
          } catch (err) {
            // Non bloccare il webhook se le email falliscono
            // Verranno ritentate dalla pagina di success o dal prossimo webhook
            console.error('Error sending emails (will retry later):', err)
          }
        } else {
          console.log(`⏭️ [WEBHOOK] SKIP - Email già inviata per order ${orderId}`)
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
