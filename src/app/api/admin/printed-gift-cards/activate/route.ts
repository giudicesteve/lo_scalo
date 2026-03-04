import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { withRateLimit, rateLimitConfigs } from "@/lib/rate-limit-middleware";
import { generateOrderNumber } from "@/lib/orders";

/**
 * POST /api/admin/printed-gift-cards/activate
 * Attiva un codice PG creando ordine + Gift Card
 */
export async function POST(request: NextRequest) {
  // Rate limiting: max 100 richieste al minuto per admin
  const rateLimitResponse = withRateLimit(request, rateLimitConfigs.adminApi)
  if (rateLimitResponse) {
    console.warn(`[RATE LIMIT] Bloccata attivazione GC cartacea`)
    return rateLimitResponse
  }

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.admin.findUnique({
      where: { email: session.user.email },
    });

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { code, email, phone, expiresAt, paymentMethod } = body;

    // Validazione
    if (!code || !email || !phone || !paymentMethod) {
      return NextResponse.json(
        { error: "Codice PG, email, telefono e metodo di pagamento sono obbligatori" },
        { status: 400 }
      );
    }

    // Validazione email
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

    // Verifica che il codice PG esista e non sia usato
    const printedCard = await prisma.printedGiftCard.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!printedCard) {
      return NextResponse.json(
        { error: "Codice PG non trovato" },
        { status: 404 }
      );
    }

    if (printedCard.used) {
      return NextResponse.json(
        { error: "Codice PG già utilizzato" },
        { status: 400 }
      );
    }

    // Crea ordine e Gift Card in transazione
    const result = await prisma.$transaction(async (tx) => {
      // 1. Genera numero ordine
      const currentYear = new Date().getFullYear();
      const lastOrder = await tx.order.findFirst({
        where: { orderNumber: { startsWith: currentYear.toString() } },
        orderBy: { createdAt: "desc" },
        select: { orderNumber: true },
      });

      let nextNumber = 1;
      if (lastOrder) {
        const parts = lastOrder.orderNumber.split("-");
        if (parts.length >= 2) {
          const lastNumber = parseInt(parts[1], 10);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }

      const progressive = nextNumber.toString().padStart(4, "0");
      const randomSuffix = Array(4)
        .fill(0)
        .map(() => "23456789ABCDEFGHJKLMNPQRSTUVWXYZ".charAt(Math.floor(Math.random() * 32)))
        .join("");
      const orderNumber = `${currentYear}-${progressive}-${randomSuffix}`;

      // 2. Crea ordine
      const order = await tx.order.create({
        data: {
          orderNumber,
          type: "GIFT_CARD",
          status: "DELIVERED", // Cartacee sono già "consegnate"
          email,
          phone: phone || null,
          total: printedCard.value,
          orderSource: "MANUAL",
          customerName: `Pagamento: ${paymentMethod === "CASH" ? "Contanti" : "POS"}`,
          paidAt: new Date(),
          lang: "it",
        },
      });

      // 3. Usa lo stesso codice PG per la Gift Card
      // (non generiamo un codice GC nuovo, manteniamo tracciabilità)

      // 4. Crea Gift Card
      const giftCard = await tx.giftCard.create({
        data: {
          code: printedCard.code,
          initialValue: printedCard.value,
          remainingValue: printedCard.value,
          orderId: order.id,
          isActive: true,
          activatedAt: new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

      // 5. Marca PG come usato
      await tx.printedGiftCard.update({
        where: { id: printedCard.id },
        data: {
          used: true,
          usedAt: new Date(),
          usedBy: admin.email,
          orderId: order.id,
          giftCardId: giftCard.id,
        },
      });

      return {
        order,
        giftCard,
        printedCard: { ...printedCard, used: true },
      };
    });

    return NextResponse.json({
      success: true,
      message: "Gift Card attivata con successo",
      data: {
        orderNumber: result.order.orderNumber,
        giftCardCode: result.giftCard.code,
        value: result.giftCard.initialValue,
        printedCode: result.printedCard.code,
      },
    });
  } catch (error) {
    console.error("Error activating printed gift card:", error);
    return NextResponse.json(
      { error: "Failed to activate printed gift card" },
      { status: 500 }
    );
  }
}
