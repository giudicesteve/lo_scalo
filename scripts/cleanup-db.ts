import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import "dotenv/config";

// WebSocket configuration for Neon
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaNeon({ connectionString });

const prisma = new PrismaClient({ adapter });

async function cleanup() {
  try {
    console.log("Cancellazione in corso...");

    // 1. Cancella transazioni gift card
    const deletedTransactions = await prisma.giftCardTransaction.deleteMany({});
    console.log(`✓ Cancellate ${deletedTransactions.count} transazioni gift card`);

    // 2. Cancella gift cards (dipendono da Order)
    const deletedGiftCards = await prisma.giftCard.deleteMany({});
    console.log(`✓ Cancellate ${deletedGiftCards.count} gift card`);

    // 3. Cancella order items (dipendono da Order)
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`✓ Cancellati ${deletedOrderItems.count} order items`);

    // 4. Cancella ordini
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✓ Cancellati ${deletedOrders.count} ordini`);

    console.log("\n✅ Database pulito con successo!");
  } catch (error) {
    console.error("❌ Errore:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
