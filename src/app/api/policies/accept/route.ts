import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"

// POST /api/policies/accept
// Records policy acceptance for an order
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, orderId, policyIds, language } = body

    if (!email || !orderId || !policyIds || !Array.isArray(policyIds)) {
      return NextResponse.json(
        { error: "Missing required fields: email, orderId, policyIds" },
        { status: 400 }
      )
    }

    // Get client IP address
    const headersList = headers()
    const ipAddress = headersList.get("x-forwarded-for") || 
                      headersList.get("x-real-ip") || 
                      "unknown"

    // Create acceptance records for each policy
    // Note: We'll add language tracking when we update the schema
    const acceptances = await prisma.$transaction(
      policyIds.map((policyId: string) =>
        prisma.policyAcceptance.create({
          data: {
            policyId,
            email,
            orderId,
            ipAddress: ipAddress.split(",")[0].trim(), // Get first IP if multiple
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: `Recorded ${acceptances.length} policy acceptances`,
      acceptances,
      language: language || "it", // Return language for confirmation
    })
  } catch (error) {
    console.error("Error recording policy acceptance:", error)
    return NextResponse.json(
      { error: "Failed to record policy acceptance" },
      { status: 500 }
    )
  }
}
