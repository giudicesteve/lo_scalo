import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering - uses req.headers
export const dynamic = 'force-dynamic'

/**
 * POST /api/jobs/deactivate-expired-gift-cards
 * 
 * This endpoint should be called daily at 2:00 AM Italian time
 * It finds all gift cards that have expired and marks them as expired and archived
 * 
 * It processes ALL expired cards from the past, not just today,
 * so if the job fails one day, the next run will catch up.
 * 
 * Security: This endpoint should be protected by a cron secret
 * in production to prevent unauthorized access.
 */
export async function POST(req: Request) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get current time in Italian timezone
    const now = new Date()
    const italianNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Europe/Rome" })
    )

    console.log(`[CRON] Running deactivate-expired-gift-cards job at ${italianNow.toISOString()} (Italian time)`)

    // Find all gift cards that:
    // 1. Have an expiry date set (expiresAt is not null)
    // 2. Have expired (expiresAt < now in Italian timezone)
    // 3. Are not already marked as expired
    // 4. Are not already archived
    
    // We need to convert the comparison to Italian timezone
    const expiredGiftCards = await prisma.$queryRaw<Array<{ id: string; code: string; expiresAt: Date }>>`
      SELECT id, code, "expiresAt"
      FROM "GiftCard"
      WHERE "expiresAt" IS NOT NULL
        AND "isExpired" = false
        AND "expiresAt" < NOW()
    `

    console.log(`[CRON] Found ${expiredGiftCards.length} expired gift cards`)

    if (expiredGiftCards.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired gift cards found",
        processed: 0,
      })
    }

    // Update all expired gift cards
    const updateResult = await prisma.giftCard.updateMany({
      where: {
        id: {
          in: expiredGiftCards.map((gc) => gc.id),
        },
      },
      data: {
        isExpired: true,
        isArchived: true,
        isActive: false,
      },
    })

    console.log(`[CRON] Deactivated ${updateResult.count} gift cards`)

    // Log each deactivated card for audit purposes
    for (const gc of expiredGiftCards) {
      console.log(`[CRON] Deactivated gift card: ${gc.code} (expired: ${gc.expiresAt.toISOString()})`)
    }

    return NextResponse.json({
      success: true,
      message: `Deactivated ${updateResult.count} expired gift cards`,
      processed: updateResult.count,
      giftCards: expiredGiftCards.map((gc) => ({
        id: gc.id,
        code: gc.code,
        expiredAt: gc.expiresAt,
      })),
    })
  } catch (error) {
    console.error("[CRON] Error in deactivate-expired-gift-cards job:", error)
    return NextResponse.json(
      { error: "Failed to process expired gift cards" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/jobs/deactivate-expired-gift-cards
 * 
 * For testing purposes - returns the count of gift cards that would be deactivated
 * without actually deactivating them
 */
export async function GET(req: Request) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const expiredGiftCards = await prisma.$queryRaw<Array<{ id: string; code: string; expiresAt: Date }>>`
      SELECT id, code, "expiresAt"
      FROM "GiftCard"
      WHERE "expiresAt" IS NOT NULL
        AND "isExpired" = false
        AND "expiresAt" < NOW()
    `

    return NextResponse.json({
      wouldDeactivate: expiredGiftCards.length,
      giftCards: expiredGiftCards.map((gc) => ({
        id: gc.id,
        code: gc.code,
        expiresAt: gc.expiresAt,
      })),
    })
  } catch (error) {
    console.error("Error checking expired gift cards:", error)
    return NextResponse.json(
      { error: "Failed to check expired gift cards" },
      { status: 500 }
    )
  }
}
