import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { GiftCardExpiryType, GiftCardExpiryTime } from "@prisma/client"

// Force dynamic rendering - uses auth() which requires headers
export const dynamic = 'force-dynamic'

// GET /api/admin/settings/gift-card-expiry
// Returns the current gift card expiry settings
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin with manage admins permission
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    })

    if (!admin || !admin.canManageAdmins) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get or create the global config
    const config = await prisma.giftCardExpiryConfig.upsert({
      where: { id: "gift-card-expiry" },
      update: {},
      create: {
        id: "gift-card-expiry",
        expiryType: "END_OF_MONTH",
        expiryTime: "ONE_YEAR",
      },
    })

    // Return the current settings
    return NextResponse.json({
      expiryType: config.expiryType,
      expiryTime: config.expiryTime,
    })
  } catch (error) {
    console.error("Error fetching gift card expiry settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/settings/gift-card-expiry
// Updates the gift card expiry settings
export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin with manage admins permission
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    })

    if (!admin || !admin.canManageAdmins) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { expiryType, expiryTime } = body

    // Validate inputs
    if (!expiryType || !Object.values(GiftCardExpiryType).includes(expiryType)) {
      return NextResponse.json(
        { error: "Invalid expiryType. Must be EXACT_DATE or END_OF_MONTH" },
        { status: 400 }
      )
    }

    if (!expiryTime || !Object.values(GiftCardExpiryTime).includes(expiryTime)) {
      return NextResponse.json(
        { error: "Invalid expiryTime. Must be SIX_MONTHS, ONE_YEAR, or TWO_YEARS" },
        { status: 400 }
      )
    }

    // Update the global config (upsert - create if not exists, update if exists)
    const config = await prisma.giftCardExpiryConfig.upsert({
      where: { id: "gift-card-expiry" },
      update: {
        expiryType,
        expiryTime,
      },
      create: {
        id: "gift-card-expiry",
        expiryType,
        expiryTime,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Gift card expiry settings updated successfully",
      expiryType: config.expiryType,
      expiryTime: config.expiryTime,
    })
  } catch (error) {
    console.error("Error updating gift card expiry settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
