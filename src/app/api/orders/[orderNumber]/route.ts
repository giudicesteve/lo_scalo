import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { orderNumber: string } }
) {
  try {
    const orderNumber = params.orderNumber

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            product: {
              select: { name: true }
            }
          }
        },
        giftCards: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    // Non esporre dati sensibili - filtra solo quelli necessari
    const sanitizedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      email: order.email,
      total: order.total,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        id: item.id,
        name: item.product.name,
        quantity: item.quantity,
        size: item.size,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      giftCards: order.giftCards.map(gc => ({
        id: gc.id,
        code: gc.code,
        initialValue: gc.initialValue,
        isActive: gc.isActive,
        expiresAt: gc.expiresAt,
      })),
    }

    return NextResponse.json(sanitizedOrder)
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    )
  }
}
