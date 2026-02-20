import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Validazione email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validazione telefono - solo formato base (prefisso + opzionale, cifre e separatori)
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)\.]{6,20}$/
  return phoneRegex.test(phone)
}

async function generateOrderNumber(): Promise<string> {
  const lastOrder = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  })

  let nextNumber = 1
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.orderNumber, 10)
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1
    }
  }

  return nextNumber.toString().padStart(4, "0")
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, phone, items, total, type } = body

    // Validazione campi obbligatori
    if (!email?.trim()) {
      return NextResponse.json(
        { error: "L'email è obbligatoria" },
        { status: 400 }
      )
    }

    if (!phone?.trim()) {
      return NextResponse.json(
        { error: "Il numero di telefono è obbligatorio" },
        { status: 400 }
      )
    }

    // Validazione formato email
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "L'email non è valida" },
        { status: 400 }
      )
    }

    // Validazione formato telefono
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Il numero di telefono non è valido" },
        { status: 400 }
      )
    }

    // Separa prodotti e gift card
    const productItems = items.filter((item: { type: string }) => item.type === "product")
    const giftCardItems = items.filter((item: { type: string }) => item.type === "gift-card")

    // Usa una transazione per garantire atomicità
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verifica disponibilità per i prodotti
      for (const item of productItems) {
        const product = await tx.product.findUnique({
          where: { id: item.id },
          include: { variants: true },
        })

        if (!product) {
          throw { code: 'PRODUCT_NOT_FOUND', productId: item.id }
        }

        if (product.hasSizes && item.size) {
          // Prodotto con taglie - verifica disponibilità specifica
          const variant = product.variants.find((v: { size: string }) => v.size === item.size)
          if (!variant || variant.quantity < item.quantity) {
            throw { code: 'PRODUCT_UNAVAILABLE', productName: product.name }
          }
        } else {
          // Prodotto senza taglie - verifica disponibilità generale
          const totalQuantity = product.variants.reduce((sum: number, v: { quantity: number }) => sum + v.quantity, 0)
          if (totalQuantity < item.quantity) {
            throw { code: 'PRODUCT_UNAVAILABLE', productName: product.name }
          }
        }
      }

      // 2. Decrementa disponibilità
      for (const item of productItems) {
        const product = await tx.product.findUnique({
          where: { id: item.id },
          include: { variants: true },
        })

        if (product?.hasSizes && item.size) {
          // Decrementa la taglia specifica
          const variant = product.variants.find((v: { size: string }) => v.size === item.size)
          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { quantity: { decrement: item.quantity } },
            })
          }
        } else if (product && !product.hasSizes) {
          // Prodotto senza taglie - decrementa la prima variante (o crea logica appropriata)
          const variant = product.variants[0]
          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { quantity: { decrement: item.quantity } },
            })
          }
        }
      }

      // 3. Determina stato ordine
      const initialStatus = productItems.length === 0 && giftCardItems.length > 0 ? "DELIVERED" : "PENDING"

      // 4. Crea l'ordine
      const order = await tx.order.create({
        data: {
          orderNumber: await generateOrderNumber(),
          type,
          status: initialStatus,
          email,
          phone,
          total,
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
        include: {
          items: true,
        },
      })

      // 5. Crea gift card (usa item.price come valore iniziale)
      for (const item of giftCardItems) {
        await tx.giftCard.create({
          data: {
            code: `GC${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            initialValue: item.price,
            remainingValue: item.price,
            orderId: order.id,
          },
        })
      }

      return order
    })

    return NextResponse.json({
      success: true,
      order: {
        id: result.id,
        orderNumber: result.orderNumber,
        status: result.status,
      },
    })
  } catch (error: unknown) {
    console.error("Error creating order:", error)
    
    // Gestione errori strutturati (disponibilità prodotto)
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const typedError = error as { code: string; productName?: string; productId?: string }
      
      if (typedError.code === 'PRODUCT_UNAVAILABLE') {
        return NextResponse.json(
          { 
            error: 'PRODUCT_UNAVAILABLE',
            productName: typedError.productName 
          },
          { status: 400 }
        )
      }
      
      if (typedError.code === 'PRODUCT_NOT_FOUND') {
        return NextResponse.json(
          { error: 'Prodotto non trovato' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Errore durante la creazione dell'ordine" },
      { status: 500 }
    )
  }
}
