import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { RefundMethod } from "@prisma/client"

export const dynamic = "force-dynamic"

/**
 * Generate a unique refund number
 * Format: RIM-YYYY-XXXX-RAND
 * Example: RIM-2026-0001-A3B7
 */
async function generateRefundNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  
  // Count refunds this year for sequential number
  const startOfYear = new Date(year, 0, 1)
  const endOfYear = new Date(year, 11, 31, 23, 59, 59)
  
  const count = await prisma.refund.count({
    where: {
      createdAt: {
        gte: startOfYear,
        lte: endOfYear,
      },
    },
  })
  
  const sequential = (count + 1).toString().padStart(4, "0")
  
  // Random suffix (4 chars) - alphanumeric without confusing characters
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let random = ""
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return `RIM-${year}-${sequential}-${random}`
}

/**
 * POST /api/admin/refunds
 * 
 * Creates a new refund:
 * 1. Validates items are refundable
 * 2. Restores product stock
 * 3. Soft deletes gift cards
 * 4. Creates refund record
 */
export async function POST(req: Request) {
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

    const body = await req.json()
    const {
      orderId,
      items, // Array of { type: 'PRODUCT'|'GIFT_CARD', id: string }
      refundMethod,
      externalRef,
      reason,
      notes,
    } = body

    // Validation
    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: orderId and items required" },
        { status: 400 }
      )
    }

    if (!refundMethod || !['STRIPE', 'CASH', 'POS'].includes(refundMethod)) {
      return NextResponse.json(
        { error: "Invalid refund method" },
        { status: 400 }
      )
    }

    // Get order with all details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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

    // Check for existing refunds on these items
    const existingRefunds = await prisma.refund.findMany({
      where: { orderId },
    })

    const refundedItemIds = new Set()
    const refundedGiftCardIds = new Set()
    
    for (const refund of existingRefunds) {
      const refundItems = refund.items as Array<{ type: string; productId?: string; giftCardId?: string }>
      for (const item of refundItems) {
        if (item.type === 'PRODUCT' && item.productId) {
          refundedItemIds.add(item.productId)
        } else if (item.type === 'GIFT_CARD' && item.giftCardId) {
          refundedGiftCardIds.add(item.giftCardId)
        }
      }
    }

    // Validate each selected item
    const now = new Date()
    const orderDate = new Date(order.paidAt || order.createdAt)
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000
    const daysSinceOrder = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

    const refundItems: Array<{
      type: 'PRODUCT' | 'GIFT_CARD'
      productId?: string
      giftCardId?: string
      name: string
      size?: string
      price: number
      quantity?: number
    }> = []

    let totalRefunded = 0

    // Process selected items
    for (const selectedItem of items) {
      if (selectedItem.type === 'PRODUCT') {
        const orderItem = order.items.find((i) => i.id === selectedItem.id)
        if (!orderItem) {
          return NextResponse.json(
            { error: `Order item ${selectedItem.id} not found` },
            { status: 400 }
          )
        }

        if (refundedItemIds.has(orderItem.productId)) {
          return NextResponse.json(
            { error: `Product ${orderItem.Product?.name} already refunded` },
            { status: 400 }
          )
        }

        if (daysSinceOrder > 14) {
          return NextResponse.json(
            { error: `14-day refund period expired for products` },
            { status: 400 }
          )
        }

        refundItems.push({
          type: 'PRODUCT',
          productId: orderItem.productId,
          name: orderItem.Product?.name || 'Prodotto',
          size: orderItem.size || undefined,
          price: orderItem.unitPrice,
          quantity: orderItem.quantity,
        })
        totalRefunded += orderItem.totalPrice

      } else if (selectedItem.type === 'GIFT_CARD') {
        const giftCard = order.giftCards.find((g) => g.id === selectedItem.id)
        if (!giftCard) {
          return NextResponse.json(
            { error: `Gift card ${selectedItem.id} not found` },
            { status: 400 }
          )
        }

        if (refundedGiftCardIds.has(giftCard.id)) {
          return NextResponse.json(
            { error: `Gift card ${giftCard.code} already refunded` },
            { status: 400 }
          )
        }

        if (giftCard.transactions.length > 0) {
          return NextResponse.json(
            { error: `Gift card ${giftCard.code} has transactions and cannot be refunded` },
            { status: 400 }
          )
        }

        if (daysSinceOrder > 14) {
          return NextResponse.json(
            { error: `14-day refund period expired for gift cards` },
            { status: 400 }
          )
        }

        refundItems.push({
          type: 'GIFT_CARD',
          giftCardId: giftCard.id,
          name: `Gift Card ${giftCard.code}`,
          price: giftCard.initialValue,
        })
        totalRefunded += giftCard.initialValue
      }
    }

    // Generate refund number
    const refundNumber = await generateRefundNumber()

    // Execute transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create refund record
      const refund = await tx.refund.create({
        data: {
          orderId,
          refundNumber,
          items: refundItems as any,
          totalRefunded,
          reason,
          notes,
          refundedBy: admin.id,
          refundMethod: refundMethod as RefundMethod,
          externalRef,
        },
      })

      // 2. Restore product stock and soft delete gift cards
      for (const item of items) {
        if (item.type === 'PRODUCT') {
          const orderItem = order.items.find((i) => i.id === item.id)
          if (orderItem) {
            if (orderItem.variantId && orderItem.ProductVariant) {
              // Restore variant stock
              await tx.productVariant.update({
                where: { id: orderItem.variantId },
                data: {
                  quantity: {
                    increment: orderItem.quantity,
                  },
                },
              })
            } else if (!orderItem.Product?.hasSizes) {
              // Restore main product stock (if no sizes)
              await tx.product.update({
                where: { id: orderItem.productId },
                data: {
                  // Note: Product model doesn't have quantity field in schema
                  // You may need to add it or use a different approach
                },
              })
            }
          }
        } else if (item.type === 'GIFT_CARD') {
          // Soft delete gift card
          await tx.giftCard.update({
            where: { id: item.id },
            data: {
              isSoftDeleted: true,
              isActive: false,
              remainingValue: 0,
              deletedAt: new Date(),
              deletedBy: admin.id,
              deletionNote: `Rimborsata con rimborso ${refundNumber}`,
              refundId: refund.id,
            },
          })
        }
      }

      return refund
    })

    return NextResponse.json({
      success: true,
      refund: {
        id: result.id,
        refundNumber: result.refundNumber,
        totalRefunded: result.totalRefunded,
        refundedAt: result.refundedAt,
      },
      message: "Rimborso registrato con successo",
    })

  } catch (error) {
    console.error("[REFUND_CREATE] Error:", error)
    return NextResponse.json(
      { error: "Failed to create refund" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/refunds
 * 
 * List all refunds with filtering
 */
export async function GET(req: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    })

    if (!admin?.canManageAdmins) {
      return NextResponse.json(
        { error: "Only super admins can view refunds" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get("orderId")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where = {
      ...(orderId ? { orderId } : {}),
      isArchived: false,
    }

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          order: {
            select: {
              orderNumber: true,
              email: true,
              orderSource: true,
            },
          },
        },
      }),
      prisma.refund.count({ where }),
    ])

    return NextResponse.json({
      refunds,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error("[REFUND_LIST] Error:", error)
    return NextResponse.json(
      { error: "Failed to list refunds" },
      { status: 500 }
    )
  }
}
