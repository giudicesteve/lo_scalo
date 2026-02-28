import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/orders/[id]/refund-preview
 * 
 * Returns a preview of refundable items for an order
 * Checks:
 * - 14 days from delivery date (products)
 * - 14 days from purchase date (gift cards)
 * - Gift cards with transactions are NOT refundable
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    // Check authentication and super admin permission
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    })

    if (!admin?.canManageAdmins) {
      return NextResponse.json(
        { error: "Only super admins can process refunds" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get order with all details
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            Product: true,
            ProductVariant: true,
          },
        },
        giftCards: {
          include: {
            transactions: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Check if order has already been refunded
    const existingRefunds = await prisma.refund.findMany({
      where: { orderId: id },
    })

    const refundedItemIds = new Set()
    const refundedGiftCardIds = new Set()
    
    for (const refund of existingRefunds) {
      const items = refund.items as Array<{ type: string; productId?: string; giftCardId?: string }>
      for (const item of items) {
        if (item.type === 'PRODUCT' && item.productId) {
          refundedItemIds.add(item.productId)
        } else if (item.type === 'GIFT_CARD' && item.giftCardId) {
          refundedGiftCardIds.add(item.giftCardId)
        }
      }
    }

    // Calculate dates
    const now = new Date()
    const orderDate = new Date(order.paidAt || order.createdAt)
    
    // 14 days in milliseconds
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000

    // Check each product item
    const productItems = order.items.map((item) => {
      const isAlreadyRefunded = refundedItemIds.has(item.productId)
      
      // For products: 14 days from order date (we don't have delivery date, use order date)
      // TODO: Add delivery date to Order model if needed for more accurate calculation
      const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
      const isWithin14Days = daysSinceOrder <= 14
      
      return {
        type: "PRODUCT" as const,
        id: item.id,
        productId: item.productId,
        name: item.productName || item.Product?.name || "Prodotto",
        nameEn: item.productNameEn || item.Product?.nameEn || item.Product?.name || "Product",
        size: item.size,
        price: item.unitPrice,
        quantity: item.quantity,
        total: item.totalPrice,
        isRefundable: !isAlreadyRefunded && isWithin14Days,
        isAlreadyRefunded,
        daysSinceOrder,
        reason: isAlreadyRefunded 
          ? "Già rimborsato" 
          : !isWithin14Days 
            ? `Scaduti i 14 giorni (${daysSinceOrder} giorni fa)` 
            : null,
      }
    })

    // Check each gift card
    const giftCardItems = order.giftCards
      .filter((gc) => !gc.isSoftDeleted) // Don't show already deleted gift cards
      .map((gc) => {
        const isAlreadyRefunded = refundedGiftCardIds.has(gc.id)
        const hasTransactions = gc.transactions.length > 0
        const daysSincePurchase = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
        const isWithin14Days = daysSincePurchase <= 14

        return {
          type: "GIFT_CARD" as const,
          id: gc.id,
          giftCardId: gc.id,
          code: gc.code,
          value: gc.initialValue,
          remainingValue: gc.remainingValue,
          isRefundable: !isAlreadyRefunded && !hasTransactions && isWithin14Days,
          isAlreadyRefunded,
          hasTransactions,
          transactionCount: gc.transactions.length,
          daysSincePurchase,
          reason: isAlreadyRefunded
            ? "Già rimborsata"
            : hasTransactions
              ? `Ha ${gc.transactions.length} transazione/i`
              : !isWithin14Days
                ? `Scaduti i 14 giorni (${daysSincePurchase} giorni fa)`
                : null,
        }
      })

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        orderSource: order.orderSource,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        total: order.total,
        email: order.email,
      },
      products: productItems,
      giftCards: giftCardItems,
      canRefund: productItems.some((p) => p.isRefundable) || giftCardItems.some((g) => g.isRefundable),
      existingRefunds: existingRefunds.map((r) => ({
        id: r.id,
        refundNumber: r.refundNumber,
        totalRefunded: r.totalRefunded,
        refundedAt: r.refundedAt,
      })),
    })
  } catch (error) {
    console.error("[REFUND_PREVIEW] Error:", error)
    return NextResponse.json(
      { error: "Failed to get refund preview" },
      { status: 500 }
    )
  }
}
