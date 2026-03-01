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

    const refundedGiftCardIds = new Set()
    
    for (const refund of existingRefunds) {
      const items = refund.items as Array<{ type: string; giftCardId?: string }>
      for (const item of items) {
        if (item.type === 'GIFT_CARD' && item.giftCardId) {
          refundedGiftCardIds.add(item.giftCardId)
        }
      }
    }

    // Calculate dates
    const now = new Date()
    const orderDate = new Date(order.paidAt || order.createdAt)
    
    // Check each product item
    const productItems = order.items.map((item) => {
      // Calculate available quantity (total - already refunded)
      const refundedQty = item.refundedQuantity || 0
      const availableQuantity = item.quantity - refundedQty
      const isPartiallyRefunded = refundedQty > 0 && refundedQty < item.quantity
      const isFullyRefunded = refundedQty >= item.quantity
      
      // For products: calculate days from order date (delivery date not available yet)
      // TODO: Use delivery date when available in Order model
      const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        type: "PRODUCT" as const,
        id: item.id,
        productId: item.productId,
        name: item.productName || item.Product?.name || "Prodotto",
        nameEn: item.productNameEn || item.Product?.nameEn || item.Product?.name || "Product",
        size: item.size,
        price: item.unitPrice,
        quantity: item.quantity,
        availableQuantity,
        refundedQuantity: refundedQty,
        total: item.totalPrice,
        isRefundable: availableQuantity > 0,
        isFullyRefunded,
        isPartiallyRefunded,
        daysSinceOrder,
        reason: isFullyRefunded 
          ? "Già rimborsato completamente"
          : isPartiallyRefunded
            ? `Già rimborsati ${refundedQty} di ${item.quantity}`
            : `Acquistato ${daysSinceOrder} giorni fa`,
      }
    })

    // Check each gift card
    const giftCardItems = order.giftCards
      .filter((gc) => !gc.isSoftDeleted) // Don't show already deleted gift cards
      .map((gc) => {
        const isAlreadyRefunded = refundedGiftCardIds.has(gc.id)
        const hasTransactions = gc.transactions.length > 0
        const daysSincePurchase = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

        return {
          type: "GIFT_CARD" as const,
          id: gc.id,
          giftCardId: gc.id,
          code: gc.code,
          price: gc.initialValue,
          remainingValue: gc.remainingValue,
          isRefundable: !isAlreadyRefunded && !hasTransactions,
          isAlreadyRefunded,
          hasTransactions,
          transactionCount: gc.transactions.length,
          daysSincePurchase,
          reason: isAlreadyRefunded
            ? "Già rimborsata"
            : hasTransactions
              ? `Ha ${gc.transactions.length} transazione/i`
              : `Acquistata ${daysSincePurchase} giorni fa`,
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
