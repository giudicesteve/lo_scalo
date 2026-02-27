import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateOrderNumber } from "@/lib/orders"

// POST /api/admin/pos/gift-cards
// Crea una gift card manualmente (POS/Contanti)
// Nota: L'autenticazione è gestita dal middleware in middleware.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, phone, paymentMethod, giftCardTemplateId } = body

    // Validazione
    if (!email || !phone || !paymentMethod || !giftCardTemplateId) {
      return NextResponse.json(
        { error: "Email, telefono, metodo di pagamento e taglio gift card sono obbligatori" },
        { status: 400 }
      )
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: "Email non valida" },
        { status: 400 }
      )
    }

    if (!["CASH", "POS"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Metodo di pagamento non valido. Usa CASH o POS" },
        { status: 400 }
      )
    }

    // Recupera il template della gift card
    const template = await prisma.giftCardTemplate.findUnique({
      where: { id: giftCardTemplateId, isActive: true },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Taglio gift card non trovato o non attivo" },
        { status: 404 }
      )
    }

    // Recupera la configurazione della scadenza
    const expiryConfig = await prisma.giftCardExpiryConfig.findUnique({
      where: { id: "gift-card-expiry" },
    })

    // Calcola la data di scadenza
    const now = new Date()
    const expiryTime = expiryConfig?.expiryTime || "ONE_YEAR"
    const expiryType = expiryConfig?.expiryType || "END_OF_MONTH"
    
    let expiresAt = new Date(now)
    if (expiryTime === "SIX_MONTHS") {
      expiresAt.setMonth(expiresAt.getMonth() + 6)
    } else if (expiryTime === "ONE_YEAR") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else if (expiryTime === "TWO_YEARS") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 2)
    }

    // Se END_OF_MONTH, vai all'ultimo giorno del mese
    if (expiryType === "END_OF_MONTH") {
      expiresAt = new Date(expiresAt.getFullYear(), expiresAt.getMonth() + 1, 0, 23, 59, 59)
    } else {
      // EXACT_DATE - stesso giorno, alla fine della giornata
      expiresAt.setHours(23, 59, 59, 999)
    }

    // Genera numero ordine e codice gift card
    const orderNumber = await generateOrderNumber()
    
    // Genera codice gift card unico (stesso formato degli ordini online)
    const generateGiftCardCode = (): string => {
      return `GC${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    }
    
    let giftCardCode = generateGiftCardCode()
    // Verifica unicita
    let existingGiftCard = await prisma.giftCard.findUnique({
      where: { code: giftCardCode },
    })
    while (existingGiftCard) {
      giftCardCode = generateGiftCardCode()
      existingGiftCard = await prisma.giftCard.findUnique({
        where: { code: giftCardCode },
      })
    }

    // Crea ordine e gift card in una transazione
    const result = await prisma.$transaction(async (tx) => {
      // Crea l'ordine
      const order = await tx.order.create({
        data: {
          orderNumber,
          type: "GIFT_CARD",
          status: "DELIVERED", // Già consegnato perché pagato in sede
          email,
          phone,
          total: template.price,
          lang: "it",
          orderSource: "MANUAL",
          paidAt: now,
          stripePaymentId: null,
          stripePaymentIntentId: null,
          // Note interne per identificare il pagamento
          // Usiamo customerName per memorizzare il metodo di pagamento
          customerName: `Pagamento: ${paymentMethod === "CASH" ? "Contanti" : "POS"}`,
        },
      })

      // Crea la gift card
      const giftCard = await tx.giftCard.create({
        data: {
          code: giftCardCode,
          initialValue: template.value,
          remainingValue: template.value,
          orderId: order.id,
          isActive: true, // Attiva immediatamente (già pagata)
          expiresAt,
        },
      })

      return { order, giftCard }
    })

    // Importa email service
    const { sendOrderConfirmation } = await import("@/lib/email")

    // Invia email con la gift card (obbligatorio)
    // Il PDF viene generato automaticamente da sendOrderConfirmation
    let emailSent = false
    try {
      await sendOrderConfirmation({
        orderNumber: result.order.orderNumber,
        email: email,
        phone: phone,
        items: [],
        giftCards: [{
          code: result.giftCard.code,
          initialValue: result.giftCard.initialValue,
          expiresAt: result.giftCard.expiresAt,
        }],
        total: result.order.total,
        createdAt: result.order.createdAt,
        lang: "it",
      })

      // Aggiorna flag emailSent
      await prisma.order.update({
        where: { id: result.order.id },
        data: { emailSent: true },
      })
      emailSent = true
    } catch (emailError) {
      console.error("Error sending email:", emailError)
      // Non blocchiamo la risposta se l'email fallisce, ma logghiamo l'errore
    }

    return NextResponse.json({
      success: true,
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        total: result.order.total,
        status: result.order.status,
        orderSource: result.order.orderSource,
      },
      giftCard: {
        id: result.giftCard.id,
        code: result.giftCard.code,
        value: result.giftCard.initialValue,
        expiresAt: result.giftCard.expiresAt,
      },
      emailSent,
      message: "Gift Card creata con successo",
    })

  } catch (error) {
    console.error("Error creating POS gift card:", error)
    return NextResponse.json(
      { error: "Errore durante la creazione della Gift Card" },
      { status: 500 }
    )
  }
}

// GET /api/admin/pos/gift-cards/templates
// Recupera i template disponibili per le gift card
// Nota: L'autenticazione è gestita dal middleware in middleware.ts
export async function GET() {
  try {
    const templates = await prisma.giftCardTemplate.findMany({
      where: { isActive: true },
      orderBy: { value: "asc" },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching gift card templates:", error)
    return NextResponse.json(
      { error: "Errore durante il recupero dei template" },
      { status: 500 }
    )
  }
}
