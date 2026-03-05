import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/orders";
import { generateUniqueGiftCardCode } from "@/lib/gift-card";
import { centsToEuro } from "@/lib/utils/currency";
import { withRateLimit, rateLimitConfigs } from "@/lib/rate-limit-middleware";
import { checkAdmin } from "@/lib/api-auth";

export const dynamic = 'force-dynamic'

// POST /api/admin/pos/gift-cards
// Crea una gift card manualmente (POS/Contanti)
export async function POST(req: NextRequest) {
  const authCheck = await checkAdmin();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  // Rate limiting: max 100 richieste al minuto per admin
  const rateLimitResponse = withRateLimit(req, rateLimitConfigs.adminApi)
  if (rateLimitResponse) {
    console.warn(`[RATE LIMIT] Bloccata creazione POS gift card`)
    return rateLimitResponse
  }

  try {
    const body = await req.json();
    const { email, phone, paymentMethod, giftCardValue } = body;

    // Validazione
    if (!email || !phone || !paymentMethod || !giftCardValue) {
      return NextResponse.json(
        {
          error:
            "Email, telefono, metodo di pagamento e taglio gift card sono obbligatori",
        },
        { status: 400 }
      );
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json({ error: "Email non valida" }, { status: 400 });
    }

    // Validazione telefono (stessa del carrello)
    if (!phone.match(/^\+[\d\s\-\(\)\.]{6,20}$/)) {
      return NextResponse.json(
        { error: "Numero di telefono non valido. Deve iniziare con +" },
        { status: 400 }
      );
    }

    if (!["CASH", "POS"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Metodo di pagamento non valido. Usa CASH o POS" },
        { status: 400 }
      );
    }

    // Validazione valore gift card (deve essere un numero positivo)
    const valueInCents = Math.round(giftCardValue * 100);
    if (valueInCents <= 0) {
      return NextResponse.json(
        { error: "Valore gift card non valido" },
        { status: 400 }
      );
    }

    // Recupera la configurazione della scadenza
    const expiryConfig = await prisma.giftCardExpiryConfig.findUnique({
      where: { id: "gift-card-expiry" },
    });

    // Calcola la data di scadenza
    const now = new Date();
    const expiryTime = expiryConfig?.expiryTime || "ONE_YEAR";
    const expiryType = expiryConfig?.expiryType || "END_OF_MONTH";

    let expiresAt = new Date(now);
    if (expiryTime === "SIX_MONTHS") {
      expiresAt.setMonth(expiresAt.getMonth() + 6);
    } else if (expiryTime === "ONE_YEAR") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else if (expiryTime === "TWO_YEARS") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 2);
    }

    // Se END_OF_MONTH, vai all'ultimo giorno del mese
    if (expiryType === "END_OF_MONTH") {
      expiresAt = new Date(
        expiresAt.getFullYear(),
        expiresAt.getMonth() + 1,
        0,
        23,
        59,
        59
      );
    } else {
      // EXACT_DATE - stesso giorno, alla fine della giornata
      expiresAt.setHours(23, 59, 59, 999);
    }

    // Genera numero ordine e codice gift card
    const orderNumber = await generateOrderNumber();

    // Genera codice gift card unico (sicuro e ottimizzato per QR)
    const giftCardCode = await generateUniqueGiftCardCode(prisma);

    // Crea ordine e gift card in una transazione
    const result = await prisma.$transaction(async (tx) => {
      // Crea l'ordine
      const order = await tx.order.create({
        data: {
          orderNumber,
          status: "DELIVERED", // Già consegnato perché pagato in sede
          type: "GIFT_CARD",
          email: email,
          phone: phone,
          total: valueInCents,
          orderSource: "MANUAL",
          paidAt: new Date(), // Pagamento immediato (POS/Contanti)
          // Note interne per identificare il pagamento
          customerName: `Pagamento: ${paymentMethod === "CASH" ? "Contanti" : "POS"}`,
        },
      });

      // Crea la gift card
      const giftCard = await tx.giftCard.create({
        data: {
          code: giftCardCode,
          initialValue: valueInCents,
          remainingValue: valueInCents,
          orderId: order.id,
          isActive: true, // Attiva immediatamente (già pagata)
          expiresAt,
        },
      });

      return { order, giftCard };
    });

    // Importa email service
    const { sendOrderConfirmation } = await import("@/lib/email");

    // Invia email con la gift card (obbligatorio)
    // Il PDF viene generato automaticamente da sendOrderConfirmation
    let emailSent = false;
    try {
      await sendOrderConfirmation({
        orderNumber: result.order.orderNumber,
        email: email,
        phone: phone,
        items: [],
        giftCards: [
          {
            code: result.giftCard.code,
            initialValue: result.giftCard.initialValue,
            expiresAt: result.giftCard.expiresAt,
          },
        ],
        total: result.order.total,
        createdAt: result.order.createdAt,
        lang: "it",
      });
      emailSent = true;
      
      // Aggiorna il flag emailSent nel database
      await prisma.order.update({
        where: { id: result.order.id },
        data: { emailSent: true },
      });
      console.log(`✅ [POS] emailSent flag aggiornato per order ${result.order.id}`);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      // Non blocchiamo la risposta se l'email fallisce, ma logghiamo l'errore
    }

    return NextResponse.json({
      success: true,
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        total: centsToEuro(result.order.total), // Convert cents to euro
        status: result.order.status,
        orderSource: result.order.orderSource,
      },
      giftCard: {
        id: result.giftCard.id,
        code: result.giftCard.code,
        value: centsToEuro(result.giftCard.initialValue), // Convert cents to euro
        expiresAt: result.giftCard.expiresAt,
      },
      emailSent,
      message: "Gift Card creata con successo",
    });
  } catch (error) {
    console.error("Error creating POS gift card:", error);
    return NextResponse.json(
      { error: "Errore durante la creazione della Gift Card" },
      { status: 500 }
    );
  }
}


