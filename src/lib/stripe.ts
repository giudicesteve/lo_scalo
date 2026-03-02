import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-02-25.clover', // Versione richiesta da Stripe SDK
})

/**
 * Creates a refund on Stripe for a given payment intent
 * @param paymentIntentId - The Stripe Payment Intent ID (e.g., 'pi_1234567890')
 * @param amount - The amount to refund in cents (e.g., 5000 for €50.00)
 * @returns The Stripe Refund object
 * @throws Error if the refund creation fails
 */
export async function createStripeRefund(
  paymentIntentId: string,
  amount: number
): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount,
    })

    return refund
  } catch (error) {
    // Handle Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      throw new Error(`Stripe refund failed: ${error.message} (code: ${error.code || 'unknown'})`)
    }

    // Handle generic errors
    throw new Error(`Failed to create Stripe refund: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
