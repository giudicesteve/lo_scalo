import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { RefundMethod } from "@prisma/client"
import { centsToEuro } from "@/lib/utils/currency"
import { getItalyDayRange, getItalyMonthRange } from "@/lib/date-utils"
import { withRateLimit, rateLimitConfigs } from "@/lib/rate-limit-middleware"

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
  // Rate limiting: max 100 richieste al minuto per admin
  const rateLimitResponse = withRateLimit(req, rateLimitConfigs.adminApi)
  if (rateLimitResponse) {
    console.warn(`[RATE LIMIT] Bloccata creazione rimborso`)
    return rateLimitResponse
  }

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
      items, // Array of { type: 'PRODUCT'|'GIFT_CARD', id: string, refundQuantity?: number }
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
      orderItemId?: string
      productId?: string
      giftCardId?: string
      name: string
      size?: string
      price: number
      quantity: number
      wasDeleted?: boolean
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

        // Calculate available quantity
        const alreadyRefundedQty = orderItem.refundedQuantity || 0
        const availableQty = orderItem.quantity - alreadyRefundedQty
        
        if (availableQty <= 0) {
          return NextResponse.json(
            { error: `Product ${orderItem.Product?.name} already fully refunded` },
            { status: 400 }
          )
        }

        // Get refund quantity (default to all available)
        const refundQty = selectedItem.refundQuantity || availableQty
        
        if (refundQty > availableQty) {
          return NextResponse.json(
            { error: `Cannot refund ${refundQty} items, only ${availableQty} available` },
            { status: 400 }
          )
        }

        if (refundQty <= 0) {
          return NextResponse.json(
            { error: `Invalid refund quantity: ${refundQty}` },
            { status: 400 }
          )
        }

        // Check if product was deleted at time of refund
        const wasDeleted = orderItem.Product?.isDeleted || false
        
        // Rimborso sempre possibile - imprenditore libero di decidere
        refundItems.push({
          type: 'PRODUCT',
          orderItemId: orderItem.id,
          productId: orderItem.productId,
          name: orderItem.Product?.name || 'Prodotto',
          size: orderItem.size || undefined,
          price: orderItem.unitPrice,
          quantity: refundQty,
          wasDeleted,
        })
        totalRefunded += orderItem.unitPrice * refundQty

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

        // Rimborso sempre possibile - imprenditore libero di decidere
        refundItems.push({
          type: 'GIFT_CARD',
          giftCardId: giftCard.id,
          name: `Gift Card ${giftCard.code}`,
          price: giftCard.initialValue,
          quantity: 1,
        })
        totalRefunded += giftCard.initialValue
      }
    }

    // Generate refund number
    const refundNumber = await generateRefundNumber()

    // Build enhanced notes with deleted products info
    const deletedProducts = refundItems.filter(item => item.type === 'PRODUCT' && item.wasDeleted)
    let enhancedNotes = notes || ''
    if (deletedProducts.length > 0) {
      const deletedNames = deletedProducts.map(p => `${p.name}${p.size ? ` (${p.size})` : ''}`).join(', ')
      enhancedNotes = enhancedNotes 
        ? `${enhancedNotes}\n\n[NOTE: I seguenti prodotti erano stati eliminati dal catalogo: ${deletedNames}. Lo stock non è stato ripristinato.]`
        : `[NOTE: I seguenti prodotti erano stati eliminati dal catalogo: ${deletedNames}. Lo stock non è stato ripristinato.]`
    }

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
          notes: enhancedNotes,
          refundedBy: admin.id,
          refundMethod: refundMethod as RefundMethod,
          externalRef,
        },
      })

      // 2. Restore product stock, update refundedQuantity, and soft delete gift cards
      for (const item of refundItems) {
        if (item.type === 'PRODUCT') {
          const orderItem = order.items.find((i) => i.id === item.orderItemId)
          if (orderItem) {
            // Update refundedQuantity
            const newRefundedQty = (orderItem.refundedQuantity || 0) + item.quantity
            await tx.orderItem.update({
              where: { id: orderItem.id },
              data: { refundedQuantity: newRefundedQty },
            })
            
            // Restore stock only if product was NOT deleted
            // (Deleted products remain in DB for order history but stock should not be updated)
            if (orderItem.variantId && orderItem.ProductVariant && !orderItem.Product?.isDeleted) {
              await tx.productVariant.update({
                where: { id: orderItem.variantId },
                data: {
                  quantity: {
                    increment: item.quantity,
                  },
                },
              })
            }
          }
        } else if (item.type === 'GIFT_CARD') {
          // Soft delete gift card
          await tx.giftCard.update({
            where: { id: item.giftCardId },
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
        totalRefunded: centsToEuro(result.totalRefunded), // Convert cents to euro
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
    const year = searchParams.get("year")
    const month = searchParams.get("month")
    const date = searchParams.get("date") // YYYY-MM-DD format for daily report
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: any = {
      ...(orderId ? { orderId } : {}),
      isArchived: false,
    }

    // Filter by specific date (YYYY-MM-DD) - used for daily accounting
    if (date) {
      const [yearStr, monthStr, dayStr] = date.split('-').map(Number)
      const { start, end } = getItalyDayRange(yearStr, monthStr, dayStr)
      where.refundedAt = {
        gte: start,
        lte: end,
      }
    }
    // Filter by month/year if provided (used for monthly report)
    else if (year && month) {
      const { start, end } = getItalyMonthRange(parseInt(year), parseInt(month))
      where.refundedAt = {
        gte: start,
        lte: end,
      }
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
              id: true,
              orderNumber: true,
              email: true,
              orderSource: true,
            },
          },
        },
      }),
      prisma.refund.count({ where }),
    ])

    // Calculate breakdown for each refund and convert cents to euro
    const refundsWithBreakdown = refunds.map(refund => {
      const items = refund.items as Array<{
        type: 'PRODUCT' | 'GIFT_CARD'
        price: number
        quantity?: number
        name?: string
      }>
      
      // Convert item prices from cents to euro for calculation
      const productTotal = items
        .filter(item => item.type === 'PRODUCT')
        .reduce((sum, item) => sum + (centsToEuro(item.price) * (item.quantity || 1)), 0)
      
      const giftCardTotal = items
        .filter(item => item.type === 'GIFT_CARD')
        .reduce((sum, item) => sum + (centsToEuro(item.price) * (item.quantity || 1)), 0)
      
      return {
        ...refund,
        totalRefunded: centsToEuro(refund.totalRefunded), // Convert cents to euro
        productTotal,
        giftCardTotal,
      }
    })

    return NextResponse.json({
      refunds: refundsWithBreakdown,
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
