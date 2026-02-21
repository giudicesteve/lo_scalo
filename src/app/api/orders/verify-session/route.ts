import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { sendOrderConfirmation, sendAdminNotification, sendGiftCardEmail } from "@/lib/email"

// POST - Verifica sessione Stripe e completa ordine se necessario
export async function POST(req: Request) {
  try {
    const { orderNumber, sessionId } = await req.json()

    if (!orderNumber || !sessionId) {
      return NextResponse.json(
        { error: "Missing orderNumber or sessionId" },
        { status: 400 }
      )
    }

    // 1. Recupera l'ordine
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { 
        items: { include: { product: { select: { name: true } } } },
        giftCards: true 
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    // 2. Se già completato, controlla se email sono state inviate
    if (order.status !== "PENDING_PAYMENT") {
      // Se email non inviate (fallback se webhook ha fallito), invia ora
      if (!order.emailSent) {
        const hasGiftCards = order.giftCards.length > 0
        const orderDetails = {
          orderNumber: order.orderNumber,
          email: order.email,
          phone: order.phone || undefined,
          total: order.total,
          items: order.items.map(item => ({
            name: item.product?.name || "Prodotto",
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
          // Invia email sequenzialmente con delay per rate limit
          const results = []
          
          results.push(await sendOrderConfirmation(orderDetails))
          await new Promise(r => setTimeout(r, 600))
          
          results.push(await sendAdminNotification(orderDetails))
          await new Promise(r => setTimeout(r, 600))
          
          if (hasGiftCards) {
            results.push(await sendGiftCardEmail(orderDetails))
          } else {
            results.push({ success: true })
          }

          if (results[0].success) {
            await prisma.order.update({
              where: { id: order.id },
              data: { emailSent: true }
            })
            console.log(`📧 Emails sent via verify-session (fallback) for order ${order.id}`)
          }
        } catch (err) {
          console.error('Error sending fallback emails:', err)
        }
      }

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          email: order.email,
          total: order.total,
          createdAt: order.createdAt,
          items: order.items.map(item => ({
            id: item.id,
            name: item.product?.name || "Prodotto",
            quantity: item.quantity,
            size: item.size,
            totalPrice: item.totalPrice,
          })),
          giftCards: order.giftCards.map(gc => ({
            id: gc.id,
            code: gc.code,
            initialValue: gc.initialValue,
            isActive: gc.isActive,
          })),
        },
        source: "database",
      })
    }

    // 3. Verifica con Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== "paid" || session.status !== "complete") {
      return NextResponse.json({
        success: false,
        status: session.payment_status,
        message: "Payment not completed",
      })
    }

    // 4. Completa l'ordine (idempotente - come il webhook)
    const hasProducts = order.items.length > 0
    const hasGiftCards = order.giftCards.length > 0
    const newStatus = (hasGiftCards && !hasProducts) ? "DELIVERED" : "COMPLETED"

    const updateResult = await prisma.order.updateMany({
      where: {
        id: order.id,
        status: "PENDING_PAYMENT",
      },
      data: {
        status: newStatus,
        stripePaymentId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
      },
    })

    // Attiva gift card
    if (updateResult.count > 0 && hasGiftCards) {
      await prisma.giftCard.updateMany({
        where: { orderId: order.id },
        data: { isActive: true, activatedAt: new Date() },
      })
    }

    // 5. Invia email se non già inviate (idempotenza)
    if (updateResult.count > 0 && !order.emailSent) {
      const orderDetails = {
        orderNumber: order.orderNumber,
        email: order.email,
        phone: order.phone || undefined,
        total: order.total,
        items: order.items.map(item => ({
          name: item.product?.name || "Prodotto",
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
        // Invia email sequenzialmente con delay per rate limit (2 req/sec)
        const results = []
        
        results.push(await sendOrderConfirmation(orderDetails))
        await new Promise(r => setTimeout(r, 600))
        
        results.push(await sendAdminNotification(orderDetails))
        await new Promise(r => setTimeout(r, 600))
        
        if (hasGiftCards) {
          results.push(await sendGiftCardEmail(orderDetails))
        } else {
          results.push({ success: true })
        }

        if (results[0].success) {
          await prisma.order.update({
            where: { id: order.id },
            data: { emailSent: true }
          })
          console.log(`📧 Emails sent via verify-session for order ${order.id}`)
        }
      } catch (err) {
        console.error('Error sending emails from verify-session:', err)
        // Non bloccare la risposta, il webhook potrebbe ritentare
      }
    }

    // 6. Ritorna ordine aggiornato (stesso formato di /api/orders/[orderNumber])
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: { include: { product: { select: { name: true } } } },
        giftCards: true,
      },
    })

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Failed to reload order" },
        { status: 500 }
      )
    }

    // Sanitizza come l'altro endpoint
    const sanitizedOrder = {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      email: updatedOrder.email,
      total: updatedOrder.total,
      createdAt: updatedOrder.createdAt,
      items: updatedOrder.items.map(item => ({
        id: item.id,
        name: item.product.name,
        quantity: item.quantity,
        size: item.size,
        totalPrice: item.totalPrice,
      })),
      giftCards: updatedOrder.giftCards.map(gc => ({
        id: gc.id,
        code: gc.code,
        initialValue: gc.initialValue,
        isActive: gc.isActive,
      })),
    }

    return NextResponse.json({
      success: true,
      order: sanitizedOrder,
      source: "stripe-verification",
    })

  } catch (error) {
    console.error("Error verifying session:", error)
    return NextResponse.json(
      { error: "Failed to verify session" },
      { status: 500 }
    )
  }
}
