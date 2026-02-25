import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calculateGiftCardExpiry, getExpiryPolicyDescription } from "@/lib/gift-card-expiry"

// Force dynamic rendering - uses prisma database connection
export const dynamic = 'force-dynamic'

/**
 * GET /api/gift-card-settings
 * 
 * Public endpoint to get gift card expiry settings and preview
 * Used by the frontend to display expiry policy to customers
 */
export async function GET() {
  try {
    // Get the admin settings
    const adminSettings = await prisma.admin.findFirst({
      select: { expiryType: true, expiryTime: true },
    })

    const expiryType = adminSettings?.expiryType || "END_OF_MONTH"
    const expiryTime = adminSettings?.expiryTime || "ONE_YEAR"

    // Calculate preview expiry date (if purchased today)
    const previewExpiryDate = calculateGiftCardExpiry(expiryType, expiryTime, new Date())

    // Get policy descriptions
    const policyIt = getExpiryPolicyDescription(expiryType, expiryTime, "it")
    const policyEn = getExpiryPolicyDescription(expiryType, expiryTime, "en")

    return NextResponse.json({
      expiryType,
      expiryTime,
      previewExpiryDate: previewExpiryDate.toISOString(),
      policyIt,
      policyEn,
    })
  } catch (error) {
    console.error("Error fetching gift card settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}
