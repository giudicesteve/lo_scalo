import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { calculateGiftCardExpiry } from "@/lib/gift-card-expiry";
import { generateUniqueGiftCardCode } from "@/lib/gift-card";

// Helper per logging (solo console)
function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Validazione email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validazione telefono
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+[\d\s\-\(\)\.]{6,20}$/;
  return phoneRegex.test(phone);
}

// Caratteri validi per il codice random (esclusi 0,1,I,O per evitare confusione)
const RANDOM_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

// Genera 4 caratteri random
function generateRandomSuffix(): string {
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += RANDOM_CHARS.charAt(
      Math.floor(Math.random() * RANDOM_CHARS.length)
    );
  }
  return result;
}

async function generateOrderNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();

  // Trova l'ultimo ordine dell'anno corrente
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: currentYear.toString(),
      },
    },
    orderBy: { createdAt: "desc" },
    select: { orderNumber: true },
  });

  let nextNumber = 1;
  if (lastOrder) {
    // Estrai il numero progressivo (secondo elemento)
    // Formato: YYYY-NNNN-XXXX o YYYY-NNNNN-XXXX
    const parts = lastOrder.orderNumber.split("-");
    if (parts.length >= 2) {
      const lastNumber = parseInt(parts[1], 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }

  // Formato: YYYY-NNNN-XXXX (dove NNNN può crescere oltre 4 cifre)
  const progressive = nextNumber.toString().padStart(4, "0");
  const randomSuffix = generateRandomSuffix();

  return `${currentYear}-${progressive}-${randomSuffix}`;
}

export async function POST(req: Request) {
  logToFile("=".repeat(50));
  logToFile("🛒 NUOVO ORDINE RICEVUTO");

  try {
    const body = await req.json();
    logToFile(`Body ricevuto: ${JSON.stringify(body)}`);

    const { email, phone, items, total, type: orderType, lang, language } = body;
    const orderLang = lang || language || "it";
    
    logToFile(`🌐 [ORDERS] Lingua ordine: ${orderLang}`);

    logToFile(
      `🌐 [ORDERS] Dati: email=${email}, phone=${phone}, items=${items?.length}, total=${total}`
    );

    // Validazione campi obbligatori
    if (!email?.trim()) {
      logToFile("❌ Errore: Email mancante");
      return NextResponse.json(
        { error: "L'email è obbligatoria" },
        { status: 400 }
      );
    }

    if (!phone?.trim()) {
      logToFile("❌ Errore: Telefono mancante");
      return NextResponse.json(
        { error: "Il numero di telefono è obbligatorio" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      logToFile("❌ Errore: Email non valida");
      return NextResponse.json(
        { error: "L'email non è valida" },
        { status: 400 }
      );
    }

    if (!isValidPhone(phone)) {
      logToFile("❌ Errore: Telefono non valido");
      return NextResponse.json(
        { error: "Il numero di telefono non è valido" },
        { status: 400 }
      );
    }

    // Separa prodotti e gift card
    const productItems = items.filter(
      (item: { type: string }) => item.type === "product"
    );
    const giftCardItems = items.filter(
      (item: { type: string }) => item.type === "gift-card"
    );
    logToFile(`Prodotti: ${productItems.length}, Gift Card: ${giftCardItems.length}`);

    // Genera numero ordine FUORI dalla transazione
    logToFile("📝 Generando numero ordine...");
    const orderNumber = await generateOrderNumber();
    logToFile(`✅ Numero ordine: ${orderNumber}`);

    // Verifica disponibilità FUORI dalla transazione per raccogliere tutti gli errori
    logToFile("🔍 Verifica disponibilità prodotti...");
    const unavailableItems: Array<{
      name: string;
      requested: number;
      available: number;
      size?: string;
    }> = [];

    for (const item of productItems) {
      logToFile(`    Prodotto ${item.id} - qty: ${item.quantity}`);
      const product = await prisma.product.findFirst({
        where: { 
          id: item.id,
          isDeleted: false, // Escludi prodotti eliminati
        },
        include: { ProductVariant: true },
      });

      if (!product) {
        logToFile(`    ❌ Prodotto ${item.id} non trovato`);
        unavailableItems.push({
          name: item.name,
          requested: item.quantity,
          available: 0,
          size: item.size,
        });
        continue;
      }

      if (product.hasSizes && item.size) {
        const variant = product.ProductVariant.find(
          (v: { size: string }) => v.size === item.size
        );
        const available = variant?.quantity || 0;
        logToFile(`    Taglia ${item.size} - disponibile: ${available}`);
        if (!variant || available < item.quantity) {
          unavailableItems.push({
            name: product.name,
            requested: item.quantity,
            available,
            size: item.size,
          });
        }
      } else {
        // For products without sizes, check the first variant with "Unica" size
        const variant = product.ProductVariant.find(
          (v: { size: string }) => v.size === "Unica"
        );
        const available = variant?.quantity || 0;
        logToFile(`    Senza taglie - disponibile: ${available}`);
        if (available < item.quantity) {
          unavailableItems.push({
            name: product.name,
            requested: item.quantity,
            available,
          });
        }
      }
    }

    // Se ci sono prodotti non disponibili, restituisci errore con lista completa
    if (unavailableItems.length > 0) {
      logToFile(`❌ Prodotti non disponibili: ${unavailableItems.length}`);
      return NextResponse.json(
        {
          error: "PRODUCTS_UNAVAILABLE",
          items: unavailableItems,
        },
        { status: 400 }
      );
    }

    // Usa una transazione per garantire atomicità
    logToFile("💾 Inizio transazione...");
    let deductedCount = 0;
    const result = await prisma.$transaction(async (tx) => {
      logToFile(`  ⬇️ Decremento disponibilità per ${productItems.length} prodotti...`);
      // 2. Decrementa disponibilità (riserva prodotti)
      for (const item of productItems) {
        const product = await tx.product.findUnique({
          where: { id: item.id },
          include: { ProductVariant: true },
        });

        if (product?.hasSizes && item.size) {
          const variant = product.ProductVariant.find(
            (v: { size: string }) => v.size === item.size
          );
          if (variant) {
            // Use raw query or find the variant and update quantity
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { quantity: { decrement: item.quantity } },
            });
            logToFile(`    ⬇️ Decrementato ${item.quantity} x ${product.name} (${item.size}) - variant: ${variant.id}`);
            deductedCount++;
          }
        } else if (product) {
          // For products without sizes, find the "Unica" variant
          const variant = product.ProductVariant.find(
            (v: { size: string }) => v.size === "Unica"
          );
          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { quantity: { decrement: item.quantity } },
            });
            logToFile(`    ⬇️ Decrementato ${item.quantity} x ${product.name} (Unica) - variant: ${variant.id}`);
            deductedCount++;
          }
        }
      }
      logToFile(`  ✅ Stock riservato per ${deductedCount} varianti`);

      logToFile("  📝 Creazione ordine...");
      // 3. Crea l'ordine
      const order = await tx.order.create({
        data: {
          orderNumber: orderNumber,
          status: "PENDING_PAYMENT",
          type: orderType || "MIXED",
          email: email,
          phone: phone,
          total,
          lang: orderLang,
        },
      });
      logToFile(`  ✅ Ordine creato: ${order.id}`);

      // Create order items for products
      for (const item of productItems) {
        const product = await tx.product.findUnique({
          where: { id: item.id },
          include: { ProductVariant: true },
        });

        let variantId: string | undefined;
        if (product?.hasSizes && item.size) {
          const variant = product.ProductVariant.find(
            (v: { size: string }) => v.size === item.size
          );
          variantId = variant?.id;
        } else if (product) {
          const variant = product.ProductVariant.find(
            (v: { size: string }) => v.size === "Unica"
          );
          variantId = variant?.id;
        }

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.id,
            variantId: variantId,
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
            size: item.size || "Unica",
            productName: product?.name || "Prodotto",
            productNameEn: product?.nameEn || product?.name || "Prodotto",
          },
        });
      }

      // Create order items for gift cards
      for (const item of giftCardItems) {
        // For gift cards, we don't create OrderItem since there's no product
        // The gift card is linked directly to the order
        logToFile(`    Gift card item (no OrderItem created): ${item.price}€ x ${item.quantity}`);
      }

      logToFile("  🎁 Creazione gift card...");
      // 4. Crea gift card (in stato pending)
      // NOTA: Se quantity > 1, creiamo N gift card separate

      // Get or create the global gift card expiry settings
      let expiryConfig;
      try {
        expiryConfig = await tx.giftCardExpiryConfig.upsert({
          where: { id: "gift-card-expiry" },
          update: {},
          create: {
            id: "gift-card-expiry",
            expiryType: "END_OF_MONTH",
            expiryTime: "ONE_YEAR",
          },
        });
      } catch (e) {
        logToFile(`  ❌ Error with expiry config: ${JSON.stringify(e)}`);
        // Fallback to defaults if table doesn't exist
      }

      const expiryType = expiryConfig?.expiryType || "END_OF_MONTH";
      const expiryTime = expiryConfig?.expiryTime || "ONE_YEAR";
      logToFile(`  📅 Expiry settings: ${expiryType}, ${expiryTime}`);

      // Calculate expiry date based on settings
      const purchaseDate = new Date();
      const expiresAt = calculateGiftCardExpiry(expiryType, expiryTime, purchaseDate);

      let giftCardsCreated = 0;
      for (const item of giftCardItems) {
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          // Genera codice unico sicuro (ottimizzato per QR)
          const giftCardCode = await generateUniqueGiftCardCode(tx);
          
          await tx.giftCard.create({
            data: {
              code: giftCardCode,
              initialValue: item.price,
              remainingValue: item.price,
              orderId: order.id,
              isActive: false,
              expiresAt: expiresAt,
            },
          });
          giftCardsCreated++;
        }
      }
      logToFile(
        `  ✅ Gift card create: ${giftCardsCreated} (scadenza: ${expiresAt.toISOString()})`
      );

      return order;
    });
    logToFile("✅ Transazione completata!");

    logToFile("💳 Creazione sessione Stripe...");
    // 5. Crea sessione Stripe Checkout con scadenza 15 minuti
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.name,
          description:
            item.type === "gift-card" ? "Gift Card Lo Scalo" : undefined,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Ensure base URL has proper scheme
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
    const appUrl = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${appUrl}/cart/success?order=${result.orderNumber}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cart/canceled?order=${result.orderNumber}&session={CHECKOUT_SESSION_ID}`,
      customer_email: email,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minuti
      metadata: {
        orderId: result.id,
        orderNumber: result.orderNumber,
      },
    });

    logToFile(`✅ Sessione Stripe creata: ${session.id}`);

    // Aggiorna l'ordine con la sessione Stripe
    // Note: The introspected schema doesn't have stripeSessionId, using stripePaymentId instead
    await prisma.order.update({
      where: { id: result.id },
      data: { stripePaymentId: session.id },
    });

    logToFile("=".repeat(50));

    return NextResponse.json({
      success: true,
      order: {
        id: result.id,
        orderNumber: result.orderNumber,
      },
      stripeUrl: session.url,
    });
  } catch (error) {
    logToFile(`❌ ERRORE: ${JSON.stringify(error)}`);
    console.error("Errore creazione ordine:", error);
    return NextResponse.json(
      { error: "Errore durante la creazione dell'ordine" },
      { status: 500 }
    );
  }
}
