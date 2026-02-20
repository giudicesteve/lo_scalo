import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  try {
    const { items, email, phone, orderId } = await req.json()

    // Crea line items per Stripe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name,
          description: item.type === "gift-card" ? "Gift Card Lo Scalo" : undefined,
        },
        unit_amount: Math.round(item.price * 100), // Stripe usa centesimi
      },
      quantity: item.quantity,
    }))

    // Crea sessione checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/cart?success=true&order=${orderId}`,
      cancel_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/cart?canceled=true`,
      customer_email: email,
      metadata: {
        orderId: orderId,
        phone: phone || "",
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json(
      { error: "Errore durante la creazione del pagamento" },
      { status: 500 }
    )
  }
}
