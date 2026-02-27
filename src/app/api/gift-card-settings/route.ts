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
  // During build time, database might not be available - return defaults
  if (!process.env.DATABASE_URL) {
    const previewExpiryDate = calculateGiftCardExpiry("END_OF_MONTH", "ONE_YEAR", new Date())
    return NextResponse.json({
      expiryType: "END_OF_MONTH",
      expiryTime: "ONE_YEAR",
      previewExpiryDate: previewExpiryDate.toISOString(),
      policyIt: getExpiryPolicyDescription("END_OF_MONTH", "ONE_YEAR", "it"),
      policyEn: getExpiryPolicyDescription("END_OF_MONTH", "ONE_YEAR", "en"),
    })
  }

  try {
    // Get or create the global expiry settings
    const config = await prisma.giftCardExpiryConfig.upsert({
      where: { id: "gift-card-expiry" },
      update: {},
      create: {
        id: "gift-card-expiry",
        expiryType: "END_OF_MONTH",
        expiryTime: "ONE_YEAR",
      },
    })

    const expiryType = config?.expiryType || "END_OF_MONTH"
    const expiryTime = config?.expiryTime || "ONE_YEAR"

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
    // Return defaults on error
    const previewExpiryDate = calculateGiftCardExpiry("END_OF_MONTH", "ONE_YEAR", new Date())
    return NextResponse.json({
      expiryType: "END_OF_MONTH",
      expiryTime: "ONE_YEAR",
      previewExpiryDate: previewExpiryDate.toISOString(),
      policyIt: getExpiryPolicyDescription("END_OF_MONTH", "ONE_YEAR", "it"),
      policyEn: getExpiryPolicyDescription("END_OF_MONTH", "ONE_YEAR", "en"),
    })
  }
}
