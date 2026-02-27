/**
 * Job: Pulizia ordini PENDING_PAYMENT scaduti
 *
 * Questo job trova tutti gli ordini in stato PENDING_PAYMENT
 * creati più di 30 minuti fa e:
 * 1. Ripristina la disponibilità prodotti
 * 2. Setta lo stato a CANCELLED
 * 3. Archivia l'ordine (isArchived = true)
 *
 * Esegui ogni 35 minuti (oltre i 30 minuti di scadenza Stripe)
 */

import { prisma } from "../src/lib/prisma";

// Funzione per ripristinare la disponibilità prodotti
async function restoreStock(orderId: string) {
  try {
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: orderId },
      include: {
        Product: {
          include: {
            ProductVariant: true,
          },
        },
      },
    });

    if (!orderItems || orderItems.length === 0) {
      console.log(`No items found for order ${orderId}`);
      return;
    }

    // Ripristina quantità per ogni item
    for (const item of orderItems) {
      if (!item.productId || !item.Product) continue;

      const product = item.Product;

      if (item.size && item.size !== "Unica") {
        // Trova la variante per taglia
        const variant = product.ProductVariant.find((v) => v.size === item.size);
        if (variant) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { increment: item.quantity } },
          });
          console.log(`  Restored ${item.quantity} items to variant ${variant.size}`);
        }
      } else {
        // Prodotto senza taglie specifiche - trova variant "Unica"
        const variant = product.ProductVariant.find((v) => v.size === "Unica");
        if (variant) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { quantity: { increment: item.quantity } },
          });
          console.log(`  Restored ${item.quantity} items to product ${product.name}`);
        }
      }
    }

    console.log(`✅ Stock restored for order ${orderId}`);
  } catch (error) {
    console.error(`❌ Error restoring stock for order ${orderId}:`, error);
  }
}

async function cleanupPendingOrders() {
  console.log("🧹 Inizio pulizia ordini PENDING_PAYMENT scaduti...");
  console.log(`⏰ ${new Date().toISOString()}`);

  // Calcola il limite: 30 minuti fa
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  try {
    // Trova ordini PENDING_PAYMENT creati più di 30 minuti fa
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: "PENDING_PAYMENT",
        createdAt: {
          lt: thirtyMinutesAgo,
        },
      },
      include: {
        items: true,
      },
    });

    console.log(`📋 Trovati ${expiredOrders.length} ordini scaduti da processare`);

    if (expiredOrders.length === 0) {
      console.log("✅ Nessun ordine da processare");
      return;
    }

    let processed = 0;
    let errors = 0;

    for (const order of expiredOrders) {
      console.log(`\n📦 Processing order #${order.orderNumber} (${order.id})`);
      console.log(`   Creato: ${order.createdAt.toISOString()}`);
      console.log(`   Items: ${order.items.length}`);

      try {
        // 1. Ripristina stock
        await restoreStock(order.id);

        // 2. Aggiorna ordine: CANCELLED + isArchived = true
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            isArchived: true,
          },
        });

        console.log(`✅ Order #${order.orderNumber} processed: CANCELLED + ARCHIVED`);
        processed++;
      } catch (error) {
        console.error(`❌ Error processing order #${order.orderNumber}:`, error);
        errors++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 RESOCONTO:");
    console.log(`   Ordini processati: ${processed}`);
    console.log(`   Errori: ${errors}`);
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Fatal error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Se eseguito direttamente (non importato)
if (require.main === module) {
  cleanupPendingOrders();
}

export { cleanupPendingOrders };
