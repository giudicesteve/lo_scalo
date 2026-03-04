import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, rateLimitConfigs } from "@/lib/rate-limit-middleware";

// POST - Cancella ordine e ripristina disponibilità
export async function POST(req: Request) {
  // Rate limiting: max 10 richieste al minuto per IP
  const rateLimitResponse = withRateLimit(req, rateLimitConfigs.publicApi)
  if (rateLimitResponse) {
    console.warn(`[RATE LIMIT] Bloccata cancellazione ordine`)
    return rateLimitResponse
  }

  try {
    const { orderNumber } = await req.json();

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Numero ordine richiesto" },
        { status: 400 }
      );
    }

    console.log(`🚫 Cancellazione manuale ordine #${orderNumber}`);

    // Trova l'ordine (solo ID, non serve tutto)
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, status: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Ordine non trovato" },
        { status: 404 }
      );
    }

    // ATOMICO: Tenta di aggiornare solo se PENDING_PAYMENT
    // Se webhook ha già processato, count sarà 0
    const updateResult = await prisma.order.updateMany({
      where: {
        id: order.id,
        status: "PENDING_PAYMENT", // clausola di guardia atomica
      },
      data: {
        status: "CANCELLED",
        isArchived: true,
      },
    });

    if (updateResult.count === 0) {
      console.log(
        `Order #${orderNumber} already processed (not PENDING_PAYMENT)`
      );
      return NextResponse.json({
        success: true,
        message: "Ordine già processato",
      });
    }

    // Ottieni items per ripristinare stock
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      include: { Product: { include: { ProductVariant: true } } },
    });

    // Ripristina disponibilità prodotti
    console.log(`🔄 [CANCEL] Ripristino stock per ${orderItems.length} item`);
    let restoredCount = 0;
    
    for (const item of orderItems) {
      if (!item.productId) continue;

      const product = item.Product;
      if (!product) continue;

      if (item.size && item.size !== "Unica") {
        // Find the variant by size
        const variant = product.ProductVariant.find(
          (v) => v.size === item.size
        );
        if (variant) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { increment: item.quantity } },
          });
          console.log(`✅ [CANCEL] Ripristinato ${item.quantity} x ${product.name} (${item.size})`);
          restoredCount++;
        }
      } else {
        // For products without specific size, find "Unica" variant
        const variant = product.ProductVariant.find((v) => v.size === "Unica");
        if (variant) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { increment: item.quantity } },
          });
          console.log(`✅ [CANCEL] Ripristinato ${item.quantity} x ${product.name} (Unica)`);
          restoredCount++;
        }
      }
    }

    console.log(`✅ [CANCEL] Order #${orderNumber} cancelled, ${restoredCount} item stock restored`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      { error: "Errore durante la cancellazione" },
      { status: 500 }
    );
  }
}
