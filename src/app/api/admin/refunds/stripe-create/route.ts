import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/refunds/stripe-create
 * 
 * Creates a refund directly via Stripe API.
 * Only super admins can use this endpoint.
 * 
 * Body: {
 *   paymentIntentId: string - The Stripe Payment Intent ID (pi_xxxx)
 *   amount: number - Amount to refund in cents
 * }
 */
export async function POST(req: Request) {
  try {
    const session = await auth()

    // Check authentication
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check super admin permission
    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    })

    if (!admin?.canManageAdmins) {
      return NextResponse.json(
        { error: "Only super admins can create Stripe refunds" },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const { paymentIntentId, amount } = body

    // Validate parameters
    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid parameter: paymentIntentId" },
        { status: 400 }
      )
    }

    if (!paymentIntentId.startsWith("pi_")) {
      return NextResponse.json(
        { error: "Invalid payment intent ID format. Expected pi_xxxx" },
        { status: 400 }
      )
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid parameter: amount (must be a positive number in cents)" },
        { status: 400 }
      )
    }

    // Create refund via Stripe API
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount,
    })

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        status: refund.status,
      },
    })

  } catch (error) {
    console.error("[STRIPE_REFUND_CREATE] Error:", error)

    // Handle specific Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      const stripeError = error as Stripe.errors.StripeError

      // Handle specific error types
      switch (stripeError.code) {
        case "charge_already_refunded":
          return NextResponse.json(
            { error: "This payment has already been fully refunded" },
            { status: 400 }
          )

        case "amount_too_large":
          return NextResponse.json(
            { error: "Refund amount exceeds the available balance for this payment" },
            { status: 400 }
          )

        case "payment_intent_unexpected_state":
          return NextResponse.json(
            { error: "Payment intent is not in a refundable state" },
            { status: 400 }
          )

        case "resource_missing":
          return NextResponse.json(
            { error: "Payment intent not found" },
            { status: 400 }
          )

        case "insufficient_funds":
          return NextResponse.json(
            { error: "Insufficient funds to process this refund" },
            { status: 400 }
          )

        default:
          return NextResponse.json(
            { error: `Stripe error: ${stripeError.message}` },
            { status: 400 }
          )
      }
    }

    // Generic error fallback
    return NextResponse.json(
      { error: "Failed to create Stripe refund" },
      { status: 500 }
    )
  }
}
