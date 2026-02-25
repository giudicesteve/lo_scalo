import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { calculateGiftCardExpiry } from "@/lib/gift-card-expiry"

// Helper per logging (solo console)
function logToFile(message: string) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${message}`)
}

// Validazione email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validazione telefono
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)\.]{6,20}$/
  return phoneRegex.test(phone)
}

async function generateOrderNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  
  // Trova l'ultimo ordine dell'anno corrente
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: currentYear.toString(),
      },
    },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  })

  let nextNumber = 1
  if (lastOrder) {
    // Estrai il numero dopo il trattino (es: "2025-0023" → "0023" → 23)
    const parts = lastOrder.orderNumber.split("-")
    if (parts.length === 2) {
      const lastNumber = parseInt(parts[1], 10)
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1
      }
    }
  }

  return `${currentYear}-${nextNumber.toString().padStart(4, "0")}`
}

export async function POST(req: Request) {
  logToFile("=".repeat(50))
  logToFile("🛒 NUOVO ORDINE RICEVUTO")
  
  try {
    const body = await req.json()
    logToFile(`Body ricevuto: ${JSON.stringify(body)}`)
    
    const { email, phone, items, total, type, language } = body
    const lang = language  // Il frontend invia 'language', noi usiamo 'lang'
    
    logToFile(`🌐 [ORDERS] Dati: email=${email}, phone=${phone}, items=${items?.length}, total=${total}, type=${type}, lang=${lang || 'NON SPECIFICATA (default: it)'}`)

    // Validazione campi obbligatori
    if (!email?.trim()) {
      logToFile("❌ Errore: Email mancante")
      return NextResponse.json({ error: "L'email è obbligatoria" }, { status: 400 })
    }

    if (!phone?.trim()) {
      logToFile("❌ Errore: Telefono mancante")
      return NextResponse.json({ error: "Il numero di telefono è obbligatorio" }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      logToFile("❌ Errore: Email non valida")
      return NextResponse.json({ error: "L'email non è valida" }, { status: 400 })
    }

    if (!isValidPhone(phone)) {
      logToFile("❌ Errore: Telefono non valido")
      return NextResponse.json({ error: "Il numero di telefono non è valido" }, { status: 400 })
    }

    // Separa prodotti e gift card
    const productItems = items.filter((item: { type: string }) => item.type === "product")
    const giftCardItems = items.filter((item: { type: string }) => item.type === "gift-card")
    logToFile(`Prodotti: ${productItems.length}, Gift Card: ${giftCardItems.length}`)

    // Genera numero ordine FUORI dalla transazione
    logToFile("📝 Generando numero ordine...")
    const orderNumber = await generateOrderNumber()
    logToFile(`✅ Numero ordine: ${orderNumber}`)

    // Verifica disponibilità FUORI dalla transazione per raccogliere tutti gli errori
    logToFile("🔍 Verifica disponibilità prodotti...")
    const unavailableItems: Array<{
      name: string
      requested: number
      available: number
      size?: string
    }> = []
    
    for (const item of productItems) {
      logToFile(`    Prodotto ${item.id} - qty: ${item.quantity}`)
      const product = await prisma.product.findUnique({
        where: { id: item.id },
        include: { variants: true },
      })

      if (!product) {
        logToFile(`    ❌ Prodotto ${item.id} non trovato`)
        unavailableItems.push({
          name: item.name,
          requested: item.quantity,
          available: 0,
          size: item.size,
        })
        continue
      }

      if (product.hasSizes && item.size) {
        const variant = product.variants.find((v: { size: string }) => v.size === item.size)
        const available = variant?.quantity || 0
        logToFile(`    Taglia ${item.size} - disponibile: ${available}`)
        if (!variant || available < item.quantity) {
          unavailableItems.push({
            name: product.name,
            requested: item.quantity,
            available,
            size: item.size,
          })
        }
      } else {
        const available = product.variants.reduce((sum: number, v: { quantity: number }) => sum + v.quantity, 0)
        logToFile(`    Senza taglie - disponibile: ${available}`)
        if (available < item.quantity) {
          unavailableItems.push({
            name: product.name,
            requested: item.quantity,
            available,
          })
        }
      }
    }

    // Se ci sono prodotti non disponibili, restituisci errore con lista completa
    if (unavailableItems.length > 0) {
      logToFile(`❌ Prodotti non disponibili: ${unavailableItems.length}`)
      return NextResponse.json({
        error: 'PRODUCTS_UNAVAILABLE',
        items: unavailableItems,
      }, { status: 400 })
    }

    // Usa una transazione per garantire atomicità
    logToFile("💾 Inizio transazione...")
    const result = await prisma.$transaction(async (tx) => {

      logToFile("  ⬇️ Decremento disponibilità...")
      // 2. Decrementa disponibilità (riserva prodotti)
      for (const item of productItems) {
        const product = await tx.product.findUnique({
          where: { id: item.id },
          include: { variants: true },
        })

        if (product?.hasSizes && item.size) {
          const variant = product.variants.find((v: { size: string }) => v.size === item.size)
          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { quantity: { decrement: item.quantity } },
            })
            logToFile(`    Decrementato variant ${variant.id} di ${item.quantity}`)
          }
        } else if (product && !product.hasSizes) {
          const variant = product.variants[0]
          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { quantity: { decrement: item.quantity } },
            })
            logToFile(`    Decrementato variant ${variant.id} di ${item.quantity}`)
          }
        }
      }

      logToFile("  📝 Creazione ordine...")
      // 3. Crea l'ordine
      const order = await tx.order.create({
        data: {
          orderNumber: orderNumber,
          type,
          status: "PENDING_PAYMENT",
          email,
          phone,
          total,
          lang: lang || "it",  // Default a italiano se non specificato
          items: {
            create: productItems.map((item: { id: string; price: number; quantity: number; size?: string }) => ({
              quantity: item.quantity,
              unitPrice: item.price,
              totalPrice: item.price * item.quantity,
              size: item.size,
              productId: item.id,
            })),
          },
        },
        include: { items: true },
      })
      logToFile(`  ✅ Ordine creato: ${order.id}`)

      logToFile("  🎁 Creazione gift card...")
      // 4. Crea gift card (in stato pending)
      // NOTA: Se quantity > 1, creiamo N gift card separate
      
      // Get or create the global gift card expiry settings
      let expiryConfig
      try {
        expiryConfig = await tx.giftCardExpiryConfig.upsert({
          where: { id: "gift-card-expiry" },
          update: {},
          create: {
            id: "gift-card-expiry",
            expiryType: "END_OF_MONTH",
            expiryTime: "ONE_YEAR",
          },
        })
      } catch (e) {
        logToFile(`  ❌ Error with expiry config: ${JSON.stringify(e)}`)
        // Fallback to defaults if table doesn't exist
      }
      
      const expiryType = expiryConfig?.expiryType || "END_OF_MONTH"
      const expiryTime = expiryConfig?.expiryTime || "ONE_YEAR"
      logToFile(`  📅 Expiry settings: ${expiryType}, ${expiryTime}`)
      
      // Calculate expiry date based on settings
      const purchaseDate = new Date()
      const expiresAt = calculateGiftCardExpiry(expiryType, expiryTime, purchaseDate)
      
      let giftCardsCreated = 0
      for (const item of giftCardItems) {
        const qty = item.quantity || 1
        for (let i = 0; i < qty; i++) {
          await tx.giftCard.create({
            data: {
              code: `GC${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
              initialValue: item.price,
              remainingValue: item.price,
              orderId: order.id,
              isActive: false,
              expiresAt: expiresAt,
            },
          })
          giftCardsCreated++
        }
      }
      logToFile(`  ✅ Gift card create: ${giftCardsCreated} (scadenza: ${expiresAt.toISOString()})`)

      return order
    })
    logToFile("✅ Transazione completata!")

    logToFile("💳 Creazione sessione Stripe...")
    // 5. Crea sessione Stripe Checkout con scadenza 15 minuti
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name,
          description: item.type === "gift-card" ? "Gift Card Lo Scalo" : undefined,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }))

    // Scadenza: 30 minuti da ora (minimo richiesto da Stripe)
    const expiresAt = Math.floor(Date.now() / 1000) + (30 * 60)
    logToFile(`   Scadenza sessione: ${new Date(expiresAt * 1000).toISOString()}`)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      expires_at: expiresAt,
      success_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/cart/success?order=${result.orderNumber}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/cart/canceled?order=${result.orderNumber}&session={CHECKOUT_SESSION_ID}`,
      customer_email: email,
      metadata: {
        orderId: result.id,
        orderNumber: result.orderNumber,
        phone: phone || "",
      },
    })
    logToFile(`✅ Sessione Stripe creata: ${session.id}`)

    logToFile("🎉 ORDINE COMPLETATO!")
    return NextResponse.json({
      success: true,
      order: {
        id: result.id,
        orderNumber: result.orderNumber,
        status: result.status,
      },
      stripeUrl: session.url,
    })
  } catch (error: unknown) {
    logToFile(`❌ ERRORE: ${JSON.stringify(error)}`)
    console.error("Error creating order:", error)
    
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const typedError = error as { code: string; productName?: string; productId?: string }
      
      if (typedError.code === 'PRODUCT_UNAVAILABLE') {
        return NextResponse.json(
          { error: 'PRODUCT_UNAVAILABLE', productName: typedError.productName },
          { status: 400 }
        )
      }
      
      if (typedError.code === 'PRODUCT_NOT_FOUND') {
        return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 400 })
      }
    }
    
    return NextResponse.json(
      { error: "Errore durante la creazione dell'ordine" },
      { status: 500 }
    )
  }
}
