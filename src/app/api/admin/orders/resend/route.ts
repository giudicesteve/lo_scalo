import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendOrderConfirmation } from "@/lib/email"
import { auth } from "@/auth"

// POST - Reinvia email di conferma ordine al cliente
export async function POST(req: Request) {
  try {
    // Verifica autenticazione admin
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verifica che l'utente sia admin
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email }
    })

    if (!admin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    // Recupera orderId dal body
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing orderId" },
        { status: 400 }
      )
    }

    // Recupera ordine completo
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        giftCards: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    // Prepara i dettagli per l'email
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

    // Invia email di conferma
    const result = await sendOrderConfirmation(orderDetails)

    if (!result.success) {
      console.error("Failed to resend order confirmation:", result.error)
      return NextResponse.json(
        { error: "Failed to send email", details: result.error },
        { status: 500 }
      )
    }

    console.log(`📧 Order confirmation resent for order ${order.orderNumber} to ${order.email}`)
    
    return NextResponse.json({
      success: true,
      message: `Email inviata a ${order.email}`,
      attachments: result.attachments || 0
    })

  } catch (error) {
    console.error("Error in resend order confirmation:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
